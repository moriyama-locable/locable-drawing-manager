import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import logoUrl from '../../assets/locable-logo-white.svg'

const navItems = [
  { to: '/', label: 'ダッシュボード' },
  { to: '/drawings', label: '図面管理' },
  { to: '/changes', label: '変更項目' },
  { to: '/settings', label: '設定' },
]

function Layout() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="app-shell">
      <header className="app-header">
        <img src={logoUrl} alt="LOCABLE" className="app-logo" />
        <span className="app-title">図面管理システム</span>
        <button
          type="button"
          className="app-nav-toggle"
          aria-label="メニューを開く"
          aria-expanded={navOpen}
          onClick={() => setNavOpen((prev) => !prev)}
        >
          ☰
        </button>
        <nav className={navOpen ? 'app-nav open' : 'app-nav'}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setNavOpen(false)}
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
