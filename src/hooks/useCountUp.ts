import { useEffect, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

// The one motion primitive this dashboard uses: numbers tick up from 0 on
// load instead of appearing static. Respects reduced-motion (skips straight
// to the final value) and re-fires only when the target actually changes.
export function useCountUp(target: number) {
  const [display, setDisplay] = useState(target)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) {
      setDisplay(target)
      return
    }
    const controls = animate(0, target, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [target, reduced])

  return display
}
