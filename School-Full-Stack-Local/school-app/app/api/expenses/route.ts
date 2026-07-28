import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRole } from '@/lib/auth'

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const category_id = searchParams.get('category_id')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const month = searchParams.get('month')

  const where: any = {}
  if (category_id) where.category_id = Number(category_id)

  if (month) {
    const start = new Date(`${month}-01`)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    where.created_at = { gte: start, lt: end }
  } else {
    if (from || to) {
      where.created_at = {}
      if (from) where.created_at.gte = new Date(from)
      if (to) where.created_at.lte = new Date(to)
    }
  }

  const expenses = await prisma.expenses.findMany({
    where,
    include: { expense_categories: true },
    orderBy: { created_at: 'desc' },
  })

  const shaped = expenses.map(e => ({
    ...e,
    category_name: e.expense_categories?.category_name ?? null,
  }))

  return NextResponse.json({ count: shaped.length, expenses: shaped })
})

export const POST = withRole(['admin', 'accountant'], async (req: NextRequest) => {
  const { category_id, amount, description, created_at } = await req.json()

  if (!amount) return NextResponse.json({ error: 'amount is required.' }, { status: 400 })
  if (isNaN(parseFloat(amount))) {
    return NextResponse.json({ error: 'amount must be a number.' }, { status: 400 })
  }

  const expense = await prisma.expenses.create({
    data: {
      category_id: category_id || null,
      amount,
      description: description || null,
      created_at: created_at ? new Date(created_at) : new Date(),
    },
  })

  return NextResponse.json({ message: 'Expense recorded.', expense }, { status: 201 })
})