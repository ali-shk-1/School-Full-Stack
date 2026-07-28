import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

function normalizeMonthInput(value: string | null): string {
  if (!value) return `${new Date().toISOString().slice(0, 7)}-01`
  let raw = value.trim()
  if (/^\d{4}-\d{2}-\d{2}-01$/.test(raw)) raw = raw.slice(0, -3)
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`
  return raw
}

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const month = normalizeMonthInput(searchParams.get('month'))

  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      TO_CHAR(academic_month, 'Month YYYY') AS month_label,
      COUNT(*) AS payment_count,
      SUM(amount_due)  AS total_due,
      SUM(amount_paid) AS total_paid,
      SUM(amount_due - amount_paid) AS total_balance
    FROM fee_payments
    WHERE DATE_TRUNC('month', academic_month) = DATE_TRUNC('month', ${month}::DATE)
    GROUP BY academic_month
  `

  return NextResponse.json(
    rows[0] || { month_label: null, payment_count: 0, total_due: 0, total_paid: 0, total_balance: 0 }
  )
})