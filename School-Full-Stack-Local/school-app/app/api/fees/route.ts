import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRole } from '@/lib/auth'

function normalizeMonthInput(value: string | null): string | null {
  if (!value) return null
  let raw = value.trim()
  if (/^\d{4}-\d{2}-\d{2}-01$/.test(raw)) raw = raw.slice(0, -3)
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return raw
}

// POST /api/fees — record a payment (admin, accountant only)
export const POST = withRole(['admin', 'accountant'], async (req: NextRequest) => {
  try {
    const { student_id, academic_month, amount_due, amount_paid } = await req.json()

    if (!student_id || !academic_month || amount_due == null) {
      return NextResponse.json(
        { error: 'student_id, academic_month, and amount_due are required.' },
        { status: 400 }
      )
    }

    const student = await prisma.students.findUnique({ where: { student_id } })
    if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })

    const payment = await prisma.fee_payments.create({
      data: {
        student_id,
        academic_month: new Date(academic_month),
        amount_due,
        amount_paid: amount_paid || 0,
      },
    })

    return NextResponse.json({ message: 'Fee payment recorded.', payment }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
})

// GET /api/fees — monthly fee listing with optional filters
export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const cls = searchParams.get('class')
  const search = searchParams.get('search')

  const where: any = {}
  if (month) {
    const normalized = normalizeMonthInput(month)
    if (normalized) {
      const start = new Date(normalized)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
      where.academic_month = { gte: start, lt: end }
    }
  }
  if (cls) where.students = { class: cls }
  if (search) {
    where.students = {
      ...(where.students || {}),
      OR: [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
      ],
    }
  }

  const payments = await prisma.fee_payments.findMany({
    where,
    include: { students: true },
    orderBy: [{ academic_month: 'desc' }],
  })

  const shaped = payments.map(p => ({
    payment_id: p.payment_id,
    student_id: p.student_id,
    academic_month: p.academic_month,
    amount_due: p.amount_due,
    amount_paid: p.amount_paid,
    payment_date: p.payment_date,
    roll_no: p.students?.roll_no,
    first_name: p.students?.first_name,
    last_name: p.students?.last_name,
    class: p.students?.class,
    section: p.students?.section,
  }))

  return NextResponse.json({ count: shaped.length, payments: shaped })
})