import { getAdminSessionOrRedirect } from "@/lib/auth"
import { getAllPosUsers } from "@/lib/db/users"
import { SystemInvoiceClient } from "./system-invoice-client"
import { getSystemInvoices } from "./actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InvoiceListActions } from "./invoice-list-actions"

export default async function SystemInvoicesPage() {
  await getAdminSessionOrRedirect("/admin/login")
  const [users, { data: invoices }] = await Promise.all([
    getAllPosUsers(),
    getSystemInvoices(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">System Invoices</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate and manage subscription invoices for POS clients</p>
      </div>

      <SystemInvoiceClient
        users={users.map((u) => ({ id: u.id, name: u.name || u.email, email: u.email }))}
      />

      {/* Saved Invoices List */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Saved Invoices ({invoices.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice #</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-primary">{inv.invoice_no}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{inv.client_name}</div>
                        <div className="text-xs text-muted-foreground">{inv.client_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{inv.plan}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.period}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        PKR {Number(inv.amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(inv.created_at).toLocaleDateString("en-PK")}
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceListActions invoice={inv} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
