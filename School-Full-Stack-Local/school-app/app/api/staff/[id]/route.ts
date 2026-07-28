import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (_req, _user, ctx) => {
  const { id } = await ctx.params
  const staff = await prisma.staff.findUnique({
    where: { staff_id: Number(id) },
    include: { designations: true },
  })
  if (!staff) return NextResponse.json({ error: 'Staff not found.' }, { status: 404 })
  return NextResponse.json(staff)
})

export const PUT = withAuth(async (req: NextRequest, _user, ctx) => {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const { name, staff_code, cnic, phone_no, salary, designation_id } = body

    const staff = await prisma.staff.update({
      where: { staff_id: Number(id) },
      data: { name, staff_code, cnic, phone_no, salary, designation_id },
    })

    return NextResponse.json({ message: 'Staff updated.', staff })
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Staff not found.' }, { status: 404 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'A staff member with this CNIC or name+staff_code already exists.' },
        { status: 409 }
      )
    }
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (_req, _user, ctx) => {
  const { id } = await ctx.params
  try {
    await prisma.staff.delete({ where: { staff_id: Number(id) } })
    return NextResponse.json({ message: 'Staff deleted.' })
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Staff not found.' }, { status: 404 })
    }
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
})