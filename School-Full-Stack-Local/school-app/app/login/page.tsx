'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('token')) {
      router.replace('/dashboard')
    }
  }, [router])

  async function doLogin() {
    const trimmedUsername = username.trim()
    setError('')

    if (!trimmedUsername || !password) {
      setError('Please enter username and password.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || data.message || 'Login failed')

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') doLogin()
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">🏫 School Management</div>
        <p className="login-sub">Administrator Login</p>

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            placeholder="Enter username"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Enter password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button className="login-btn" onClick={doLogin} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  )
}