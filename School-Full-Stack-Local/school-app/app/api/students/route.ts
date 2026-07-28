import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

// GET /api/students — list all students
export const GET = withAuth(async () => {
  const students = await prisma.students.findMany({
    orderBy: [{ class: 'asc' }, { section: 'asc' }, { roll_no: 'asc' }],
  })
  return NextResponse.json(students)
})

// POST /api/students — create a student
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const {
      roll_no, section, class: className, first_name, last_name,
      father_name, contact_1, contact_2, address, admission_date,
    } = body

    if (!roll_no || !section || !className || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'roll_no, section, class, first_name, and last_name are required.' },
        { status: 400 }
      )
    }

    const student = await prisma.students.create({
      data: {
        roll_no,
        section,
        class: className,
        first_name,
        last_name,
        father_name,
        contact_1,
        contact_2,
        address,
        admission_date: admission_date ? new Date(admission_date) : undefined,
      },
    })

    return NextResponse.json({ message: 'Student created.', student }, { status: 201 })
  } catch (err: any) {
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