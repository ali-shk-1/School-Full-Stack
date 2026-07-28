import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/lib/auth'

export const PUT = withRole(['admin', 'accountant'], async (req: NextRequest, _user, ctx) => {
  const { id } = await ctx.params
  try {
    const { amount_paid } = await req.json()
    if (amount_paid == null) {
      return NextResponse.json({ error: 'amount_paid is required.' }, { status: 400 })
    }

    const payment = await prisma.fee_payments.update({
      where: { payment_id: Number(id) },
      data: { amount_paid, payment_date: new Date() },
    })

    return NextResponse.json({ message: 'Payment updated.', payment })
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 })
    }
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
})

export const DELETE = withRole(['admin'], async (_req, _user, ctx) => {
  const { id } = await ctx.params
  try {
    await prisma.fee_payments.delete({ where: { payment_id: Number(id) } })
    return NextResponse.json({ message: 'Payment deleted.' })
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 })
    }
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
})