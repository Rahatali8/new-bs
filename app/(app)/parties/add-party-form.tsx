"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { createParty } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface BookerOption {
  id: string
  name: string
  phone: string | null
}

const initialState = { error: "" }

export default function AddPartyForm({ bookers = [] }: { bookers?: BookerOption[] }) {
  const router = useRouter()
  const prevPendingRef = useRef(false)
  const [hasBalance, setHasBalance] = useState(false)
  const [partyType, setPartyType] = useState("Customer")

  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await createParty(formData)
      return { error: result?.error || "" }
    },
    initialState,
  )

  useEffect(() => {
    if (prevPendingRef.current && !pending && !state.error) {
      toast.success("Party created successfully!")
      router.push("/parties")
    }
    prevPendingRef.current = pending
  }, [pending, state.error, router])

  const showBalanceSection = hasBalance && partyType === "Customer"

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Acme Corp" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" placeholder="9876543210" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" placeholder="123 Main Street, City" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select
          name="type"
          defaultValue="Customer"
          onValueChange={(v) => {
            setPartyType(v)
            if (v !== "Customer") setHasBalance(false)
          }}
        >
          <SelectTrigger id="type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Customer">Customer</SelectItem>
            <SelectItem value="Vendor">Vendor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Starting Balance — only for customers */}
      {partyType === "Customer" && (
        <div className="rounded-lg border border-dashed border-border p-4 space-y-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <Checkbox
              id="has_balance"
              checked={hasBalance}
              onCheckedChange={(v) => setHasBalance(!!v)}
            />
            <Label htmlFor="has_balance" className="cursor-pointer font-medium">
              Has existing outstanding balance (udhaar)
            </Label>
          </div>

          {showBalanceSection && (
            <>
              <input type="hidden" name="has_starting_balance" value="true" />
              <div className="space-y-2">
                <Label htmlFor="starting_balance">Starting Balance (PKR)</Label>
                <Input
                  id="starting_balance"
                  name="starting_balance"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="e.g. 15000"
                  required={showBalanceSection}
                />
                <p className="text-xs text-muted-foreground">
                  This amount will be added as an outstanding invoice for recovery.
                </p>
              </div>
              {bookers.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="starting_booker_id">Assign to Booker (optional)</Label>
                  <select
                    id="starting_booker_id"
                    name="starting_booker_id"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- No booker (unassigned) --</option>
                    {bookers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}{b.phone ? ` · ${b.phone}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Assigning a booker will include this balance in their recovery sheet.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Save party"}
      </Button>
    </form>
  )
}
