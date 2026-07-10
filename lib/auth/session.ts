"use server"

import { cookies } from "next/headers"
import { PosUser } from "@/lib/types/user"
import { signSessionValue, verifySessionValue } from "@/lib/auth/signed-cookie"

const SESSION_COOKIE_NAME = "pos_user_session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Store user session in cookie (HMAC-signed so it can't be forged)
export async function setUserSession(user: PosUser) {
  const cookieStore = await cookies()

  const sessionData = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }

  cookieStore.set(SESSION_COOKIE_NAME, signSessionValue(sessionData), {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  })
}

// Get user session from cookie
export async function getUserSession(): Promise<PosUser | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return null
  }

  try {
    // Reject tampered or unsigned (legacy) cookies
    const sessionData = verifySessionValue<{ userId: string }>(sessionCookie.value)
    if (!sessionData?.userId) {
      await clearUserSession()
      return null
    }

    // Fetch full user data from database to ensure it's still valid
    const { getUserById } = await import("@/lib/db/users")
    const user = await getUserById(sessionData.userId)

    if (!user || !user.is_active) {
      // Clear invalid session
      await clearUserSession()
      return null
    }

    return user
  } catch {
    return null
  }
}

// Clear user session
export async function clearUserSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
