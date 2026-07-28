import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year')) || new Date().getFullYear()

  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      TO_CHAR(academic_month, 'Mon YYYY') AS month_label,
      DATE_TRUNC('month', academic_month) AS month_date,
      SUM(amount_due)  AS total_due,
      SUM(amount_paid) AS total_paid,
      SUM(amount_due - amount_paid) AS total_balance
    FROM fee_payments
    WHERE EXTRACT(YEAR FROM academic_month) = ${year}
    GROUP BY DATE_TRUNC('month', academic_month), TO_CHAR(academic_month, 'Mon YYYY')
    ORDER BY month_date
  `

  return NextResponse.json(rows)
})