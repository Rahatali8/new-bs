"use client"

import { useState, useTransition } from "react"
import { CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPartyPayment } from "@/app/(app)/parties/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PartyPaymentDialogProps {
  partyId: string
  partyName: string
  outstandingBalance: number
  trigger?: React.ReactNode
}

export function PartyPaymentDialog({ partyId, partyName, outstandingBalance, trigger }: PartyPaymentDialogProps) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("Cash")
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = () => {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    if (numAmount > outstandingBalance) {
      toast.error(`Amount cannot exceed outstanding balance PKR ${outstandingBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`)
      return
    }
    startTransition(async () => {
      const result = await createPartyPayment({ partyId, amount: numAmount, method })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Payment of PKR ${numAmount.toLocaleString("en-PK", { minimumFractionDigits: 2 })} recorded`)
      setOpen(false)
      setAmount("")
      setMethod("Cash")
      router.refresh()
    })
  }

  const defaultTrigger = (
    <Button variant="default" size="sm">
      <CreditCard className="w-4 h-4 mr-2" />
      Receive Payment
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive Payment</DialogTitle>
          <p className="text-sm text-muted-foreground">{partyName}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Outstanding Balance (read-only) */}
          <div className="space-y-1.5">
            <Label>Outstanding Balance</Label>
            <Input
              value={`PKR ${outstandingBalance.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              readOnly
              className="bg-muted text-muted-foreground cursor-not-allowed"
            />
          </div>

          {/* Receive Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="rcv-amount">Receive Amount</Label>
            <Input
              id="rcv-amount"
              type="number"
              min="0.01"
              step="0.01"
              max={outstandingBalance}
              placeholder="Enter amount received"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={pending}
              autoFocus
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod} disabled={pending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={pending || !amount}>
            {pending ? "Saving..." : "Add Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
