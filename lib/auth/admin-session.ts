"use server"

import { cookies } from "next/headers"
import { Admin } from "@/lib/types/admin"
import { signSessionValue, verifySessionValue } from "@/lib/auth/signed-cookie"

const ADMIN_SESSION_COOKIE_NAME = "admin_session"
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Store admin session in cookie (HMAC-signed so it can't be forged)
export async function setAdminSession(admin: Admin) {
  const cookieStore = await cookies()

  const sessionData = {
    adminId: admin.id,
    email: admin.email,
  }

  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, signSessionValue(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_SESSION_MAX_AGE,
    path: "/",
  })
}

// Get admin session from cookie
export async function getAdminSession(): Promise<Admin | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return null
  }

  try {
    // Reject tampered or unsigned (legacy) cookies
    const sessionData = verifySessionValue<{ adminId: string }>(sessionCookie.value)
    if (!sessionData?.adminId) {
      await clearAdminSession()
      return null
    }

    // Fetch full admin data from database to ensure it's still valid
    const { getAdminById } = await import("@/lib/db/admins")
    const admin = await getAdminById(sessionData.adminId)
    
    if (!admin || !admin.is_active) {
      // Clear invalid session
      await clearAdminSession()
      return null
    }

    return admin
  } catch {
    return null
  }
}

// Clear admin session
export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME)
}
