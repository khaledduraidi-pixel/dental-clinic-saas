import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ar from '../i18n/ar'
import type { DoctorAvailability } from '../types'

export interface AvailabilityDayInput {
  day_of_week: number
  start_time: string
  end_time: string
}

// A doctor with no rows here falls back to the clinic's own working hours
// every day — see the migration's comment. Saving always replaces the
// doctor's entire weekly schedule at once (delete + insert) rather than
// diffing day by day; at most 7 rows, so the simplicity is worth it.
export function useDoctorAvailability(doctorId: string | null) {
  const [availability, setAvailability] = useState<DoctorAvailability[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!doctorId) {
      setAvailability([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('day_of_week')
    setAvailability((data as DoctorAvailability[] | null) ?? [])
    setLoading(false)
  }, [doctorId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function saveAvailability(rows: AvailabilityDayInput[]) {
    if (!doctorId) return { error: ar.common_error }
    const { error: deleteError } = await supabase.from('doctor_availability').delete().eq('doctor_id', doctorId)
    if (deleteError) return { error: deleteError.message }
    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from('doctor_availability')
        .insert(rows.map((r) => ({ doctor_id: doctorId, ...r })))
      if (insertError) return { error: insertError.message }
    }
    await refresh()
    return { error: null }
  }

  return { availability, loading, saveAvailability, refresh }
}
