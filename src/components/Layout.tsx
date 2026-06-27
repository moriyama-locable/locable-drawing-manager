import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'ダッシュボード' },
  { to: '/drawings', label: '図面管理' },
  { to: '/changes', label: '変更項目' },
  { to: '/settings', label: '設定' },
]

function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">図面管理システム</span>
        <nav className="app-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
