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
      s.student_id, s.roll_no, s.first_name, s.last_name,
      s.class, s.section, s.contact_1, s.father_name, s.admission_date,
      COALESCE(fp.amount_due, prev.amount_due, 0) AS amount_due,
      COALESCE(fp.amount_paid, 0) AS amount_paid,
      COALESCE(fp.amount_due, prev.amount_due, 0) - COALESCE(fp.amount_paid, 0) AS balance,
      fp.payment_date
    FROM students s
    LEFT JOIN fee_payments fp
      ON fp.student_id = s.student_id
      AND DATE_TRUNC('month', fp.academic_month) = DATE_TRUNC('month', ${month}::DATE)
    LEFT JOIN LATERAL (
      SELECT fp2.amount_due
      FROM fee_payments fp2
      WHERE fp2.student_id = s.student_id
        AND fp2.academic_month < DATE_TRUNC('month', ${month}::DATE)
      ORDER BY fp2.academic_month DESC
      LIMIT 1
    ) prev ON true
    WHERE s.admission_date <= (DATE_TRUNC('month', ${month}::DATE) + INTERVAL '1 month' - INTERVAL '1 day')
      AND COALESCE(fp.amount_due, prev.amount_due, 0) > 0
      AND COALESCE(fp.amount_paid, 0) < COALESCE(fp.amount_due, prev.amount_due, 0)
    ORDER BY balance DESC
  `

  return NextResponse.json({ count: rows.length, month, defaulters: rows })
})