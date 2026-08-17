import ar from '../../i18n/ar'
import Skeleton from '../layout/Skeleton'
import { useDashboardStats } from '../../hooks/useDashboardStats'
import StatCard from './StatCard'
import NoShowRateCard from './NoShowRateCard'

export default function DashboardPage() {
  const { stats, loading, error } = useDashboardStats()

  return (
    <div className="pb-2">
      <h1 className="pt-1 text-headline font-normal text-on-surface">{ar.nav_dashboard}</h1>

      {loading && (
        <div className="mt-5 space-y-4">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!loading && error && (
        <p role="alert" className="mt-5 rounded-md bg-error-container px-4 py-3 text-body-sm text-on-error-container">
          {ar.common_error}
        </p>
      )}

      {!loading && !error && stats && (
        <div className="mt-5 space-y-4">
          <NoShowRateCard thisWeek={stats.noShowRateThisWeek} lastWeek={stats.noShowRateLastWeek} />

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatCard label={ar.dashboard_totalAppointments} value={stats.totalAppointments} />
            <StatCard label={ar.dashboard_confirmed} value={stats.confirmed} />
            <StatCard label={ar.dashboard_noShows} value={stats.noShows} />
            <StatCard label={ar.dashboard_remindersSent} value={stats.remindersSent} />
          </div>
        </div>
      )}
    </div>
  )
}
