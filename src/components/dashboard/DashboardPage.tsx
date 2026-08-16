import ar from '../../i18n/ar'
import Skeleton from '../layout/Skeleton'
import { useDashboardStats } from '../../hooks/useDashboardStats'
import StatCard from './StatCard'
import NoShowRateCard from './NoShowRateCard'

export default function DashboardPage() {
  const { stats, loading, error } = useDashboardStats()

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-text">{ar.dashboard_title}</h1>

      {loading && (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {!loading && error && (
        <p role="alert" className="mt-4 rounded-xl bg-error-soft px-3 py-2.5 text-sm text-error">
          {ar.common_error}
        </p>
      )}

      {!loading && !error && stats && (
        <>
          {/* The flagship metric leads the page — everything else is
              supporting context, so it renders below, not first. */}
          <NoShowRateCard thisWeek={stats.noShowRateThisWeek} lastWeek={stats.noShowRateLastWeek} />

          <div className="mt-6 flex flex-wrap divide-x divide-border rounded-2xl border border-border bg-surface px-5 rtl:divide-x-reverse">
            <StatCard label={ar.dashboard_totalAppointments} value={stats.totalAppointments} />
            <StatCard label={ar.dashboard_confirmed} value={stats.confirmed} />
            <StatCard label={ar.dashboard_noShows} value={stats.noShows} />
            <StatCard label={ar.dashboard_remindersSent} value={stats.remindersSent} />
          </div>
        </>
      )}
    </div>
  )
}
