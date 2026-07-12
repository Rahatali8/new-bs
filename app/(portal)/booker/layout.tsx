import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth/roles"
import { PortalHeader } from "@/components/portal-header"
import { Toaster } from "@/components/ui/sonner"

export default async function BookerLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["booker"])

  if (!user.booker_id) {
    // Login exists but not linked to a booker entity — nothing to show
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/40 to-background">
      <PortalHeader
        title="Booker Portal"
        roleLabel="Booker"
        userName={user.name || user.email}
        nav={[
          { href: "/booker", label: "Dashboard" },
          { href: "/booker/new-sale", label: "New Sale" },
          { href: "/booker/udhaar", label: "My Udhaar" },
        ]}
      />
      <div className="lg:ml-72">
        <main className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-5xl">{children}</main>
      </div>
      <Toaster />
    </div>
  )
}
