import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let rows
  if (month) {
    rows = await prisma.$queryRaw<any[]>`
      SELECT ec.category_name, COUNT(*) AS transaction_count, SUM(e.amount) AS total_amount
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.category_id = e.category_id
      WHERE DATE_TRUNC('month', e.created_at) = DATE_TRUNC('month', ${month + '-01'}::DATE)
      GROUP BY ec.category_name
      ORDER BY total_amount DESC
    `
  } else if (from && to) {
    rows = await prisma.$queryRaw<any[]>`
      SELECT ec.category_name, COUNT(*) AS transaction_count, SUM(e.amount) AS total_amount
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.category_id = e.category_id
      WHERE e.created_at BETWEEN ${new Date(from)} AND ${new Date(to)}
      GROUP BY ec.category_name
      ORDER BY total_amount DESC
    `
  } else {
    rows = await prisma.$queryRaw<any[]>`
      SELECT ec.category_name, COUNT(*) AS transaction_count, SUM(e.amount) AS total_amount
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.category_id = e.category_id
      GROUP BY ec.category_name
      ORDER BY total_amount DESC
    `
  }

  return NextResponse.json(rows)
})