import { requirePrivilege } from "@/lib/auth/privileges"
import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users } from "lucide-react"
import Link from "next/link"
import { BookerDialog, DeleteBookerButton } from "./booker-dialog"

export default async function BookersPage() {
  await requirePrivilege("parties")

  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: bookers = [] } = await supabase
    .from("bookers")
    .select("id, name, phone, address, created_at")
    .eq("user_id", currentUser.effectiveUserId)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Bookers</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage bookers / order takers.</p>
        </div>
        <Link href="/bookers/add">
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Booker
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Bookers ({bookers?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!bookers || bookers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No bookers yet.{" "}
              <Link href="/bookers/add" className="text-primary underline">
                Add your first booker
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Address</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookers.map((booker) => (
                    <tr key={booker.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{booker.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{booker.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground">{booker.address || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <BookerDialog booker={booker} />
                          <DeleteBookerButton bookerId={booker.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
