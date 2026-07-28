'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { useAuthGuard } from '@/lib/useAuthGuard'
import { api, formatDate, normalizeList } from '@/lib/api'
import { useToast } from '@/lib/toast'

const CLASS_OPTIONS = ['Nursery', 'KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
const SECTION_OPTIONS = ['A', 'B', 'C']

interface Student {
  student_id: number
  first_name: string
  last_name: string
  roll_no: number
  class: string
  section: string
  father_name?: string
  contact_1?: string
  contact_2?: string
  address?: string
  admission_date?: string
}

const emptyForm = {
  studentId: '',
  firstName: '',
  lastName: '',
  rollNo: '',
  classField: '',
  section: '',
  fatherName: '',
  admissionDate: '',
  contact1: '',
  contact2: '',
  address: '',
}

export default function StudentsPage() {
  useAuthGuard()
  const showToast = useToast()

  const todayStr = new Date().toISOString().slice(0, 10)

  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [loadError, setLoadError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterSection, setFilterSection] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  async function loadStudents() {
    try {
      const res = await api('GET', '/api/students')
      const list = normalizeList(res, ['students', 'data'])
      setAllStudents(list)
      setLoadError(false)
    } catch (e) {
      setLoadError(true)
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [])

  const filteredStudents = allStudents.filter(s => {
    const name = `${s.first_name} ${s.last_name} ${s.roll_no}`.toLowerCase()
    const q = search.toLowerCase()
    return (!q || name.includes(q))
      && (!filterClass || s.class === filterClass)
      && (!filterSection || s.section === filterSection)
  })

  function openModal(student: Student | null = null) {
    setForm({
      studentId: student ? String(student.student_id) : '',
      firstName: student ? student.first_name : '',
      lastName: student ? student.last_name : '',
      rollNo: student ? String(student.roll_no) : '',
      classField: student ? student.class : '',
      section: student ? student.section : '',
      fatherName: student ? (student.father_name || '') : '',
      admissionDate: student
        ? (student.admission_date ? student.admission_date.slice(0, 10) : '')
        : todayStr,
      contact1: student ? (student.contact_1 || '') : '',
      contact2: student ? (student.contact_2 || '') : '',
      address: student ? (student.address || '') : '',
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  function editStudent(id: number) {
    const s = allStudents.find(x => x.student_id === id)
    if (s) openModal(s)
  }

  async function saveStudent() {
    const id = form.studentId
    const body = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      roll_no: parseInt(form.rollNo),
      class: form.classField,
      section: form.section.trim().toUpperCase(),
      father_name: form.fatherName.trim(),
      admission_date: form.admissionDate || null,
      contact_1: form.contact1.trim(),
      contact_2: form.contact2.trim(),
      address: form.address.trim(),
    }
    if (!body.first_name || !body.last_name || !body.roll_no || !body.class || !body.section) {
      showToast('Please fill all required fields.', 'error')
      return
    }
    try {
      if (id) {
        await api('PUT', `/api/students/${id}`, body)
        showToast('Student updated.', 'success')
      } else {
        await api('POST', '/api/students', body)
        showToast('Student added.', 'success')
      }
      closeModal()
      loadStudents()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  async function deleteStudent(id: number) {
    const s = allStudents.find(x => x.student_id === id)
    const name = s ? `${s.first_name} ${s.last_name}` : 'this student'
    if (!confirm(`Delete student "${name}"? This cannot be undone.`)) return
    try {
      await api('DELETE', `/api/students/${id}`)
      showToast('Student deleted.')
      loadStudents()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  return (
    <>
      <Nav />

      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h2 className="modal-title">{form.studentId ? 'Edit Student' : 'Add Student'}</h2>
            <button className="modal-close" onClick={closeModal}>×</button>
          </div>
          <form onSubmit={e => e.preventDefault()}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input type="text" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input type="text" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Roll No *</label>
                <input type="number" value={form.rollNo} onChange={e => setForm({ ...form, rollNo: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Class *</label>
                <select value={form.classField} onChange={e => setForm({ ...form, classField: e.target.value })}>
                  <option value="">Select class</option>
                  {CLASS_OPTIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Section *</label>
                <input type="text" placeholder="e.g. A" maxLength={5} value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Father's Name</label>
                <input type="text" value={form.fatherName} onChange={e => setForm({ ...form, fatherName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Admission Date</label>
                <input type="date" value={form.admissionDate} onChange={e => setForm({ ...form, admissionDate: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Contact 1</label>
                <input type="text" placeholder="03xxxxxxxxx" value={form.contact1} onChange={e => setForm({ ...form, contact1: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Contact 2</label>
                <input type="text" placeholder="Optional" value={form.contact2} onChange={e => setForm({ ...form, contact2: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={saveStudent}>Save Student</button>
            </div>
          </form>
        </div>
      </div>

      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Students</h1>
          <button className="btn btn-primary" onClick={() => openModal()}>+ Add Student</button>
        </div>

        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="filters">
            <input
              className="search-box"
              type="text"
              placeholder="Search name, roll no…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {CLASS_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={filterSection} onChange={e => setFilterSection(e.target.value)}>
              <option value="">All Sections</option>
              {SECTION_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            <span style={{ fontSize: '12px', color: '#888', marginLeft: 'auto' }}>
              {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Roll No</th><th>Name</th><th>Class</th><th>Section</th>
                  <th>Father</th><th>Contact</th><th>Admitted</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loaded ? (
                  <tr><td colSpan={8} className="loading">Loading…</td></tr>
                ) : loadError ? (
                  <tr><td colSpan={8} className="empty">Failed to load students.</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan={8} className="empty">No students found.</td></tr>
                ) : (
                  filteredStudents.map(s => (
                    <tr key={s.student_id}>
                      <td>{s.roll_no}</td>
                      <td><strong>{s.first_name} {s.last_name}</strong></td>
                      <td>{s.class}</td>
                      <td>{s.section}</td>
                      <td>{s.father_name || '—'}</td>
                      <td>{s.contact_1 || '—'}</td>
                      <td style={{ fontSize: '12px', color: '#888' }}>
                        {s.admission_date ? formatDate(s.admission_date) : '—'}
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => editStudent(s.student_id)}>Edit</button>{' '}
                        <button className="btn btn-danger btn-sm" onClick={() => deleteStudent(s.student_id)}>Delete</button>
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