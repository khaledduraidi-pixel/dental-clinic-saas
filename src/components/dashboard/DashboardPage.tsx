import ar from '../../i18n/ar'
import Skeleton from '../layout/Skeleton'
import { useDashboardStats } from '../../hooks/useDashboardStats'
import StatCard from './StatCard'
import NoShowRateCard from './NoShowRateCard'

export default function DashboardPage() {
  const { stats, loading, error } = useDashboardStats()

  return (
    <div>
      <h1 className="text-xl font-bold text-text">{ar.dashboard_title}</h1>

      {loading && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!loading && error && <p className="mt-4 text-sm text-error">{ar.common_error}</p>}

      {!loading && !error && stats && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label={ar.dashboard_totalAppointments} value={stats.totalAppointments} />
            <StatCard label={ar.dashboard_confirmed} value={stats.confirmed} />
            <StatCard label={ar.dashboard_noShows} value={stats.noShows} />
            <StatCard label={ar.dashboard_remindersSent} value={stats.remindersSent} />
          </div>

          <NoShowRateCard thisWeek={stats.noShowRateThisWeek} lastWeek={stats.noShowRateLastWeek} />
        </>
      )}
    </div>
  )
}
