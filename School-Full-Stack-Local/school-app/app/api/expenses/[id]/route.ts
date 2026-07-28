import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRole } from '@/lib/auth'

export const GET = withAuth(async (_req, _user, ctx) => {
  const { id } = await ctx.params
  const expense = await prisma.expenses.findUnique({
    where: { expense_id: Number(id) },
    include: { expense_categories: true },
  })
  if (!expense) return NextResponse.json({ error: 'Expense not found.' }, { status: 404 })
  return NextResponse.json({ ...expense, category_name: expense.expense_categories?.category_name ?? null })
})

export const PUT = withRole(['admin', 'accountant'], async (req: NextRequest, _user, ctx) => {
  const { id } = await ctx.params
  try {
    const { category_id, amount, description, created_at } = await req.json()
    if (!amount) return NextResponse.json({ error: 'amount is required.' }, { status: 400 })

    const expense = await prisma.expenses.update({
      where: { expense_id: Number(id) },
      data: {
        category_id: category_id || null,
        amount,
        description: description || null,
        created_at: created_at ? new Date(created_at) : new Date(),
      },
    })

    return NextResponse.json({ message: 'Expense updated.', expense })
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Expense not found.' }, { status: 404 })
    }
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
})

export const DELETE = withRole(['admin'], async (_req, _user, ctx) => {
  const { id } = await ctx.params
  try {
    await prisma.expenses.delete({ where: { expense_id: Number(id) } })
    return NextResponse.json({ message: 'Expense deleted.' })
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Expense not found.' }, { status: 404 })
    }
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
})