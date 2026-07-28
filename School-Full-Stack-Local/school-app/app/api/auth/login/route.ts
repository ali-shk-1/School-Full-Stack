import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      )
    }

    const user = await prisma.users.findUnique({
      where: { username },
      include: { roles: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Account is disabled. Contact administrator.' },
        { status: 403 }
      )
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
    }

    await prisma.users.update({
      where: { user_id: user.user_id },
      data: { last_login: new Date() },
    })

    const token = signToken({
      user_id: user.user_id,
      username: user.username,
      role: user.roles?.role_name ?? '',
      staff_id: user.staff_id,
    })

    return NextResponse.json({
      message: 'Login successful.',
      token,
      user: { user_id: user.user_id, username: user.username, role: user.roles?.role_name },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}