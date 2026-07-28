import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const authUser = getAuthUser(req)
  if (!authUser) {
    return NextResponse.json({ error: 'No token provided. Access denied.' }, { status: 401 })
  }

  const user = await prisma.users.findUnique({
    where: { user_id: authUser.user_id },
    include: { roles: true, staff: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  return NextResponse.json({
    user_id: user.user_id,
    username: user.username,
    role: user.roles?.role_name,
    staff_id: user.staff_id,
    last_login: user.last_login,
    created_at: user.created_at,
    staff_name: user.staff?.name ?? null,
  })
}