import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const start = new Date(date)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  const payments = await prisma.fee_payments.findMany({
    where: { payment_date: { gte: start, lt: end } },
    include: { students: true },
    orderBy: { payment_date: 'desc' },
  })

  const shaped = payments.map(p => ({
    payment_id: p.payment_id,
    student_id: p.student_id,
    academic_month: p.academic_month,
    amount_due: p.amount_due,
    amount_paid: p.amount_paid,
    payment_date: p.payment_date,
    first_name: p.students?.first_name,
    last_name: p.students?.last_name,
    class: p.students?.class,
    section: p.students?.section,
  }))

  return NextResponse.json({ count: shaped.length, payments: shaped })
})