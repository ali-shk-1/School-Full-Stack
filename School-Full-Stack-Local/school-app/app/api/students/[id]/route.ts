import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

export const GET = withAuth(async (_req, _user, ctx) => {
  const { id } = await ctx.params
  const student = await prisma.students.findUnique({
    where: { student_id: Number(id) },
    include: { fee_payments: true },
  })
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
  return NextResponse.json(student)
})

export const PUT = withAuth(async (req, _user, ctx) => {
  const { id } = await ctx.params
  try {
    const body = await req.json()
    const {
      roll_no, section, class: className, first_name, last_name,
      father_name, contact_1, contact_2, address, admission_date,
    } = body

    const student = await prisma.students.update({
      where: { student_id: Number(id) },
      data: {
        roll_no, section, class: className, first_name, last_name,
        father_name, contact_1, contact_2, address,
        admission_date: admission_date ? new Date(admission_date) : undefined,
      },
    })

    return NextResponse.json({ message: 'Student updated.', student })
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
    }
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'A student with this roll_no, section, and class already exists.' },
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
    await prisma.students.delete({ where: { student_id: Number(id) } })
    return NextResponse.json({ message: 'Student deleted.' })
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
    }
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
})