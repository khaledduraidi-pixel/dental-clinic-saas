export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'reschedule_requested'
  | 'no_show'
  | 'completed'
  | 'cancelled'

export type VisitType =
  | 'checkup'
  | 'followup'
  | 'cleaning'
  | 'filling'
  | 'root_canal'
  | 'extraction'
  | 'orthodontics'
  | 'prosthetics'
  | 'other'

export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'cancelled'

export type WhatsAppMode = 'mock' | 'live'

export interface Clinic {
  id: string
  name: string
  phone: string | null
  timezone: string
  working_hours_start: string
  working_hours_end: string
  reminder_hours_before: 12 | 24 | 48
  whatsapp_mode: WhatsAppMode
  whatsapp_phone_number_id: string | null
  created_at: string
  updated_at: string
}

export interface ClinicUser {
  clinic_id: string
  user_id: string
  role: 'owner' | 'staff'
  created_at: string
}

export interface Doctor {
  id: string
  clinic_id: string
  name: string
  color: string
  active: boolean
  created_at: string
  updated_at: string
}

// 0=Sunday .. 6=Saturday — matches date-fns' weekStartsOn:0 used throughout
// the calendar. A doctor with no rows at all falls back to the clinic's own
// working_hours_start/end every day; once they have at least one row, only
// the days present are working days.
export interface DoctorAvailability {
  id: string
  doctor_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

export interface Patient {
  id: string
  clinic_id: string
  name: string
  phone: string
  notes: string | null
  // Free-text "what this patient still needs" — see migration 0006.
  treatment_plan: string | null
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  clinic_id: string
  patient_id: string
  doctor_id: string
  starts_at: string
  duration_minutes: 15 | 30 | 45 | 60
  visit_type: VisitType
  status: AppointmentStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: string
  clinic_id: string
  appointment_id: string
  status: ReminderStatus
  scheduled_for: string
  sent_at: string | null
  provider_message_id: string | null
  created_at: string
}

export interface MessageLog {
  id: string
  clinic_id: string
  reminder_id: string | null
  appointment_id: string | null
  patient_phone: string
  body: string
  direction: 'outbound' | 'inbound'
  status: 'sent' | 'failed' | 'received'
  provider_message_id: string | null
  created_at: string
}
