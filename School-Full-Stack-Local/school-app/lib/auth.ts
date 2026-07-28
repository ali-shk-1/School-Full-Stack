import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET as string
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'

export interface TokenPayload {
  user_id: number
  username: string
  role: string
  staff_id: number | null
}

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}

export function getAuthUser(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.split(' ')[1]
  try {
    return verifyToken(token)
  } catch {
    return null
  }
}

type RouteContext = { params: Promise<Record<string, string>> }

export function withAuth(
  handler: (req: NextRequest, user: TokenPayload, ctx: RouteContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: RouteContext) => {
    const user = getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'No token provided. Access denied.' }, { status: 401 })
    }
    return handler(req, user, ctx)
  }
}

export function withRole(
  roles: string[],
  handler: (req: NextRequest, user: TokenPayload, ctx: RouteContext) => Promise<NextResponse>
) {
  return withAuth(async (req, user, ctx) => {
    if (!roles.includes(user.role)) {
      return NextResponse.json(
        { error: `Access denied. Required role(s): ${roles.join(', ')}.` },
        { status: 403 }
      )
    }
    return handler(req, user, ctx)
  })
}