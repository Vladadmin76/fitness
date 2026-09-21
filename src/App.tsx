import { Route, Routes } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { Dashboard } from './pages/Dashboard'
import { Settings } from './pages/Settings'
import { WorkoutPreview } from './pages/WorkoutPreview'
import { WorkoutSession } from './pages/WorkoutSession'
import { History } from './pages/History'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NavBar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/workout/new" element={<WorkoutPreview />} />
        <Route path="/workout/session" element={<WorkoutSession />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </div>
  )
}
