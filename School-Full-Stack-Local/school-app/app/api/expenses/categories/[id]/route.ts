import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/lib/auth'

export const DELETE = withRole(['admin'], async (_req, _user, ctx) => {
  const { id } = await ctx.params
  try {
    await prisma.expense_categories.delete({ where: { category_id: Number(id) } })
    return NextResponse.json({ message: 'Category deleted.' })
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 })
    }
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
})