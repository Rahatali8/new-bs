import Link from "next/link"
import { ShoppingCart, Wallet, TrendingUp, CalendarDays } from "lucide-react"
import { requireRole } from "@/lib/auth/roles"
import { getBookerLedger } from "@/lib/db/recovery"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CurrencyDisplay } from "@/components/currency-display"

export default async function BookerDashboardPage() {
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

  const stats = [
    { label: "Total Sales", value: ledger.totals.sales, icon: ShoppingCart },
    { label: "Recovered", value: ledger.totals.collected, icon: Wallet },
    { label: "Outstanding (Udhaar)", value: ledger.totals.outstanding, icon: TrendingUp },
    { label: "Today's Sales", value: ledger.todaySales, icon: CalendarDays },
  ]

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{ledger.booker.name}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Your sales, credit and recovery overview</p>
        </div>
        <Button asChild size="sm">
          <Link href="/booker/new-sale">New Sale</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{stat.label}</span>
                </div>
                <p className="text-lg sm:text-xl font-semibold">
                  <CurrencyDisplay amount={stat.value} />
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Party-wise Udhaar</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.parties.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No sales recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Party</th>
                    <th className="py-2 pr-4 font-medium">Phone</th>
                    <th className="py-2 pr-4 font-medium text-right">Sales</th>
                    <th className="py-2 pr-4 font-medium text-right">Recovered</th>
                    <th className="py-2 font-medium text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.parties.map((party) => (
                    <tr key={party.partyId} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{party.name}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{party.phone || "—"}</td>
                      <td className="py-2.5 pr-4 text-right"><CurrencyDisplay amount={party.totalSales} /></td>
                      <td className="py-2.5 pr-4 text-right text-green-600 dark:text-green-500"><CurrencyDisplay amount={party.totalCollected} /></td>
                      <td className="py-2.5 text-right font-semibold text-orange-600 dark:text-orange-500">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No sales yet</p>
          ) : (
            <div className="space-y-2">
              {ledger.recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
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
