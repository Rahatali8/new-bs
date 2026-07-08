import { requirePrivilege } from "@/lib/auth/privileges"
import AddBookerForm from "../add-booker-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AddBookerPage() {
  await requirePrivilege("parties")

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/bookers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Add New Booker</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Create a new booker / order taker.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Booker Information</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <AddBookerForm />
        </CardContent>
      </Card>
    </div>
  )
}
