import { redirect } from "next/navigation"
import { getSessionOrRedirect } from "@/lib/auth"
import { PosUser, UserRole } from "@/lib/types/user"

// Where each role lands after login (and where they get sent when they wander)
export function roleHomePath(role: UserRole): string {
  switch (role) {
    case "booker":
      return "/booker"
    case "salesman":
      return "/salesman"
    default:
      return "/dashboard"
  }
}

// Require one of the given roles; otherwise send the user to their own portal
export async function requireRole(roles: UserRole[]): Promise<PosUser> {
  const user = await getSessionOrRedirect()

  if (!roles.includes(user.role)) {
    redirect(roleHomePath(user.role))
  }

  return user
}
