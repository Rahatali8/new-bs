import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth/roles"
import { PortalHeader } from "@/components/portal-header"
import { Toaster } from "@/components/ui/sonner"

export default async function SalesmanLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["salesman"])

  if (!user.booker_id) {
    // Login exists but not linked to a booker — nothing to recover
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/40 to-background">
      <PortalHeader
        title="Recovery Portal"
        roleLabel="Salesman"
        userName={user.name || user.email}
        nav={[{ href: "/salesman", label: "Dashboard" }]}
      />
      <main className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">{children}</main>
      <Toaster />
    </div>
  )
}
