"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { HandCoins } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CurrencyDisplay } from "@/components/currency-display"
import { recordCollection } from "@/app/(portal)/salesman/actions"
import { toast } from "sonner"

const PAYMENT_METHODS = ["Cash", "Card", "JazzCash", "EasyPaisa", "Other"]

interface RecordCollectionDialogProps {
  parties: Array<{ partyId: string; name: string; outstanding: number }>
}

export function RecordCollectionDialog({ parties }: RecordCollectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [partyId, setPartyId] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("Cash")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const selectedParty = parties.find((p) => p.partyId === partyId)

  const handleSubmit = () => {
    const numAmount = Number(amount)
    if (!partyId) {
      toast.error("Select a party")
      return
    }
    if (!numAmount || numAmount <= 0) {
      toast.error("Enter a valid amount")
      return
    }

    startTransition(async () => {
      const result = await recordCollection({ partyId, amount: numAmount, method })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Collection recorded")
        setOpen(false)
        setPartyId("")
        setAmount("")
        setMethod("Cash")
        router.refresh()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <HandCoins className="w-4 h-4 mr-2" />
          Record Collection
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Party *</Label>
            <Select value={partyId} onValueChange={setPartyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select party" />
              </SelectTrigger>
              <SelectContent>
                {parties.map((p) => (
                  <SelectItem key={p.partyId} value={p.partyId}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedParty && (
              <p className="text-xs text-muted-foreground">
                Outstanding: <CurrencyDisplay amount={selectedParty.outstanding} className="font-semibold text-orange-600" />
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="collection-amount">Amount *</Label>
            <Input
              id="collection-amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving..." : "Save Collection"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
