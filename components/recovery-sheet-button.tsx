"use client"

import { useState } from "react"
import { Printer, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { getBookerRecoverySheet, type BookerRecoverySheet } from "@/lib/db/recovery"

interface BookerOption {
  bookerId: string
  name: string
  phone: string
}

interface RecoverySheetButtonProps {
  bookers: BookerOption[]
}

function fmt(amount: number) {
  return "PKR " + amount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildPrintHtml(sheet: BookerRecoverySheet): string {
  const today = new Date().toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  const rows = sheet.invoices
    .map(
      (inv, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${inv.invoiceNumber}</td>
        <td>${inv.partyName}</td>
        <td class="center">${inv.phone ?? "—"}</td>
        <td class="center">${new Date(inv.date).toLocaleDateString("en-PK")}</td>
        <td class="right">${fmt(inv.total)}</td>
        <td class="right">${fmt(inv.paid)}</td>
        <td class="right outstanding">${fmt(inv.outstanding)}</td>
        <td class="recovered-cell"></td>
        <td class="notes-cell"></td>
      </tr>`
    )
    .join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Recovery Sheet – ${sheet.booker.name}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #111; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #333; }
  .header-left h1 { font-size: 16px; font-weight: bold; }
  .header-left p { font-size: 10px; color: #555; margin-top: 2px; }
  .header-right { text-align: right; font-size: 10px; color: #333; }
  .header-right strong { font-size: 12px; display: block; margin-bottom: 2px; }
  .meta { display: flex; gap: 20px; margin-bottom: 10px; font-size: 10px; }
  .meta span { background: #f3f4f6; padding: 3px 8px; border-radius: 4px; }
  .meta strong { color: #111; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  thead tr { background: #1e293b; color: #fff; }
  thead th { padding: 5px 6px; text-align: left; font-size: 9px; font-weight: 600; letter-spacing: 0.3px; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody tr { border-bottom: 1px solid #e2e8f0; }
  td { padding: 5px 6px; font-size: 9.5px; vertical-align: middle; }
  .center { text-align: center; }
  .right { text-align: right; }
  .outstanding { color: #b45309; font-weight: bold; }
  .recovered-cell { width: 90px; border-right: 1px dashed #94a3b8; }
  .notes-cell { width: 100px; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px; padding-top: 8px; border-top: 2px solid #333; }
  .total-box { background: #1e293b; color: #fff; padding: 6px 14px; border-radius: 6px; font-size: 11px; }
  .total-box span { font-size: 14px; font-weight: bold; }
  .sig { font-size: 9px; color: #555; text-align: right; }
  .sig-line { border-top: 1px solid #333; width: 140px; margin-top: 24px; margin-left: auto; }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <h1>Recovery Sheet</h1>
    <p>Outstanding credit collections — hand to salesman before field visit</p>
  </div>
  <div class="header-right">
    <strong>Date: ${today}</strong>
    <span>Booker: ${sheet.booker.name}${sheet.booker.phone ? " · " + sheet.booker.phone : ""}</span>
  </div>
</div>

<div class="meta">
  <span><strong>${sheet.invoices.length}</strong> outstanding invoices</span>
  <span>Total Outstanding: <strong>${fmt(sheet.totalOutstanding)}</strong></span>
</div>

<table>
  <thead>
    <tr>
      <th style="width:28px">#</th>
      <th style="width:72px">Invoice #</th>
      <th>Customer</th>
      <th style="width:88px">Phone</th>
      <th style="width:72px">Date</th>
      <th style="width:82px">Sale Amt</th>
      <th style="width:72px">Paid</th>
      <th style="width:82px">Outstanding</th>
      <th style="width:90px">Recovered ✓</th>
      <th style="width:100px">Notes</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>

<div class="footer">
  <div class="total-box">
    Total Outstanding: <span>${fmt(sheet.totalOutstanding)}</span>
  </div>
  <div class="sig">
    <div>Salesman Signature</div>
    <div class="sig-line"></div>
  </div>
</div>
</body>
</html>`
}

export function RecoverySheetButton({ bookers }: RecoverySheetButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedBookerId, setSelectedBookerId] = useState("")
  const [loading, setLoading] = useState(false)

  async function handlePrint() {
    if (!selectedBookerId) return
    setLoading(true)
    try {
      const sheet = await getBookerRecoverySheet(selectedBookerId)
      if (!sheet) {
        alert("Could not load recovery data.")
        return
      }
      if (sheet.invoices.length === 0) {
        alert("No outstanding invoices for this booker.")
        return
      }
      const html = buildPrintHtml(sheet)
      const w = window.open("", "_blank", "width=1100,height=700")
      if (w) {
        w.document.write(html)
        w.document.close()
        w.focus()
        setTimeout(() => w.print(), 400)
      }
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  if (bookers.length === 0) return null

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Printer className="w-4 h-4" />
        Print Recovery Sheet
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Print Recovery Sheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Select Booker</Label>
            <select
              value={selectedBookerId}
              onChange={(e) => setSelectedBookerId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">-- Select Booker --</option>
              {bookers.map((b) => (
                <option key={b.bookerId} value={b.bookerId}>
                  {b.name}{b.phone ? ` · ${b.phone}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Sheet will show all outstanding invoices for the selected booker, ready to give to salesman.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handlePrint} disabled={!selectedBookerId || loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              {loading ? "Loading..." : "Print Sheet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
