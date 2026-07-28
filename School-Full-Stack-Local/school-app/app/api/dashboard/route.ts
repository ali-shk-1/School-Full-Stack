import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async () => {
  const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`
  const currentYear = new Date().getFullYear()

  const [
    studentsCount,
    staffCount,
    feesMonth,
    expensesMonth,
    defaultersCount,
    feesYear,
    expensesYear,
  ] = await Promise.all([
    prisma.students.count(),
    prisma.staff.count(),

    prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(amount_due), 0) AS total_due,
             COALESCE(SUM(amount_paid), 0) AS total_paid
      FROM fee_payments
      WHERE DATE_TRUNC('month', academic_month) = DATE_TRUNC('month', ${currentMonth}::DATE)
    `,

    prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(amount), 0) AS total_expenses
      FROM expenses
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', ${currentMonth}::DATE)
    `,

    prisma.$queryRaw<any[]>`
      SELECT COUNT(*) AS total
      FROM students s
      LEFT JOIN fee_payments fp
        ON fp.student_id = s.student_id
        AND DATE_TRUNC('month', fp.academic_month) = DATE_TRUNC('month', ${currentMonth}::DATE)
      LEFT JOIN LATERAL (
        SELECT fp2.amount_due
        FROM fee_payments fp2
        WHERE fp2.student_id = s.student_id
          AND fp2.academic_month < DATE_TRUNC('month', ${currentMonth}::DATE)
        ORDER BY fp2.academic_month DESC
        LIMIT 1
      ) prev ON true
      WHERE s.admission_date <= (DATE_TRUNC('month', ${currentMonth}::DATE) + INTERVAL '1 month' - INTERVAL '1 day')
        AND COALESCE(fp.amount_due, prev.amount_due, 0) > 0
        AND COALESCE(fp.amount_paid, 0) < COALESCE(fp.amount_due, prev.amount_due, 0)
    `,

    prisma.$queryRaw<any[]>`
      SELECT TO_CHAR(academic_month, 'Mon') AS month, SUM(amount_paid) AS collected
      FROM fee_payments
      WHERE EXTRACT(YEAR FROM academic_month) = ${currentYear}
      GROUP BY DATE_TRUNC('month', academic_month), TO_CHAR(academic_month, 'Mon')
      ORDER BY DATE_TRUNC('month', academic_month)
    `,

    prisma.$queryRaw<any[]>`
      SELECT TO_CHAR(created_at, 'Mon') AS month, SUM(amount) AS spent
      FROM expenses
      WHERE EXTRACT(YEAR FROM created_at) = ${currentYear}
      GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon')
      ORDER BY DATE_TRUNC('month', created_at)
    `,
  ])

  const feesDue = Number(feesMonth[0]?.total_due ?? 0)
  const feesPaid = Number(feesMonth[0]?.total_paid ?? 0)

  return NextResponse.json({
    kpis: {
      total_students: studentsCount,
      total_staff: staffCount,
      fees_due: feesDue,
      fees_collected: feesPaid,
      fees_balance: feesDue - feesPaid,
      expenses_month: Number(expensesMonth[0]?.total_expenses ?? 0),
      fee_defaulters: Number(defaultersCount[0]?.total ?? 0),
    },
    charts: {
      monthly_fees: feesYear,
      monthly_expenses: expensesYear,
    },
  })
})