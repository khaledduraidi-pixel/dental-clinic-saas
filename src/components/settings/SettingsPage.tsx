import ar from '../../i18n/ar'
import DoctorsSettings from './DoctorsSettings'
import MessagesLog from './MessagesLog'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text">{ar.settings_title}</h1>
      <DoctorsSettings />
      <MessagesLog />
    </div>
  )
}
