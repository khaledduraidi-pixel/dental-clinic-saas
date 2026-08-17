#!/usr/bin/env node
/**
 * extract_design_tokens — rebuilt from the web-design SKILL spec
 * (the skill's scripts/ folder was not shipped with it).
 *
 * Phase A tooling: render a real page in a real browser and read the
 * design language back off the *computed* styles, weighted by how much
 * screen area each value actually occupies — so the report reflects what
 * a visitor sees, not what appears most often in the stylesheet.
 *
 * Usage: node extract_design_tokens.mjs --url <url> [--out dir] [--scroll-delay ms]
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const arg = (k, d) => { const i = args.indexOf(k); return i > -1 ? args[i + 1] : d }
const URL_ = arg('--url'); const OUT = arg('--out', './crawl-output')
const DELAY = Number(arg('--scroll-delay', 600))
if (!URL_) { console.error('need --url'); process.exit(1) }
mkdirSync(OUT, { recursive: true })

// Route through the session's agent proxy when one is configured; the
// browser NSS store already trusts its CA.
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  ...(PROXY && !/^http:\/\/127\.0\.0\.1/.test(URL_) && !/localhost/.test(URL_)
      ? { proxy: { server: PROXY } } : {}),
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
await page.goto(URL_, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => page.goto(URL_, { timeout: 60000 }))
await page.evaluate(() => document.fonts?.ready).catch(() => {})
await page.waitForTimeout(DELAY)

// ---- per-viewport screenshots (the skill's "每屏视口截图") -------------
const shots = []
const pageH = await page.evaluate(() => document.body.scrollHeight)
const vh = 900
for (let y = 0, i = 0; y < Math.min(pageH, vh * 8); y += vh, i++) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y)
  await page.waitForTimeout(DELAY)
  const f = `viewport-${String(i).padStart(2, '0')}.png`
  await page.screenshot({ path: join(OUT, f) }); shots.push(f)
}
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200)

// ---- area-weighted computed-style census -------------------------------
const data = await page.evaluate(() => {
  const bump = (m, k, w) => { if (!k) return; m[k] = (m[k] || 0) + w }
  const colors = {}, bgs = {}, fams = {}, sizes = {}, weights = {}, tracking = {},
        radii = {}, shadows = {}, gaps = {}, borders = {}
  let nodes = 0
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    const area = Math.min(r.width * r.height, 1440 * 900) // cap hero-sized nodes
    const s = getComputedStyle(el); nodes++
    const txt = (el.textContent || '').trim().length && el.children.length === 0
    if (txt) {
      bump(colors, s.color, area)
      bump(fams, s.fontFamily.split(',')[0].replace(/["']/g, '').trim(), area)
      bump(sizes, Math.round(parseFloat(s.fontSize)) + 'px', area)
      bump(weights, s.fontWeight, area)
      if (s.letterSpacing !== 'normal') bump(tracking, s.letterSpacing, area)
    }
    if (s.backgroundColor && !/rgba?\(0, 0, 0, 0\)/.test(s.backgroundColor)) bump(bgs, s.backgroundColor, area)
    if (s.borderRadius !== '0px') bump(radii, s.borderRadius, area)
    if (s.boxShadow !== 'none') bump(shadows, s.boxShadow, 1)
    if (s.borderTopWidth !== '0px' && s.borderTopStyle !== 'none') bump(borders, `${s.borderTopWidth} ${s.borderTopColor}`, 1)
    if (/flex|grid/.test(s.display) && s.gap !== 'normal' && s.gap !== '0px') bump(gaps, s.gap, 1)
  }
  const top = (m, n = 10) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([v, w]) => ({ value: v, weight: Math.round(w) }))

  return {
    nodes,
    text_colors: top(colors), backgrounds: top(bgs), font_families: top(fams, 6),
    font_sizes: top(sizes, 12), font_weights: top(weights, 6), letter_spacing: top(tracking, 6),
    border_radius: top(radii, 8), shadows: top(shadows, 6), borders: top(borders, 6), gaps: top(gaps, 8),
    // structure
    sections: document.querySelectorAll('section, main > div, [class*="section"]').length,
    headings: [...document.querySelectorAll('h1,h2,h3')].slice(0, 25)
      .map(h => ({ tag: h.tagName, size: getComputedStyle(h).fontSize, weight: getComputedStyle(h).fontWeight,
                   text: (h.textContent || '').trim().slice(0, 70) })),
    // motion audit signals (the skill's Motion Audit)
    motion: {
      gsap: !!window.gsap, scrollTrigger: !!(window.ScrollTrigger || window.gsap?.ScrollTrigger),
      lenis: !!(window.Lenis || window.lenis), three: !!window.THREE, canvas: document.querySelectorAll('canvas').length,
      framer: !!document.querySelector('[style*="transform"][data-projection-id], [data-framer-name]'),
      css_transitions: [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).transitionDuration !== '0s').length,
      css_animations: [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).animationName !== 'none').length,
      reduced_motion_rule: [...document.styleSheets].some(ss => { try { return [...ss.cssRules].some(r => /prefers-reduced-motion/.test(r.cssText)) } catch { return false } }),
      scroll_behavior: getComputedStyle(document.documentElement).scrollBehavior,
    },
    fonts_loaded: [...(document.fonts || [])].map(f => `${f.family} ${f.weight} ${f.status}`),
    lang: document.documentElement.lang, dir: document.documentElement.dir || 'ltr',
    title: document.title,
  }
})

// ---- collected CSS ----------------------------------------------------
const css = await page.evaluate(() => [...document.styleSheets].map(ss => {
  try { return [...ss.cssRules].map(r => r.cssText).join('\n') } catch { return `/* cross-origin: ${ss.href} */` }
}).join('\n'))

writeFileSync(join(OUT, 'tokens.json'), JSON.stringify({ url: URL_, ...data, screenshots: shots }, null, 2))
writeFileSync(join(OUT, 'styles.css'), css)
await browser.close()

// ---- human summary ----------------------------------------------------
const L = (label, rows) => `\n${label}\n` + rows.map(r => `   ${String(r.value).padEnd(46)} ${r.weight}`).join('\n')
console.log(`\n${data.title}   [lang=${data.lang} dir=${data.dir}]  ${data.nodes} nodes, ${shots.length} viewports`)
console.log(L('FONT FAMILIES (area-weighted)', data.font_families))
console.log(L('TEXT COLORS', data.text_colors.slice(0, 6)))
console.log(L('BACKGROUNDS', data.backgrounds.slice(0, 6)))
console.log(L('FONT SIZES', data.font_sizes.slice(0, 8)))
console.log(L('BORDER RADIUS', data.border_radius.slice(0, 5)))
console.log(L('SHADOWS', data.shadows.slice(0, 3)))
console.log('\nMOTION AUDIT\n  ' + JSON.stringify(data.motion))
console.log(`\n→ ${OUT}/tokens.json, styles.css, ${shots.length} screenshots\n`)
