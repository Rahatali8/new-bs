import { Wallet, TrendingUp, CalendarDays, UserCheck } from "lucide-react"
import { requireRole } from "@/lib/auth/roles"
import { getBookerLedger, getCollections } from "@/lib/db/recovery"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencyDisplay } from "@/components/currency-display"
import { RecordCollectionDialog } from "@/components/record-collection-dialog"

export default async function SalesmanDashboardPage() {
  const user = await requireRole(["salesman"])

  const [ledger, myTodayCollections] = await Promise.all([
    getBookerLedger(user.booker_id!),
    getCollections({ collectedBy: user.id, todayOnly: true }),
  ])

  if (!ledger) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Your login is not linked to a booker. Please contact your admin.
        </CardContent>
      </Card>
    )
  }

  const myTodayTotal = myTodayCollections.reduce((s, c) => s + c.amount, 0)
  const outstandingParties = ledger.parties.filter((p) => p.outstanding > 0)

  const stats: Array<{ label: string; icon: typeof Wallet; value: number; text?: string }> = [
    { label: "Booker", value: 0, text: ledger.booker.name, icon: UserCheck },
    { label: "Total Outstanding", value: ledger.totals.outstanding, icon: TrendingUp },
    { label: "Total Recovered", value: ledger.totals.collected, icon: Wallet },
    { label: "My Collections Today", value: myTodayTotal, icon: CalendarDays },
  ]

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Recovery — {ledger.booker.name}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Collect udhaar from your booker's parties</p>
        </div>
        <RecordCollectionDialog
          parties={outstandingParties.map((p) => ({ partyId: p.partyId, name: p.name, outstanding: p.outstanding }))}
        />
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
                <p className="text-lg sm:text-xl font-semibold truncate">
                  {stat.text !== undefined ? stat.text : <CurrencyDisplay amount={stat.value} />}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parties to Recover From</CardTitle>
        </CardHeader>
        <CardContent>
          {outstandingParties.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No outstanding udhaar — all recovered!</p>
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
                  {outstandingParties.map((party) => (
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
          <CardTitle className="text-base">Today's Collections</CardTitle>
        </CardHeader>
        <CardContent>
          {myTodayCollections.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No collections recorded today</p>
          ) : (
            <div className="space-y-2">
              {myTodayCollections.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.partyName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleTimeString()} · {c.method}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-500">
                    <CurrencyDisplay amount={c.amount} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
