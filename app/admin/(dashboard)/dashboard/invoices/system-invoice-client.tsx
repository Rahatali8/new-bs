"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Download, FileText } from "lucide-react"
import { printSystemInvoice } from "./print-system-invoice"

interface UserOption {
  id: string
  name: string
  email: string
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const PLANS = [
  "Basic Plan",
  "Standard Plan",
  "Professional Plan",
  "Enterprise Plan",
  "Custom Plan",
]

export function SystemInvoiceClient({ users }: { users: UserOption[] }) {
  const currentDate = new Date()
  const [userId, setUserId] = useState("")
  const [plan, setPlan] = useState(PLANS[1])
  const [amount, setAmount] = useState("")
  const [month, setMonth] = useState(MONTHS[currentDate.getMonth()])
  const [year, setYear] = useState(String(currentDate.getFullYear()))
  const [notes, setNotes] = useState(
    "This invoice is valid for one (1) month from the issue date. Please ensure timely renewal before the due date to avoid any service interruption. Failure to renew within the grace period may result in automatic suspension of your system access. For renewals or queries, contact us promptly."
  )
  const [billingEmail, setBillingEmail] = useState("")
  const [invoiceNo, setInvoiceNo] = useState(() => `INV-${Date.now().toString(36).toUpperCase()}`)

  const selectedUser = users.find((u) => u.id === userId)
  const effectiveEmail = billingEmail.trim() || selectedUser?.email || ""

  const handleGenerate = () => {
    if (!userId || !amount || !plan) return
    printSystemInvoice({
      invoiceNo,
      clientName: selectedUser?.name || "",
      clientEmail: effectiveEmail,
      plan,
      period: `${month} ${year}`,
      amount: parseFloat(amount),
      notes,
      date: new Date().toLocaleDateString("en-PK"),
    })
    // Refresh invoice number for next use
    setInvoiceNo(`INV-${Date.now().toString(36).toUpperCase()}`)
  }

  const years = Array.from({ length: 5 }, (_, i) => String(currentDate.getFullYear() - 1 + i))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* FORM */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="space-y-1.5">
            <Label>Invoice No</Label>
            <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Client (POS User) <span className="text-destructive">*</span></Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} — {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Billing Email{" "}
              <span className="text-muted-foreground text-xs">(optional — overrides registered email)</span>
            </Label>
            <Input
              type="email"
              placeholder={selectedUser?.email || "Enter alternate billing email..."}
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Subscription Plan <span className="text-destructive">*</span></Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Amount (PKR) <span className="text-destructive">*</span></Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 2500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              placeholder="Any additional notes for the client..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            disabled={!userId || !amount || !plan}
            onClick={handleGenerate}
          >
            <Download className="w-4 h-4 mr-2" />
            Generate &amp; Download Invoice
          </Button>
        </CardContent>
      </Card>

      {/* PREVIEW SUMMARY */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {!userId || !amount ? (
            <p className="text-sm text-muted-foreground">Fill in the form to see preview.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Invoice No</span>
                <span className="font-mono font-semibold">{invoiceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">{selectedUser?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className={billingEmail.trim() ? "text-primary font-medium" : ""}>
                  {effectiveEmail}
                  {billingEmail.trim() && <span className="text-xs text-muted-foreground ml-1">(billing)</span>}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span>{plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Period</span>
                <span>{month} {year}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-lg font-bold text-primary">
                  PKR {parseFloat(amount || "0").toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {notes && (
                <div className="bg-muted rounded p-2 text-xs text-muted-foreground mt-2">
                  {notes}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
