import ar from '../../i18n/ar'
import ClinicInfoSettings from './ClinicInfoSettings'
import PatientsImport from './PatientsImport'
import DoctorsSettings from './DoctorsSettings'
import WhatsAppSettings from './WhatsAppSettings'
import MessagesLog from './MessagesLog'

export default function SettingsPage() {
  return (
    <div className="space-y-4 pb-2">
      <h1 className="pt-1 text-headline font-normal text-on-surface">{ar.settings_title}</h1>
      <ClinicInfoSettings />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <DoctorsSettings />
        <WhatsAppSettings />
      </div>
      <PatientsImport />
      <MessagesLog />
    </div>
  )
}
