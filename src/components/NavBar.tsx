import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
  }`

export function NavBar() {
  return (
    <nav className="flex gap-2 border-b border-slate-800 bg-slate-900 px-4 py-3">
      <NavLink to="/" end className={linkClass}>
        Главная
      </NavLink>
      <NavLink to="/history" className={linkClass}>
        История
      </NavLink>
      <NavLink to="/settings" className={linkClass}>
        Настройки
      </NavLink>
    </nav>
  )
}
