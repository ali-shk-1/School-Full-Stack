'use client'

import { useEffect, useRef, useState } from 'react'
import Nav from '@/components/Nav'
import { useAuthGuard } from '@/lib/useAuthGuard'
import { api, formatMoney, formatDate, normalizeList } from '@/lib/api'
import { useToast } from '@/lib/toast'

const CLASS_OPTIONS = ['Nursery', 'KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

interface Student {
  student_id: number
  roll_no: number
  first_name: string
  last_name: string
  class: string
  section: string
}

interface MonthlyRecord {
  student_id: number
  roll_no: number
  first_name: string
  last_name: string
  class: string
  section: string
  amount_due: number | string
  amount_paid: number | string
  payment_date?: string
}

type Tab = 'monthly' | 'daily' | 'defaulters' | 'history'

export default function FeesPage() {
  useAuthGuard()
  const showToast = useToast()

  const todayStr = new Date().toISOString().slice(0, 10)
  const monthStr = new Date().toISOString().slice(0, 7)

  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyRecord[]>([])
  const [monthlyLoaded, setMonthlyLoaded] = useState(false)
  const [monthlyError, setMonthlyError] = useState(false)

  const [activeTab, setActiveTab] = useState<Tab>('monthly')

  // Stats
  const [statCollected, setStatCollected] = useState('—')
  const [statDue, setStatDue] = useState('—')
  const [statDefaulters, setStatDefaulters] = useState('—')
  const [statToday, setStatToday] = useState('—')

  // Monthly tab filters
  const [monthFilter, setMonthFilter] = useState(monthStr)
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [feeSearch, setFeeSearch] = useState('')

  // Daily tab
  const [dailyDateFilter, setDailyDateFilter] = useState(todayStr)
  const [dailyData, setDailyData] = useState<any[]>([])
  const [dailyLoaded, setDailyLoaded] = useState(false)
  const [dailyError, setDailyError] = useState(false)

  // Defaulters tab
  const [defaulterMonthFilter, setDefaulterMonthFilter] = useState(monthStr)
  const [defaultersData, setDefaultersData] = useState<any[]>([])
  const [defaultersLoaded, setDefaultersLoaded] = useState(false)
  const [defaultersError, setDefaultersError] = useState(false)

  // History tab
  const [historyStudentId, setHistoryStudentId] = useState('')
  const [historyData, setHistoryData] = useState<any[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [historyError, setHistoryError] = useState(false)

  // Payment modal
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payModalTitle, setPayModalTitle] = useState('Record Fee Payment')
  const [payStudentId, setPayStudentId] = useState('')
  const [payStudentSearch, setPayStudentSearch] = useState('')
  const [payResultsOpen, setPayResultsOpen] = useState(false)
  const [payMonth, setPayMonth] = useState(monthStr)
  const [payDue, setPayDue] = useState('')
  const [payPaid, setPayPaid] = useState('')
  const [existingPayInfo, setExistingPayInfo] = useState<string | null>(null)
  const payBoxRef = useRef<HTMLDivElement>(null)

  // ── Load students (once) ───────────────────────────────────────────────
  async function loadStudents() {
    try {
      const res = await api('GET', '/api/students')
      const list = normalizeList(res, ['students', 'data'])
      list.sort((a: Student, b: Student) => a.class.localeCompare(b.class) || a.roll_no - b.roll_no)
      setAllStudents(list)
    } catch (e) {
      console.error(e)
    }
  }

  // ── Stats ───────────────────────────────────────────────────────────────
  async function loadStats() {
    try {
      const [feeSum, todayFees, defaultersRes] = await Promise.all([
        api('GET', `/api/fees/summary/monthly?month=${monthFilter}-01`),
        api('GET', `/api/fees/daily?date=${todayStr}`),
        // Defaulters KPI intentionally uses the current real month, not the
        // Monthly Records filter — total outstanding, not a historical snapshot.
        api('GET', `/api/fees/defaulters?month=${monthStr}-01`),
      ])

      setStatCollected(formatMoney(feeSum.total_paid || 0))
      setStatDue(formatMoney(feeSum.total_due || 0))

      const defaulterCount = defaultersRes?.count ?? normalizeList(defaultersRes, ['defaulters']).length
      setStatDefaulters(String(defaulterCount))

      const todayTotal = normalizeList(todayFees, ['payments', 'data'])
        .reduce((s: number, r: any) => s + (+r.amount_paid || 0), 0)
      setStatToday(formatMoney(todayTotal))
    } catch (e) {
      console.error('loadStats error:', e)
    }
  }

  // ── Monthly Records ────────────────────────────────────────────────────
  async function loadMonthlyRecords() {
    setMonthlyLoaded(false)
    setMonthlyError(false)
    try {
      let url = `/api/fees?month=${monthFilter}-01`
      if (classFilter) url += `&class=${classFilter}`
      const raw = await api('GET', url)
      setMonthlyData(normalizeList(raw, ['fees', 'payments', 'data']))
    } catch (e) {
      setMonthlyError(true)
    } finally {
      setMonthlyLoaded(true)
    }
  }

  const filteredMonthly = monthlyData.filter(r => {
    const q = feeSearch.toLowerCase().trim()
    if (q) {
      const name = `${r.first_name} ${r.last_name}`.toLowerCase()
      if (!name.includes(q) && !String(r.roll_no || '').toLowerCase().includes(q)) return false
    }
    if (statusFilter) {
      const due = +r.amount_due, paid = +r.amount_paid
      if (statusFilter === 'paid' && !(paid >= due)) return false
      if (statusFilter === 'partial' && !(paid > 0 && paid < due)) return false
      if (statusFilter === 'unpaid' && !(paid === 0)) return false
    }
    return true
  })

  // ── Daily Records ──────────────────────────────────────────────────────
  async function loadDailyRecords() {
    setDailyLoaded(false)
    setDailyError(false)
    try {
      const raw = await api('GET', `/api/fees/daily?date=${dailyDateFilter}`)
      setDailyData(normalizeList(raw, ['payments', 'data']))
    } catch (e) {
      setDailyError(true)
    } finally {
      setDailyLoaded(true)
    }
  }

  const dailyTotal = dailyData.reduce((s, r) => s + (+r.amount_paid || 0), 0)

  // ── Defaulters ──────────────────────────────────────────────────────────
  async function loadDefaulters() {
    setDefaultersLoaded(false)
    setDefaultersError(false)
    try {
      const raw = await api('GET', `/api/fees/defaulters?month=${defaulterMonthFilter}-01`)
      setDefaultersData(normalizeList(raw, ['defaulters', 'data']))
    } catch (e) {
      setDefaultersError(true)
    } finally {
      setDefaultersLoaded(true)
    }
  }

  // ── Student History ────────────────────────────────────────────────────
  async function loadStudentHistory(id: string) {
    if (!id) {
      setHistoryData([])
      setHistoryLoaded(false)
      return
    }
    setHistoryLoaded(false)
    setHistoryError(false)
    try {
      const res = await api('GET', `/api/fees/student/${id}`)
      const data = normalizeList(res, ['payments', 'fees', 'data'])
      setHistoryData(data)
    } catch (e) {
      setHistoryError(true)
    } finally {
      setHistoryLoaded(true)
    }
  }

  const historyTotals = historyData.reduce(
    (acc, r) => {
      acc.due += +r.amount_due || 0
      acc.paid += +r.amount_paid || 0
      return acc
    },
    { due: 0, paid: 0 }
  )

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadStudents()
    loadMonthlyRecords()
  }, [])

  useEffect(() => {
    if (monthlyLoaded) {
      loadStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyLoaded, monthFilter])

  useEffect(() => {
    loadMonthlyRecords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter, classFilter])

  useEffect(() => {
    if (activeTab === 'daily') loadDailyRecords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dailyDateFilter])

  useEffect(() => {
    if (activeTab === 'defaulters') loadDefaulters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, defaulterMonthFilter])

  useEffect(() => {
    loadStudentHistory(historyStudentId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyStudentId])

  // Close student-search dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (payBoxRef.current && !payBoxRef.current.contains(e.target as Node)) {
        setPayResultsOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // ── Payment modal logic ────────────────────────────────────────────────
  function openPayModal() {
    setPayStudentId('')
    setPayStudentSearch('')
    setPayResultsOpen(false)
    setPayMonth(monthStr)
    setPayDue('')
    setPayPaid('')
    setExistingPayInfo(null)
    setPayModalTitle('Record Fee Payment')
    setPayModalOpen(true)
  }

  function closePayModal() {
    setPayModalOpen(false)
  }

  function quickPay(studentId: number, name: string, due: number, paid: number) {
    setPayStudentId('')
    setPayStudentSearch('')
    setPayResultsOpen(false)
    setPayMonth(monthStr)
    setExistingPayInfo(null)
    setPayModalTitle(`Record Payment — ${name}`)
    setPayModalOpen(true)
    setPayStudentId(String(studentId))
    setPayStudentSearch(name)
    setPayDue(String(due))
    setPayPaid(String(due - paid))
    checkExisting(String(studentId), monthStr)
  }

  const searchMatches = (() => {
    const q = payStudentSearch.toLowerCase().trim()
    let matches = allStudents
    if (q && !payStudentId) {
      matches = allStudents.filter(s =>
        String(s.roll_no || '').toLowerCase().includes(q) ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q)
      )
    }
    return matches.slice(0, 30)
  })()

  function onStudentSearchInput(value: string) {
    setPayStudentSearch(value)
    setPayStudentId('')
    setPayResultsOpen(true)
  }

  function selectPayStudent(studentId: number) {
    const s = allStudents.find(st => st.student_id === studentId)
    if (!s) return
    setPayStudentId(String(studentId))
    setPayStudentSearch(`Roll ${s.roll_no} — ${s.first_name} ${s.last_name}`)
    setPayResultsOpen(false)
    checkExisting(String(studentId), payMonth)
  }

  async function checkExisting(id: string, month: string) {
    if (!id) { setExistingPayInfo(null); return }
    try {
      const res = await api('GET', `/api/fees/student/${id}`)
      const data = normalizeList(res, ['payments', 'fees', 'data'])
      const existing = data.find((r: any) => r.academic_month && r.academic_month.slice(0, 7) === month)
      if (existing) {
        setExistingPayInfo(
          `⚠️ Existing record for this month: Due ${formatMoney(existing.amount_due)}, Paid ${formatMoney(existing.amount_paid)}. New entry will be added.`
        )
      } else {
        setExistingPayInfo(null)
      }
    } catch (e) {
      // silent, matches original
    }
  }

  function handlePayMonthChange(value: string) {
    setPayMonth(value)
    checkExisting(payStudentId, value)
  }

  async function savePayment() {
    const due = parseFloat(payDue) || 0
    const paid = parseFloat(payPaid) || 0
    if (!payStudentId) { showToast('Select a student.', 'error'); return }
    if (!payMonth) { showToast('Select a month.', 'error'); return }
    if (paid <= 0) { showToast('Amount paid must be > 0.', 'error'); return }
    try {
      await api('POST', '/api/fees', {
        student_id: parseInt(payStudentId),
        academic_month: payMonth + '-01',
        amount_due: due,
        amount_paid: paid,
      })
      showToast('Payment recorded!', 'success')
      closePayModal()
      loadMonthlyRecords()
      loadStats()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  function statusBadge(due: number, paid: number) {
    if (paid >= due) return { cls: 'badge-success', label: 'Paid' }
    if (paid > 0) return { cls: 'badge-warning', label: 'Partial' }
    return { cls: 'badge-danger', label: 'Unpaid' }
  }

  function balanceCellClass(due: number, paid: number) {
    if (paid >= due) return 'fee-paid'
    if (paid > 0) return 'fee-partial'
    return 'fee-unpaid'
  }

  return (
    <>
      <Nav />

      <style>{`
        .tab-btn {
          background:none;border:none;padding:8px 18px;font-size:13px;cursor:pointer;
          color:#666;border-bottom:2px solid transparent;font-weight:500;
        }
        .tab-btn.active { color:#1a1a2e;border-bottom-color:#1a1a2e; }
        .tab-btn:hover { color:#1a1a2e; }
      `}</style>

      {/* Record Payment Modal */}
      <div className={`modal-overlay ${payModalOpen ? 'open' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h2 className="modal-title">{payModalTitle}</h2>
            <button className="modal-close" onClick={closePayModal}>×</button>
          </div>
          <form onSubmit={e => e.preventDefault()}>
            <div className="form-group" style={{ position: 'relative' }} ref={payBoxRef}>
              <label>Student *</label>
              <input
                type="text"
                placeholder="Type roll no. or name…"
                autoComplete="off"
                value={payStudentSearch}
                onChange={e => onStudentSearchInput(e.target.value)}
                onFocus={() => setPayResultsOpen(true)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
              />
              {payResultsOpen && (
                <div style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, top: '100%', background: '#fff', border: '1px solid #ccc', borderTop: 'none', maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 8px rgba(0,0,0,.08)' }}>
                  {searchMatches.length === 0 ? (
                    <div style={{ padding: '8px 10px', color: '#888', fontSize: '12px' }}>No matching student.</div>
                  ) : (
                    searchMatches.map(s => (
                      <div
                        key={s.student_id}
                        style={{ padding: '8px 10px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f0f0f0' }}
                        onMouseDown={() => selectPayStudent(s.student_id)}
                      >
                        Roll {s.roll_no} — {s.first_name} {s.last_name} <span style={{ color: '#888' }}>({s.class}-{s.section})</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Academic Month *</label>
              <input type="month" value={payMonth} onChange={e => handlePayMonthChange(e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Amount Due (Rs.)</label>
                <input type="number" step="0.01" placeholder="0" value={payDue} onChange={e => setPayDue(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Amount Paid (Rs.) *</label>
                <input type="number" step="0.01" placeholder="0" value={payPaid} onChange={e => setPayPaid(e.target.value)} />
              </div>
            </div>
            {existingPayInfo && (
              <div style={{ background: '#fff8e1', border: '1px solid #ffe082', padding: '10px', borderRadius: '4px', fontSize: '12px', marginBottom: '10px' }}>
                {existingPayInfo}
              </div>
            )}
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closePayModal}>Cancel</button>
              <button type="button" className="btn btn-success" onClick={savePayment}>Record Payment</button>
            </div>
          </form>
        </div>
      </div>

      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Fee Management</h1>
          <button className="btn btn-success" onClick={openPayModal}>+ Record Payment</button>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><div className="label">Collected (Month)</div><div className="value">{statCollected}</div></div>
          <div className="stat-card"><div className="label">Due (Month)</div><div className="value">{statDue}</div></div>
          <div className="stat-card"><div className="label">Defaulters</div><div className="value">{statDefaulters}</div></div>
          <div className="stat-card"><div className="label">Collected Today</div><div className="value">{statToday}</div></div>
        </div>

        <div style={{ display: 'flex', gap: '2px', marginBottom: '16px', borderBottom: '1px solid #ddd' }}>
          <button className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`} onClick={() => setActiveTab('monthly')}>Monthly Records</button>
          <button className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>Daily Collections</button>
          <button className={`tab-btn ${activeTab === 'defaulters' ? 'active' : ''}`} onClick={() => setActiveTab('defaulters')}>Defaulters</button>
          <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Student History</button>
        </div>

        {/* MONTHLY TAB */}
        {activeTab === 'monthly' && (
          <>
            <div className="card" style={{ marginBottom: '12px' }}>
              <div className="filters">
                <label style={{ fontSize: '12px', color: '#666' }}>Month:</label>
                <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} />
                <select value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                  <option value="">All Classes</option>
                  {CLASS_OPTIONS.map(c => <option key={c}>{c}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
                <input
                  type="text"
                  placeholder="Search student…"
                  value={feeSearch}
                  onChange={e => setFeeSearch(e.target.value)}
                  style={{ padding: '7px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', width: '180px' }}
                />
              </div>
            </div>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Roll</th><th>Student</th><th>Class</th><th>Section</th>
                      <th>Due</th><th>Paid</th><th>Balance</th><th>Status</th><th>Date</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!monthlyLoaded ? (
                      <tr><td colSpan={10} className="loading">Loading…</td></tr>
                    ) : monthlyError ? (
                      <tr><td colSpan={10} className="empty">Failed to load.</td></tr>
                    ) : filteredMonthly.length === 0 ? (
                      <tr><td colSpan={10} className="empty">No records found.</td></tr>
                    ) : (
                      filteredMonthly.map((r, i) => {
                        const due = +r.amount_due || 0
                        const paid = +r.amount_paid || 0
                        const bal = due - paid
                        const { cls, label } = statusBadge(due, paid)
                        return (
                          <tr key={i}>
                            <td>{r.roll_no}</td>
                            <td>{r.first_name} {r.last_name}</td>
                            <td>{r.class}</td><td>{r.section}</td>
                            <td>{formatMoney(due)}</td>
                            <td className={balanceCellClass(due, paid)}>{formatMoney(paid)}</td>
                            <td>{bal > 0 ? formatMoney(bal) : '—'}</td>
                            <td><span className={`badge ${cls}`}>{label}</span></td>
                            <td>{r.payment_date ? formatDate(r.payment_date) : '—'}</td>
                            <td><button className="btn btn-outline btn-sm" onClick={() => quickPay(r.student_id, `${r.first_name} ${r.last_name}`, due, paid)}>Pay</button></td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* DAILY TAB */}
        {activeTab === 'daily' && (
          <>
            <div className="card" style={{ marginBottom: '12px' }}>
              <div className="filters">
                <label style={{ fontSize: '12px', color: '#666' }}>Date:</label>
                <input type="date" value={dailyDateFilter} onChange={e => setDailyDateFilter(e.target.value)} />
              </div>
            </div>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Student</th><th>Class</th><th>Section</th><th>Month</th><th>Amount Paid</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {!dailyLoaded ? (
                      <tr><td colSpan={6} className="loading">Loading…</td></tr>
                    ) : dailyError ? (
                      <tr><td colSpan={6} className="empty">Failed to load.</td></tr>
                    ) : dailyData.length === 0 ? (
                      <tr><td colSpan={6} className="empty">No payments on this date.</td></tr>
                    ) : (
                      dailyData.map((r, i) => (
                        <tr key={i}>
                          <td>{r.first_name} {r.last_name}</td>
                          <td>{r.class}</td><td>{r.section}</td>
                          <td>{r.academic_month ? new Date(r.academic_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'}</td>
                          <td className="fee-paid">{formatMoney(r.amount_paid)}</td>
                          <td style={{ fontSize: '12px', color: '#888' }}>
                            {r.payment_date ? new Date(r.payment_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {dailyLoaded && !dailyError && dailyData.length > 0 && (
                <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 600, padding: '10px 0 0', color: '#2d7a4f' }}>
                  Total Collected: {formatMoney(dailyTotal)}
                </div>
              )}
            </div>
          </>
        )}

        {/* DEFAULTERS TAB */}
        {activeTab === 'defaulters' && (
          <>
            <div className="card" style={{ marginBottom: '12px' }}>
              <div className="filters">
                <label style={{ fontSize: '12px', color: '#666' }}>Month:</label>
                <input type="month" value={defaulterMonthFilter} onChange={e => setDefaulterMonthFilter(e.target.value)} />
                <span style={{ fontSize: '12px', color: '#888', marginLeft: 'auto' }}>
                  {defaultersLoaded && !defaultersError ? `${defaultersData.length} defaulter${defaultersData.length !== 1 ? 's' : ''}` : ''}
                </span>
              </div>
            </div>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Roll</th><th>Student</th><th>Class</th><th>Section</th><th>Father</th><th>Contact</th><th>Amount Due</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {!defaultersLoaded ? (
                      <tr><td colSpan={8} className="loading">Loading…</td></tr>
                    ) : defaultersError ? (
                      <tr><td colSpan={8} className="empty">Failed to load.</td></tr>
                    ) : defaultersData.length === 0 ? (
                      <tr><td colSpan={8} className="empty">No defaulters. 🎉</td></tr>
                    ) : (
                      defaultersData.map((r, i) => (
                        <tr key={i}>
                          <td>{r.roll_no}</td>
                          <td>{r.first_name} {r.last_name}</td>
                          <td>{r.class}</td><td>{r.section}</td>
                          <td>{r.father_name || '—'}</td>
                          <td>{r.contact_1 || '—'}</td>
                          <td className="fee-unpaid">{formatMoney(r.amount_due)}</td>
                          <td><button className="btn btn-warning btn-sm" onClick={() => quickPay(r.student_id, `${r.first_name} ${r.last_name}`, r.amount_due, 0)}>Collect</button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <>
            <div className="card" style={{ marginBottom: '12px' }}>
              <div className="filters">
                <select
                  value={historyStudentId}
                  onChange={e => setHistoryStudentId(e.target.value)}
                  style={{ minWidth: '220px', padding: '7px 10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }}
                >
                  <option value="">Select a student…</option>
                  {allStudents.map(s => (
                    <option key={s.student_id} value={s.student_id}>{s.class}-{s.section} | {s.first_name} {s.last_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Month</th><th>Due</th><th>Paid</th><th>Balance</th><th>Status</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {!historyStudentId ? (
                      <tr><td colSpan={6} className="empty">Select a student above.</td></tr>
                    ) : !historyLoaded ? (
                      <tr><td colSpan={6} className="loading">Loading…</td></tr>
                    ) : historyError ? (
                      <tr><td colSpan={6} className="empty">Failed to load.</td></tr>
                    ) : historyData.length === 0 ? (
                      <tr><td colSpan={6} className="empty">No payment history.</td></tr>
                    ) : (
                      historyData.map((r, i) => {
                        const due = +r.amount_due || 0
                        const paid = +r.amount_paid || 0
                        const bal = due - paid
                        const { cls, label } = statusBadge(due, paid)
                        return (
                          <tr key={i}>
                            <td>{r.academic_month ? new Date(r.academic_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'}</td>
                            <td>{formatMoney(due)}</td>
                            <td className={balanceCellClass(due, paid)}>{formatMoney(paid)}</td>
                            <td>{bal > 0 ? formatMoney(bal) : '—'}</td>
                            <td><span className={`badge ${cls}`}>{label}</span></td>
                            <td>{r.payment_date ? formatDate(r.payment_date) : '—'}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {historyLoaded && !historyError && historyData.length > 0 && (
                <div style={{ padding: '8px 0 0', fontSize: '13px', color: '#555' }}>
                  Total Due: <strong>{formatMoney(historyTotals.due)}</strong>
                  {' | '}Total Paid: <strong className="fee-paid">{formatMoney(historyTotals.paid)}</strong>
                  {' | '}Outstanding: <strong className="fee-unpaid">{formatMoney(historyTotals.due - historyTotals.paid)}</strong>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}