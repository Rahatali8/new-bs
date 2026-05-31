"use client"

import { useState, useTransition } from "react"
import { Printer, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteSystemInvoice } from "./actions"
import { printSystemInvoice } from "./print-system-invoice"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function InvoiceListActions({ invoice }: { invoice: any }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const handleReprint = () => {
    printSystemInvoice({
      invoiceNo: invoice.invoice_no,
      clientName: invoice.client_name,
      clientEmail: invoice.client_email,
      plan: invoice.plan,
      period: invoice.period,
      amount: Number(invoice.amount),
      notes: invoice.notes || undefined,
      date: new Date(invoice.created_at).toLocaleDateString("en-PK"),
    })
  }

  const handleDelete = () => {
    if (!confirm(`Delete invoice ${invoice.invoice_no}?`)) return
    startTransition(async () => {
      const result = await deleteSystemInvoice(invoice.id)
      if (result.error) { toast.error(result.error); return }
      toast.success("Invoice deleted")
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={handleReprint} title="Reprint">
        <Printer className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleDelete} disabled={pending} title="Delete" className="text-destructive hover:text-destructive">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )
}
