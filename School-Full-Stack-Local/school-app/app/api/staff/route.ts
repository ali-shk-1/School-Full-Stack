import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth'

// GET /api/staff — list all staff
export const GET = withAuth(async () => {
  const staff = await prisma.staff.findMany({
    include: { designations: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(staff)
})

// POST /api/staff — create staff member
export const POST = withAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const { name, staff_code, cnic, phone_no, salary, designation_id } = body

    if (!name || !staff_code || !cnic) {
      return NextResponse.json(
        { error: 'name, staff_code, and cnic are required.' },
        { status: 400 }
      )
    }

    const staff = await prisma.staff.create({
      data: { name, staff_code, cnic, phone_no, salary, designation_id },
    })

    return NextResponse.json({ message: 'Staff created.', staff }, { status: 201 })
  } catch (err: any) {
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