import { Wallet, TrendingUp, HandCoins, UserCheck } from "lucide-react"
import { getRecoverySummary } from "./actions"
import { getCollections } from "@/lib/db/recovery"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CurrencyDisplay } from "@/components/currency-display"

export default async function RecoveryPage() {
  const [summary, recentCollections] = await Promise.all([getRecoverySummary(), getCollections()])

  const stats = [
    { label: "Today's Recovery", value: summary.todayRecovery, icon: HandCoins },
    { label: "Total Outstanding", value: summary.totalOutstanding, icon: TrendingUp },
    { label: "Total Collected", value: summary.totalCollected, icon: Wallet },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">Recovery</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Booker-wise udhaar and salesman collections at a glance
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{stat.label}</span>
                </div>
                <p className="text-xl font-semibold">
                  <CurrencyDisplay amount={stat.value} />
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Booker-wise Udhaar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.bookers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No bookers yet — add bookers from Parties → Bookers
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Booker</th>
                    <th className="py-2 pr-4 font-medium">Phone</th>
                    <th className="py-2 pr-4 font-medium text-right">Total Sales</th>
                    <th className="py-2 pr-4 font-medium text-right">Recovered</th>
                    <th className="py-2 pr-4 font-medium text-right">Outstanding</th>
                    <th className="py-2 font-medium text-right">Today</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.bookers.map((b) => (
                    <tr key={b.bookerId} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{b.name}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{b.phone}</td>
                      <td className="py-2.5 pr-4 text-right"><CurrencyDisplay amount={b.totalSales} /></td>
                      <td className="py-2.5 pr-4 text-right text-green-600 dark:text-green-500"><CurrencyDisplay amount={b.totalCollected} /></td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-orange-600 dark:text-orange-500">
                        <CurrencyDisplay amount={b.outstanding} />
                      </td>
                      <td className="py-2.5 text-right"><CurrencyDisplay amount={b.todayCollected} /></td>
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
          <CardTitle className="text-base flex items-center gap-2">
            <HandCoins className="w-4 h-4" />
            Salesman Collections
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.salesmen.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No salesman logins yet — create them from User Management
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Salesman</th>
                    <th className="py-2 pr-4 font-medium">Booker</th>
                    <th className="py-2 pr-4 font-medium text-right">Today's Collection</th>
                    <th className="py-2 font-medium text-right">Total Collection</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.salesmen.map((s) => (
                    <tr key={s.userId} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        <span className="font-medium">{s.name}</span>
                        {!s.isActive && (
                          <Badge variant="secondary" className="ml-2">Inactive</Badge>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{s.bookerName}</td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-green-600 dark:text-green-500">
                        <CurrencyDisplay amount={s.todayCollected} />
                      </td>
                      <td className="py-2.5 text-right"><CurrencyDisplay amount={s.totalCollected} /></td>
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
          <CardTitle className="text-base">Recent Collections</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCollections.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No collections recorded yet</p>
          ) : (
            <div className="space-y-2">
              {recentCollections.slice(0, 20).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.partyName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {new Date(c.created_at).toLocaleString()} · {c.method} · Booker: {c.bookerName} · By: {c.collectorName}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-500 shrink-0">
                    <CurrencyDisplay amount={c.amount} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
