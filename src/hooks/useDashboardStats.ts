import { useEffect, useState } from 'react'
import { addDays, startOfWeek } from 'date-fns'
import { supabase } from '../lib/supabase'

export interface DashboardStats {
  totalAppointments: number
  confirmed: number
  noShows: number
  remindersSent: number
  noShowRateThisWeek: number
  noShowRateLastWeek: number
}

interface AppointmentStub {
  starts_at: string
  status: string
}

function noShowRate(appointments: AppointmentStub[]): number {
  const counted = appointments.filter((a) => a.status !== 'cancelled')
  if (counted.length === 0) return 0
  const noShows = counted.filter((a) => a.status === 'no_show').length
  return (noShows / counted.length) * 100
}

// "This week" and "last week" both run Sunday-Saturday, matching the
// calendar's week view — a simple, browser-local notion of "week" that's
// consistent with the rest of the app's navigation.
export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 })
    const thisWeekEnd = addDays(thisWeekStart, 7)
    const lastWeekStart = addDays(thisWeekStart, -7)

    async function load() {
      const [appointmentsRes, remindersRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('starts_at, status')
          .gte('starts_at', lastWeekStart.toISOString())
          .lt('starts_at', thisWeekEnd.toISOString()),
        supabase
          .from('reminders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'sent')
          .gte('sent_at', thisWeekStart.toISOString())
          .lt('sent_at', thisWeekEnd.toISOString()),
      ])

      if (cancelled) return

      if (appointmentsRes.error || remindersRes.error) {
        setError((appointmentsRes.error ?? remindersRes.error)!.message)
        setStats(null)
        setLoading(false)
        return
      }

      const all = (appointmentsRes.data as AppointmentStub[] | null) ?? []
      const thisWeek = all.filter((a) => a.starts_at >= thisWeekStart.toISOString())
      const lastWeek = all.filter((a) => a.starts_at < thisWeekStart.toISOString())
      const thisWeekCounted = thisWeek.filter((a) => a.status !== 'cancelled')

      setStats({
        totalAppointments: thisWeek.length,
        confirmed: thisWeekCounted.filter((a) => a.status === 'confirmed').length,
        noShows: thisWeekCounted.filter((a) => a.status === 'no_show').length,
        remindersSent: remindersRes.count ?? 0,
        noShowRateThisWeek: noShowRate(thisWeek),
        noShowRateLastWeek: noShowRate(lastWeek),
      })
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { stats, loading, error }
}
