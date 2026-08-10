// Every outbound call to the WhatsApp Cloud API goes through here — both
// send-reminders (template messages) and whatsapp-webhook (text + list
// messages for the booking conversation) share this one client, so there's
// exactly one place that knows the Graph API shape and the auth token.
const WHATSAPP_CLOUD_API_TOKEN = Deno.env.get('WHATSAPP_CLOUD_API_TOKEN')
const GRAPH_API_VERSION = 'v20.0'

async function callGraphApi(phoneNumberId: string, body: Record<string, unknown>): Promise<string | null> {
  if (!WHATSAPP_CLOUD_API_TOKEN) throw new Error('WHATSAPP_CLOUD_API_TOKEN is not set')

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WHATSAPP_CLOUD_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(`WhatsApp API error (${res.status}): ${JSON.stringify(payload)}`)
  }
  return payload?.messages?.[0]?.id ?? null
}

export function sendTemplateMessage(
  phoneNumberId: string,
  toE164: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[],
): Promise<string | null> {
  return callGraphApi(phoneNumberId, {
    messaging_product: 'whatsapp',
    to: toE164.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [{ type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text })) }],
    },
  })
}

export function sendTextMessage(phoneNumberId: string, toE164: string, body: string): Promise<string | null> {
  return callGraphApi(phoneNumberId, {
    messaging_product: 'whatsapp',
    to: toE164.replace(/^\+/, ''),
    type: 'text',
    text: { body },
  })
}

export interface ListRow {
  id: string
  title: string // Meta limit: 24 chars
  description?: string // Meta limit: 72 chars
}
export interface ListSection {
  title: string // Meta limit: 24 chars
  rows: ListRow[] // Meta limit: 10 rows per section
}

export function sendListMessage(
  phoneNumberId: string,
  toE164: string,
  opts: { header?: string; body: string; buttonLabel: string; sections: ListSection[] },
): Promise<string | null> {
  return callGraphApi(phoneNumberId, {
    messaging_product: 'whatsapp',
    to: toE164.replace(/^\+/, ''),
    type: 'interactive',
    interactive: {
      type: 'list',
      ...(opts.header ? { header: { type: 'text', text: opts.header } } : {}),
      body: { text: opts.body },
      action: { button: opts.buttonLabel, sections: opts.sections },
    },
  })
}
