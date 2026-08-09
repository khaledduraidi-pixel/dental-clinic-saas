import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import AppShell from './components/layout/AppShell'
import LoginPage from './components/auth/LoginPage'
import SignupPage from './components/auth/SignupPage'
import CalendarPage from './components/calendar/CalendarPage'
import PatientsPage from './components/patients/PatientsPage'
import DashboardPage from './components/dashboard/DashboardPage'
import SettingsPage from './components/settings/SettingsPage'

export default function App() {
  return (
    // reducedMotion="user" downgrades transform-driven springs to instant
    // changes for prefers-reduced-motion, while still cross-fading opacity.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/"
            element={
              <AppShell>
                <CalendarPage />
              </AppShell>
            }
          />
          <Route
            path="/patients"
            element={
              <AppShell>
                <PatientsPage />
              </AppShell>
            }
          />
          <Route
            path="/dashboard"
            element={
              <AppShell>
                <DashboardPage />
              </AppShell>
            }
          />
          <Route
            path="/settings"
            element={
              <AppShell>
                <SettingsPage />
              </AppShell>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  )
}
