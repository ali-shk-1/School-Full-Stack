'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { useAuthGuard } from '@/lib/useAuthGuard'
import { api, formatMoney, formatDate, normalizeList } from '@/lib/api'
import { useToast } from '@/lib/toast'

interface Category {
  category_id: number
  category_name: string
}

interface Expense {
  expense_id: number
  category_id: number
  category_name?: string
  amount: number | string
  description?: string
  created_at?: string
}

export default function ExpensesPage() {
  useAuthGuard()
  const showToast = useToast()

  const todayStr = new Date().toISOString().slice(0, 10)
  const monthStart = todayStr.slice(0, 7) + '-01'
  const monthEnd = todayStr

  const [categories, setCategories] = useState<Category[]>([])

  // Filters
  const [dateFrom, setDateFrom] = useState(monthStart)
  const [dateTo, setDateTo] = useState(monthEnd)
  const [catFilter, setCatFilter] = useState('')

  // Table data
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expLoaded, setExpLoaded] = useState(false)
  const [expError, setExpError] = useState(false)

  // Stats
  const [statMonth, setStatMonth] = useState('—')
  const [statToday, setStatToday] = useState('—')
  const [statYear, setStatYear] = useState('—')
  const [statTopCat, setStatTopCat] = useState('—')

  // Expense modal
  const [expModalOpen, setExpModalOpen] = useState(false)
  const [expModalTitle, setExpModalTitle] = useState('Add Expense')
  const [expenseId, setExpenseId] = useState('')
  const [expCategory, setExpCategory] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expDesc, setExpDesc] = useState('')
  const [expDate, setExpDate] = useState(todayStr)

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  // ── Categories ──────────────────────────────────────────────────────────
  async function loadCategories() {
    try {
      const catRaw = await api('GET', '/api/expenses/categories')
      setCategories(normalizeList(catRaw, ['categories', 'data']))
    } catch (e) {
      console.error(e)
    }
  }

  // ── Stats ───────────────────────────────────────────────────────────────
  async function loadStats() {
    try {
      const now = new Date()
      const yearStart = now.getFullYear() + '-01-01'

      const [monthData, todayData, yearData] = await Promise.all([
        api('GET', `/api/expenses?from=${monthStart}&to=${monthEnd}`),
        api('GET', `/api/expenses?from=${todayStr}&to=${todayStr}`),
        api('GET', `/api/expenses?from=${yearStart}&to=${todayStr}`),
      ])

      const monthList = normalizeList(monthData, ['expenses', 'data'])
      const todayList = normalizeList(todayData, ['expenses', 'data'])
      const yearList = normalizeList(yearData, ['expenses', 'data'])

      const sum = (arr: any[]) => arr.reduce((s, r) => s + (+r.amount || 0), 0)

      setStatMonth(formatMoney(sum(monthList)))
      setStatToday(formatMoney(sum(todayList)))
      setStatYear(formatMoney(sum(yearList)))

      if (monthList.length) {
        const map: Record<string, number> = {}
        monthList.forEach((r: any) => {
          const k = r.category_name || 'Uncategorized'
          map[k] = (map[k] || 0) + (+r.amount || 0)
        })
        const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0]
        setStatTopCat(top ? top[0] : '—')
      } else {
        setStatTopCat('—')
      }
    } catch (e) {
      console.error('loadStats error:', e)
    }
  }

  // ── Expenses table ──────────────────────────────────────────────────────
  async function loadExpenses() {
    setExpLoaded(false)
    setExpError(false)
    const params = new URLSearchParams()
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)
    if (catFilter) params.set('category', catFilter)
    const url = '/api/expenses' + (params.toString() ? '?' + params.toString() : '')

    try {
      const raw = await api('GET', url)
      const data = normalizeList(raw, ['expenses', 'data', 'results'])
      setExpenses(data)
    } catch (e) {
      setExpError(true)
    } finally {
      setExpLoaded(true)
    }
  }

  const total = expenses.reduce((s, r) => s + (+r.amount || 0), 0)

  const catBreakdown = (() => {
    if (!expenses.length) return []
    const map: Record<string, number> = {}
    expenses.forEach(r => {
      const key = r.category_name || 'Uncategorized'
      map[key] = (map[key] || 0) + (+r.amount || 0)
    })
    const breakdownTotal = Object.values(map).reduce((a, b) => a + b, 0)
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amt]) => ({
        name,
        amt,
        pct: breakdownTotal > 0 ? Math.round((amt / breakdownTotal) * 100) : 0,
      }))
  })()

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadExpenses()
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadExpenses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, catFilter])

  function setThisMonth() {
    setDateFrom(monthStart)
    setDateTo(monthEnd)
  }
  function setToday() {
    setDateFrom(todayStr)
    setDateTo(todayStr)
  }
  function clearFilters() {
    setDateFrom('')
    setDateTo('')
    setCatFilter('')
  }

  // ── Expense modal ──────────────────────────────────────────────────────
  function openExpModal() {
    setExpenseId('')
    setExpCategory('')
    setExpAmount('')
    setExpDesc('')
    setExpDate(todayStr)
    setExpModalTitle('Add Expense')
    setExpModalOpen(true)
  }

  function closeExpModal() {
    setExpModalOpen(false)
  }

  async function editExpense(id: number) {
    try {
      const data = await api('GET', `/api/expenses/${id}`)
      setExpenseId(String(data.expense_id))
      setExpCategory(String(data.category_id))
      setExpAmount(String(data.amount))
      setExpDesc(data.description || '')
      setExpDate(data.created_at ? data.created_at.slice(0, 10) : todayStr)
      setExpModalTitle('Edit Expense')
      setExpModalOpen(true)
    } catch (e) {
      showToast('Could not load expense.', 'error')
    }
  }

  async function deleteExpense(id: number) {
    if (!confirm('Delete this expense?')) return
    try {
      await api('DELETE', `/api/expenses/${id}`)
      showToast('Expense deleted.')
      loadExpenses()
      loadStats()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  async function saveExpense() {
    const amount = parseFloat(expAmount)
    const desc = expDesc.trim()

    if (!expCategory) { showToast('Select a category.', 'error'); return }
    if (!amount || amount <= 0) { showToast('Enter a valid amount.', 'error'); return }

    const body = { category_id: parseInt(expCategory), amount, description: desc, created_at: expDate }
    try {
      if (expenseId) {
        await api('PUT', `/api/expenses/${expenseId}`, body)
        showToast('Expense updated.')
      } else {
        await api('POST', '/api/expenses', body)
        showToast('Expense added.')
      }
      closeExpModal()
      loadExpenses()
      loadStats()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  // ── Category modal ─────────────────────────────────────────────────────
  function openCatModal() {
    setCatModalOpen(true)
  }

  function closeCatModal() {
    setCatModalOpen(false)
    loadCategories()
  }

  async function addCategory() {
    const name = newCatName.trim()
    if (!name) return
    try {
      await api('POST', '/api/expenses/categories', { category_name: name })
      setNewCatName('')
      const catRaw = await api('GET', '/api/expenses/categories')
      setCategories(normalizeList(catRaw, ['categories', 'data']))
      showToast('Category added.')
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  async function deleteCategory(id: number, name: string) {
    if (!confirm(`Remove category "${name}"?`)) return
    try {
      await api('DELETE', `/api/expenses/categories/${id}`)
      const catRaw = await api('GET', '/api/expenses/categories')
      setCategories(normalizeList(catRaw, ['categories', 'data']))
      showToast('Category removed.')
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  return (
    <>
      <Nav />

      {/* Add Expense Modal */}
      <div className={`modal-overlay ${expModalOpen ? 'open' : ''}`}>
        <div className="modal" style={{ maxWidth: '480px' }}>
          <div className="modal-header">
            <h2 className="modal-title">{expModalTitle}</h2>
            <button className="modal-close" onClick={closeExpModal}>×</button>
          </div>
          <form onSubmit={e => e.preventDefault()}>
            <div className="form-group">
              <label>Category *</label>
              <select value={expCategory} onChange={e => setExpCategory(e.target.value)}>
                <option value="">Select category…</option>
                {categories.map(c => (
                  <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Amount (Rs.) *</label>
              <input type="number" step="0.01" placeholder="0.00" value={expAmount} onChange={e => setExpAmount(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={2} placeholder="Optional details…" value={expDesc} onChange={e => setExpDesc(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeExpModal}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={saveExpense}>Save Expense</button>
            </div>
          </form>
        </div>
      </div>

      {/* Category Modal */}
      <div className={`modal-overlay ${catModalOpen ? 'open' : ''}`}>
        <div className="modal" style={{ maxWidth: '380px' }}>
          <div className="modal-header">
            <h2 className="modal-title">Manage Categories</h2>
            <button className="modal-close" onClick={closeCatModal}>×</button>
          </div>
          <div className="form-group">
            <label>New Category Name</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="e.g. Utilities"
                style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
              />
              <button className="btn btn-primary" onClick={addCategory}>Add</button>
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            {categories.length === 0 ? (
              <p className="empty">No categories yet.</p>
            ) : (
              <div style={{ border: '1px solid #eee', borderRadius: '4px' }}>
                {categories.map((c, i) => (
                  <div
                    key={c.category_id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderTop: i ? '1px solid #eee' : 'none' }}
                  >
                    <span>{c.category_name}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteCategory(c.category_id, c.category_name)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Expenses</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline" onClick={openCatModal}>Categories</button>
            <button className="btn btn-primary" onClick={openExpModal}>+ Add Expense</button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><div className="label">This Month</div><div className="value">{statMonth}</div></div>
          <div className="stat-card"><div className="label">Today</div><div className="value">{statToday}</div></div>
          <div className="stat-card"><div className="label">This Year</div><div className="value">{statYear}</div></div>
          <div className="stat-card"><div className="label">Top Category (Month)</div><div className="value" style={{ fontSize: '14px' }}>{statTopCat}</div></div>
        </div>

        <div className="card" style={{ marginBottom: '12px' }}>
          <div className="filters">
            <label style={{ fontSize: '12px', color: '#666' }}>From:</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <label style={{ fontSize: '12px', color: '#666' }}>To:</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>
            <button className="btn btn-outline btn-sm" onClick={setThisMonth}>This Month</button>
            <button className="btn btn-outline btn-sm" onClick={setToday}>Today</button>
            <button className="btn btn-outline btn-sm" onClick={clearFilters}>Clear</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', alignItems: 'start' }}>
          <div className="card">
            <div className="section-title">All Expenses</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {!expLoaded ? (
                    <tr><td colSpan={5} className="loading">Loading…</td></tr>
                  ) : expError ? (
                    <tr><td colSpan={5} className="empty">Failed to load.</td></tr>
                  ) : expenses.length === 0 ? (
                    <tr><td colSpan={5} className="empty">No expenses found.</td></tr>
                  ) : (
                    expenses.map(r => (
                      <tr key={r.expense_id}>
                        <td>{formatDate(r.created_at || null)}</td>
                        <td><span className="badge badge-info">{r.category_name || '—'}</span></td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.description || ''}>
                          {r.description || '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: '#c0392b' }}>{formatMoney(r.amount)}</td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => editExpense(r.expense_id)}>Edit</button>{' '}
                          <button className="btn btn-danger btn-sm" onClick={() => deleteExpense(r.expense_id)}>Del</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {expLoaded && !expError && expenses.length > 0 && (
              <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 600, padding: '10px 0 0', color: '#c0392b' }}>
                Total: {formatMoney(total)}
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-title">By Category</div>
            {!expLoaded ? (
              <div className="loading">Loading…</div>
            ) : catBreakdown.length === 0 ? (
              <p className="empty">No data.</p>
            ) : (
              catBreakdown.map(({ name, amt, pct }) => (
                <div key={name} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span style={{ color: '#444' }}>{name}</span>
                    <span style={{ fontWeight: 600 }}>
                      {formatMoney(amt)} <span style={{ color: '#888', fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ background: '#eee', borderRadius: '3px', height: '6px' }}>
                    <div style={{ background: '#1a1a2e', height: '6px', borderRadius: '3px', width: `${pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}