import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year')) || new Date().getFullYear()

  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      TO_CHAR(created_at, 'Mon YYYY') AS month_label,
      DATE_TRUNC('month', created_at) AS month_date,
      SUM(amount) AS total_amount,
      COUNT(*) AS transaction_count
    FROM expenses
    WHERE EXTRACT(YEAR FROM created_at) = ${year}
    GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon YYYY')
    ORDER BY month_date
  `

  return NextResponse.json(rows)
})