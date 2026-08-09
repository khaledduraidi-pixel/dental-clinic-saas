import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { MessageLog } from '../types'

export function useMessagesLog() {
  const [messages, setMessages] = useState<MessageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('messages_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (fetchError) {
      setError(fetchError.message)
      setMessages([])
    } else {
      setMessages((data as MessageLog[] | null) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { messages, loading, error, refresh }
}
