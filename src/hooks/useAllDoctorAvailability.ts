import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { DoctorAvailability } from '../types'

// One query for every visible doctor's weekly schedule, grouped by
// doctor_id — used by the calendar (off-hours shading) and the appointment
// modal (soft warning), neither of which needs a per-doctor round trip.
export function useAllDoctorAvailability(doctorIds: string[]) {
  const [availabilityByDoctor, setAvailabilityByDoctor] = useState<Record<string, DoctorAvailability[]>>({})
  const [loading, setLoading] = useState(true)
  const idsKey = doctorIds.join(',')

  useEffect(() => {
    let cancelled = false
    if (doctorIds.length === 0) {
      setAvailabilityByDoctor({})
      setLoading(false)
      return
    }
    setLoading(true)

    supabase
      .from('doctor_availability')
      .select('*')
      .in('doctor_id', doctorIds)
      .then(({ data }) => {
        if (cancelled) return
        const grouped: Record<string, DoctorAvailability[]> = {}
        for (const row of (data as DoctorAvailability[] | null) ?? []) {
          ;(grouped[row.doctor_id] ??= []).push(row)
        }
        setAvailabilityByDoctor(grouped)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  return { availabilityByDoctor, loading }
}
