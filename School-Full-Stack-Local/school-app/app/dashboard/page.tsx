'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { useAuthGuard } from '@/lib/useAuthGuard'
import { api, formatMoney, formatDate, normalizeList } from '@/lib/api'

interface MonthOption {
  value: string
  label: string
}

export default function DashboardPage() {
  useAuthGuard()

  const [todayDate, setTodayDate] = useState('')
  const [monthOptions, setMonthOptions] = useState<MonthOption[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')

  const [statStudents, setStatStudents] = useState('—')
  const [statStaff, setStatStaff] = useState('—')
  const [statFeeMonth, setStatFeeMonth] = useState('—')
  const [statExpMonth, setStatExpMonth] = useState('—')
  const [statBalance, setStatBalance] = useState('—')
  const [balanceColor, setBalanceColor] = useState('')

  const [todayFeesHtml, setTodayFeesHtml] = useState<React.ReactNode>('Loading…')
  const [defaultersHtml, setDefaultersHtml] = useState<React.ReactNode>('Loading…')
  const [monthlySummaryRows, setMonthlySummaryRows] = useState<React.ReactNode>(
    <tr><td colSpan={7} className="loading">Loading…</td></tr>
  )
  const [recentExpensesRows, setRecentExpensesRows] = useState<React.ReactNode>(
    <tr><td colSpan={4} className="loading">Loading…</td></tr>
  )

  // ── Init: today date + month picker (last 12 months) ─────────────────────
  useEffect(() => {
    setTodayDate(
      new Date().toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    )

    const now = new Date()
    const opts: MonthOption[] = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      opts.push({ value, label })
    }
    setMonthOptions(opts)
    setSelectedMonth(opts[0]?.value || '')
  }, [])

  // ── Stats cards ────────────────────────────────────────────────────────────
  async function loadStats(month: string) {
    try {
      const monthDate = month + '-01'
      const [y, m] = month.split('-')
      const monthEnd = new Date(Number(y), Number(m), 0).toISOString().slice(0, 10)

      const results = await Promise.allSettled([
        api('GET', '/api/students'),
        api('GET', '/api/staff'),
        api('GET', `/api/fees/summary/monthly?month=${monthDate}`),
        api('GET', `/api/expenses?from=${monthDate}&to=${monthEnd}`),
      ])

      const [studentsRes, staffRes, feeSumRes, expListRes] = results

      if (studentsRes.status === 'fulfilled') {
        setStatStudents(String(normalizeList(studentsRes.value).length))
      }
      if (staffRes.status === 'fulfilled') {
        setStatStaff(String(normalizeList(staffRes.value).length))
      }

      const feeSumVal = feeSumRes.status === 'fulfilled' ? feeSumRes.value : null
      const collected = +(feeSumVal?.total_paid ?? feeSumVal?.total_collected ?? feeSumVal?.total ?? 0)
      setStatFeeMonth(formatMoney(collected))

      const rawExp = expListRes.status === 'fulfilled' ? expListRes.value : {}
      const expData = normalizeList(rawExp)
      const expenses = expData.reduce((s: number, r: any) => s + (+r.amount || 0), 0)
      setStatExpMonth(formatMoney(expenses))

      const balance = collected - expenses
      setStatBalance(formatMoney(balance))
      // NOTE: hardcoded hex to match original exactly — see chat note re: dark mode vars
      setBalanceColor(balance >= 0 ? '#2d7a4f' : '#c0392b')
    } catch (e) {
      console.error('loadStats error:', e)
    }
  }

  // ── Today's Collections ───────────────────────────────────────────────────
  async function loadTodayFees() {
    const today = new Date().toISOString().slice(0, 10)
    try {
      const data = normalizeList(await api('GET', `/api/fees/daily?date=${today}`))

      if (!data.length) {
        setTodayFeesHtml(<p className="empty">No fee collections today.</p>)
        return
      }

      const total = data.reduce((s: number, r: any) => s + (+r.amount_paid || 0), 0)
      setTodayFeesHtml(
        <>
          <table>
            <thead>
              <tr><th>Student</th><th>Class</th><th>Amount Paid</th></tr>
            </thead>
            <tbody>
              {data.map((r: any, i: number) => (
                <tr key={i}>
                  <td>{r.first_name} {r.last_name}</td>
                  <td>{r.class}-{r.section}</td>
                  <td className="fee-paid">{formatMoney(r.amount_paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
            Total: <strong>{formatMoney(total)}</strong>
          </p>
        </>
      )
    } catch (e) {
      setTodayFeesHtml(<p className="empty">Could not load.</p>)
    }
  }

  // ── Fee Defaulters ─────────────────────────────────────────────────────────
  async function loadDefaulters(month: string) {
    const monthDate = month + '-01'
    try {
      const data = normalizeList(await api('GET', `/api/fees/defaulters?month=${monthDate}`))

      if (!data.length) {
        setDefaultersHtml(<p className="empty">No defaulters this month. 🎉</p>)
        return
      }

      setDefaultersHtml(
        <>
          <table>
            <thead>
              <tr><th>Student</th><th>Class</th><th>Due</th><th>Paid</th></tr>
            </thead>
            <tbody>
              {data.slice(0, 8).map((r: any, i: number) => (
                <tr key={i}>
                  <td>{r.first_name} {r.last_name}</td>
                  <td>{r.class}-{r.section}</td>
                  <td className="fee-unpaid">{formatMoney(r.amount_due)}</td>
                  <td>{formatMoney(r.amount_paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 8 && (
            <p style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
              +{data.length - 8} more — <a href="/fees">View all</a>
            </p>
          )}
        </>
      )
    } catch (e) {
      setDefaultersHtml(<p className="empty">Could not load.</p>)
    }
  }

  // ── Monthly Fee Summary table ─────────────────────────────────────────────
  async function loadMonthlySummary(month: string) {
    setMonthlySummaryRows(<tr><td colSpan={7} className="loading">Loading…</td></tr>)
    const monthDate = month + '-01'
    try {
      const data = normalizeList(await api('GET', `/api/fees?month=${monthDate}`))

      if (!data.length) {
        setMonthlySummaryRows(<tr><td colSpan={7} className="empty">No records for this month.</td></tr>)
        return
      }

      setMonthlySummaryRows(
        <>
          {data.map((r: any, i: number) => {
            const due = +r.amount_due || 0
            const paid = +r.amount_paid || 0
            let status: string, cls: string
            if (paid >= due && due > 0) { status = 'Paid'; cls = 'badge-success' }
            else if (paid > 0) { status = 'Partial'; cls = 'badge-warning' }
            else { status = 'Unpaid'; cls = 'badge-danger' }

            return (
              <tr key={i}>
                <td>{r.first_name} {r.last_name}</td>
                <td>{r.class}</td>
                <td>{r.section}</td>
                <td>{formatMoney(due)}</td>
                <td>{formatMoney(paid)}</td>
                <td><span className={`badge ${cls}`}>{status}</span></td>
                <td>{r.payment_date ? formatDate(r.payment_date) : '—'}</td>
              </tr>
            )
          })}
        </>
      )
    } catch (e) {
      setMonthlySummaryRows(<tr><td colSpan={7} className="empty">Could not load.</td></tr>)
    }
  }

  // ── Recent Expenses ────────────────────────────────────────────────────────
  async function loadRecentExpenses() {
    try {
      const data = normalizeList(await api('GET', '/api/expenses?limit=10'))

      if (!data.length) {
        setRecentExpensesRows(<tr><td colSpan={4} className="empty">No expenses yet.</td></tr>)
        return
      }

      setRecentExpensesRows(
        <>
          {data.map((r: any, i: number) => (
            <tr key={i}>
              <td>{formatDate(r.created_at)}</td>
              <td>{r.category_name || '—'}</td>
              <td>{r.description || '—'}</td>
              <td>{formatMoney(r.amount)}</td>
            </tr>
          ))}
        </>
      )
    } catch (e) {
      setRecentExpensesRows(<tr><td colSpan={4} className="empty">Could not load.</td></tr>)
    }
  }

  // ── Load month-dependent sections whenever selectedMonth changes ─────────
  useEffect(() => {
    if (!selectedMonth) return
    loadStats(selectedMonth)
    loadMonthlySummary(selectedMonth)
    loadDefaulters(selectedMonth)
  }, [selectedMonth])

  // ── Load month-independent sections once on mount ─────────────────────────
  useEffect(() => {
    loadTodayFees()
    loadRecentExpenses()
  }, [])

  return (
    <>
      <Nav />
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <span style={{ color: '#888', fontSize: '13px' }}>{todayDate}</span>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><div className="label">Total Students</div><div className="value">{statStudents}</div></div>
          <div className="stat-card"><div className="label">Total Staff</div><div className="value">{statStaff}</div></div>
          <div className="stat-card"><div className="label">Fee Collected (Month)</div><div className="value">{statFeeMonth}</div></div>
          <div className="stat-card"><div className="label">Expenses (Month)</div><div className="value">{statExpMonth}</div></div>
          <div className="stat-card"><div className="label">Balance (Month)</div><div className="value" style={{ color: balanceColor }}>{statBalance}</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div className="card">
            <div className="section-title">Today's Fee Collections</div>
            <div>{todayFeesHtml}</div>
          </div>
          <div className="card">
            <div className="section-title">Fee Defaulters — Selected Month</div>
            <div>{defaultersHtml}</div>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Monthly Fee Summary</div>
          <div className="filters" style={{ marginBottom: '12px' }}>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {monthOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th><th>Class</th><th>Section</th>
                  <th>Amount Due</th><th>Amount Paid</th><th>Status</th><th>Payment Date</th>
                </tr>
              </thead>
              <tbody>{monthlySummaryRows}</tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Recent Expenses (Last 10)</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr>
              </thead>
              <tbody>{recentExpensesRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}