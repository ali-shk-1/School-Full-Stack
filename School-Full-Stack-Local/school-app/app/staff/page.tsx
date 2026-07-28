'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { useAuthGuard } from '@/lib/useAuthGuard'
import { api, formatMoney, normalizeList } from '@/lib/api'
import { useToast } from '@/lib/toast'

interface Designation {
  id: number
  title: string
}

interface Staff {
  staff_id: number
  name: string
  staff_code: string
  cnic: string
  phone_no?: string
  salary?: number
  designation_id?: number
  designation_title?: string
}

const emptyForm = {
  staffId: '',
  staffName: '',
  staffCode: '',
  cnic: '',
  phone: '',
  salary: '',
  designationId: '',
}

export default function StaffPage() {
  useAuthGuard()
  const showToast = useToast()

  const [allStaff, setAllStaff] = useState<Staff[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const [search, setSearch] = useState('')
  const [filterDesig, setFilterDesig] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  const [desigModalOpen, setDesigModalOpen] = useState(false)
  const [newDesigTitle, setNewDesigTitle] = useState('')

  async function loadDesignations() {
    try {
      const res = await api('GET', '/api/staff/designations')
      setDesignations(normalizeList(res, ['designations', 'data']))
    } catch (e) {
      console.error(e)
    }
  }

  async function loadStaff() {
    try {
      const res = await api('GET', '/api/staff')
      setAllStaff(normalizeList(res, ['staff', 'data']))
      setLoadError(false)
    } catch (e) {
      setLoadError(true)
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => {
    loadDesignations()
    loadStaff()
  }, [])

  const filteredStaff = allStaff.filter(s => {
    const q = search.toLowerCase()
    const txt = `${s.name} ${s.staff_code} ${s.cnic}`.toLowerCase()
    return (!q || txt.includes(q)) && (!filterDesig || String(s.designation_id) === filterDesig)
  })

  function openModal(staff: Staff | null = null) {
    setForm({
      staffId: staff ? String(staff.staff_id) : '',
      staffName: staff ? staff.name : '',
      staffCode: staff ? staff.staff_code : '',
      cnic: staff ? staff.cnic : '',
      phone: staff ? (staff.phone_no || '') : '',
      salary: staff ? String(staff.salary || '') : '',
      designationId: staff ? String(staff.designation_id || '') : '',
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  function editStaff(id: number) {
    const s = allStaff.find(x => x.staff_id === id)
    if (s) openModal(s)
  }

  async function saveStaff() {
    const id = form.staffId
    const body = {
      name: form.staffName.trim(),
      staff_code: form.staffCode.trim(),
      cnic: form.cnic.trim(),
      phone_no: form.phone.trim(),
      salary: parseFloat(form.salary) || 0,
      designation_id: parseInt(form.designationId) || null,
    }
    if (!body.name || !body.staff_code || !body.cnic) {
      showToast('Name, code and CNIC are required.', 'error')
      return
    }
    try {
      if (id) {
        await api('PUT', `/api/staff/${id}`, body)
        showToast('Staff updated.')
      } else {
        await api('POST', '/api/staff', body)
        showToast('Staff added.')
      }
      closeModal()
      loadStaff()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  async function deleteStaff(id: number) {
    const s = allStaff.find(x => x.staff_id === id)
    if (!confirm(`Delete "${s ? s.name : 'this staff member'}"? This cannot be undone.`)) return
    try {
      await api('DELETE', `/api/staff/${id}`)
      showToast('Staff deleted.')
      loadStaff()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  function openDesigModal() {
    setDesigModalOpen(true)
  }

  function closeDesigModal() {
    setDesigModalOpen(false)
    loadDesignations()
  }

  async function addDesignation() {
    const title = newDesigTitle.trim()
    if (!title) return
    try {
      await api('POST', '/api/staff/designations', { title })
      setNewDesigTitle('')
      const res = await api('GET', '/api/staff/designations')
      setDesignations(normalizeList(res, ['designations', 'data']))
      showToast('Designation added.')
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  async function deleteDesig(id: number, title: string) {
    if (!confirm(`Remove designation "${title}"?`)) return
    try {
      await api('DELETE', `/api/staff/designations/${id}`)
      const res = await api('GET', '/api/staff/designations')
      setDesignations(normalizeList(res, ['designations', 'data']))
      showToast('Designation removed.')
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  return (
    <>
      <Nav />

      {/* Staff Modal */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h2 className="modal-title">{form.staffId ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
            <button className="modal-close" onClick={closeModal}>×</button>
          </div>
          <form onSubmit={e => e.preventDefault()}>
            <div className="form-row">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label>Full Name *</label>
                <input type="text" value={form.staffName} onChange={e => setForm({ ...form, staffName: e.target.value })} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Staff Code *</label>
                <input type="text" placeholder="e.g. TCH-001" value={form.staffCode} onChange={e => setForm({ ...form, staffCode: e.target.value })} />
              </div>
              <div className="form-group">
                <label>CNIC *</label>
                <input type="text" placeholder="xxxxx-xxxxxxx-x" value={form.cnic} onChange={e => setForm({ ...form, cnic: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input type="text" placeholder="03xxxxxxxxx" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Salary (Rs.)</label>
                <input type="number" placeholder="0.00" step="0.01" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Designation</label>
              <select value={form.designationId} onChange={e => setForm({ ...form, designationId: e.target.value })}>
                <option value="">Select designation</option>
                {designations.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={saveStaff}>Save</button>
            </div>
          </form>
        </div>
      </div>

      {/* Designation Modal */}
      <div className={`modal-overlay ${desigModalOpen ? 'open' : ''}`}>
        <div className="modal" style={{ maxWidth: '380px' }}>
          <div className="modal-header">
            <h2 className="modal-title">Manage Designations</h2>
            <button className="modal-close" onClick={closeDesigModal}>×</button>
          </div>
          <div className="form-group">
            <label>Add New Designation</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="e.g. Teacher"
                style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                value={newDesigTitle}
                onChange={e => setNewDesigTitle(e.target.value)}
              />
              <button className="btn btn-primary" onClick={addDesignation}>Add</button>
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            {designations.length === 0 ? (
              <p className="empty">No designations yet.</p>
            ) : (
              <div style={{ border: '1px solid #eee', borderRadius: '4px' }}>
                {designations.map((d, i) => (
                  <div
                    key={d.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderTop: i ? '1px solid #eee' : 'none',
                    }}
                  >
                    <span>{d.title}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteDesig(d.id, d.title)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Staff</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline" onClick={openDesigModal}>Designations</button>
            <button className="btn btn-primary" onClick={() => openModal()}>+ Add Staff</button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="filters">
            <input
              className="search-box"
              type="text"
              placeholder="Search name, code, CNIC…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select value={filterDesig} onChange={e => setFilterDesig(e.target.value)}>
              <option value="">All Designations</option>
              {designations.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
            <span style={{ fontSize: '12px', color: '#888', marginLeft: 'auto' }}>
              {filteredStaff.length} staff member{filteredStaff.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th><th>Name</th><th>Designation</th><th>CNIC</th>
                  <th>Phone</th><th>Salary</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loaded ? (
                  <tr><td colSpan={7} className="loading">Loading…</td></tr>
                ) : loadError ? (
                  <tr><td colSpan={7} className="empty">Failed to load.</td></tr>
                ) : filteredStaff.length === 0 ? (
                  <tr><td colSpan={7} className="empty">No staff found.</td></tr>
                ) : (
                  filteredStaff.map(s => (
                    <tr key={s.staff_id}>
                      <td>{s.staff_code}</td>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.designation_title || '—'}</td>
                      <td>{s.cnic}</td>
                      <td>{s.phone_no || '—'}</td>
                      <td>{formatMoney(s.salary || 0)}</td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => editStaff(s.staff_id)}>Edit</button>{' '}
                        <button className="btn btn-danger btn-sm" onClick={() => deleteStaff(s.staff_id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}