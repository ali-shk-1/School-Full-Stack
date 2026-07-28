import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRole } from '@/lib/auth'

export const GET = withAuth(async () => {
  const categories = await prisma.expense_categories.findMany({
    orderBy: { category_name: 'asc' },
  })
  return NextResponse.json(categories)
})

export const POST = withRole(['admin'], async (req: NextRequest) => {
  const { category_name } = await req.json()
  if (!category_name) {
    return NextResponse.json({ error: 'category_name is required.' }, { status: 400 })
  }
  const category = await prisma.expense_categories.create({ data: { category_name } })
  return NextResponse.json(category, { status: 201 })
})