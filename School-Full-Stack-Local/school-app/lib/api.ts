'use client'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function getUser(): any {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    return {}
  }
}

export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

export async function api(method: string, path: string, body: any = null) {
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(path, opts)

  if (res.status === 401) {
    logout()
    return
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed')
  return data
}

export function normalizeList(res: any, hints: string[] = []): any[] {
  if (!res) return []
  if (Array.isArray(res)) return res
  for (const key of hints) {
    if (Array.isArray(res[key])) return res[key]
  }
  for (const key of Object.keys(res)) {
    if (Array.isArray(res[key])) return res[key]
  }
  return []
}

export function formatDate(d: string | Date | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB')
}

export function formatMoney(n: number | string | null): string {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 })
}