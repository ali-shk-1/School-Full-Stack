import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (_req, _user, ctx) => {
  const { student_id } = await ctx.params
  const payments = await prisma.fee_payments.findMany({
    where: { student_id: Number(student_id) },
    include: { students: true },
    orderBy: { academic_month: 'desc' },
  })

  const shaped = payments.map(p => ({
    ...p,
    balance: Number(p.amount_due ?? 0) - Number(p.amount_paid ?? 0),
    first_name: p.students?.first_name,
    last_name: p.students?.last_name,
    roll_no: p.students?.roll_no,
    class: p.students?.class,
    section: p.students?.section,
  }))

  return NextResponse.json({ count: shaped.length, payments: shaped })
})