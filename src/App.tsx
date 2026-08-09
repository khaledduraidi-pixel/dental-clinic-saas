import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AppShell from './components/layout/AppShell'
import Skeleton from './components/layout/Skeleton'
import LoginPage from './components/auth/LoginPage'
import SignupPage from './components/auth/SignupPage'
import CalendarPage from './components/calendar/CalendarPage'
import PatientsPage from './components/patients/PatientsPage'
import DashboardPage from './components/dashboard/DashboardPage'
import SettingsPage from './components/settings/SettingsPage'
import type { ReactNode } from 'react'

function FullPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <Skeleton className="h-10 w-40" />
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoading />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <FullPageLoading />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    // reducedMotion="user" downgrades transform-driven springs to instant
    // changes for prefers-reduced-motion, while still cross-fading opacity.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <RedirectIfAuthed>
                  <LoginPage />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/signup"
              element={
                <RedirectIfAuthed>
                  <SignupPage />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <AppShell>
                    <CalendarPage />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/patients"
              element={
                <RequireAuth>
                  <AppShell>
                    <PatientsPage />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <AppShell>
                    <DashboardPage />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <AppShell>
                    <SettingsPage />
                  </AppShell>
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  )
}
