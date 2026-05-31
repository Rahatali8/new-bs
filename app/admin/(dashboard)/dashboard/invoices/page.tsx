import { getAdminSessionOrRedirect } from "@/lib/auth"
import { getAllPosUsers } from "@/lib/db/users"
import { SystemInvoiceClient } from "./system-invoice-client"

export default async function SystemInvoicesPage() {
  await getAdminSessionOrRedirect("/admin/login")
  const users = await getAllPosUsers()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">System Invoices</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate subscription invoices for POS clients</p>
      </div>
      <SystemInvoiceClient users={users.map((u) => ({ id: u.id, name: u.name || u.email, email: u.email }))} />
    </div>
  )
}
