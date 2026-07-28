'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getUser, logout } from '@/lib/api'

const pages = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/students', label: 'Students' },
  { href: '/staff', label: 'Staff' },
  { href: '/fees', label: 'Fees' },
  { href: '/expenses', label: 'Expenses' },
]

export default function Nav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const user = getUser()

  return (
    <nav className="navbar">
      <Link className="brand" href="/dashboard">🏫 School Mgmt</Link>

      <button className="nav-toggle" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
        ☰
      </button>

      <nav className={`nav-links ${open ? 'open' : ''}`}>
        {pages.map(p => (
          <Link
            key={p.href}
            href={p.href}
            className={pathname === p.href ? 'active' : ''}
            onClick={() => setOpen(false)}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: '#aaa', fontSize: '13px' }}>{user.username || ''}</span>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>
    </nav>
  )
}