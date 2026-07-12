import { requireRole } from "@/lib/auth/roles"
import { getBookerLedger } from "@/lib/db/recovery"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CurrencyDisplay } from "@/components/currency-display"

export default async function BookerUdhaarPage() {
  const user = await requireRole(["booker"])
  const ledger = await getBookerLedger(user.booker_id!)

  if (!ledger) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Your login is not linked to a booker. Please contact your admin.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">My Udhaar</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Outstanding credit for all your parties
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Sales</p>
            <p className="text-lg font-semibold"><CurrencyDisplay amount={ledger.totals.sales} /></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Recovered</p>
            <p className="text-lg font-semibold text-green-600"><CurrencyDisplay amount={ledger.totals.collected} /></p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
            <p className="text-lg font-semibold text-orange-600"><CurrencyDisplay amount={ledger.totals.outstanding} /></p>
          </CardContent>
        </Card>
      </div>

      {/* Party-wise udhaar */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base">Party-wise Udhaar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ledger.parties.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No outstanding udhaar</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground bg-muted/40">
                    <th className="py-2 px-4 font-medium">Party</th>
                    <th className="py-2 px-4 font-medium hidden sm:table-cell">Phone</th>
                    <th className="py-2 px-4 font-medium text-right">Total Sales</th>
                    <th className="py-2 px-4 font-medium text-right">Recovered</th>
                    <th className="py-2 px-4 font-medium text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.parties
                    .filter((p) => p.outstanding > 0)
                    .sort((a, b) => b.outstanding - a.outstanding)
                    .map((party) => (
                      <tr key={party.partyId} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2.5 px-4 font-medium">{party.name}</td>
                        <td className="py-2.5 px-4 text-muted-foreground hidden sm:table-cell">{party.phone || "—"}</td>
                        <td className="py-2.5 px-4 text-right"><CurrencyDisplay amount={party.totalSales} /></td>
                        <td className="py-2.5 px-4 text-right text-green-600"><CurrencyDisplay amount={party.totalCollected} /></td>
                        <td className="py-2.5 px-4 text-right font-semibold text-orange-600">
                          <CurrencyDisplay amount={party.outstanding} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent invoices */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base">Recent Sales</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ledger.recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No sales yet</p>
          ) : (
            <div className="divide-y">
              {ledger.recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/20">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inv.partyName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString()} · #{inv.id.substring(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={inv.status === "Paid" ? "default" : "secondary"}>{inv.status}</Badge>
                    <span className="text-sm font-semibold"><CurrencyDisplay amount={inv.total} /></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
