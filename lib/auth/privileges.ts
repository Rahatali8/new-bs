"use server"

import { redirect } from "next/navigation"
import { getSessionOrRedirect } from "@/lib/auth"
import { roleHomePath } from "@/lib/auth/roles"
import { ModulePrivilege } from "@/lib/types/user"

// Check if user has a specific privilege, redirect if not
export async function requirePrivilege(privilege: ModulePrivilege, redirectTo: string = "/dashboard") {
  const user = await getSessionOrRedirect()

  // Admin users (pos_user) have all privileges by default
  if (user.role === "pos_user") {
    return user
  }

  // Booker/salesman logins use their own portals, not module privileges
  if (user.role === "booker" || user.role === "salesman") {
    redirect(roleHomePath(user.role))
  }

  // user_management is only for admin users (already handled above)
  if (privilege === "user_management") {
    redirect(redirectTo)
  }

  // Check if user has the required privilege
  if (!user.privileges[privilege]) {
    redirect(redirectTo)
  }

  return user
}

// Check if user has privilege (returns boolean, doesn't redirect)
export async function hasPrivilege(privilege: ModulePrivilege): Promise<boolean> {
  const user = await getSessionOrRedirect()

  // Admin users (pos_user) have all privileges by default
  if (user.role === "pos_user") {
    return true
  }

  // Booker/salesman logins don't use module privileges
  if (user.role === "booker" || user.role === "salesman") {
    return false
  }

  // user_management is only for admin users (already handled above)
  if (privilege === "user_management") {
    return false
  }

  return user.privileges[privilege] === true
}
