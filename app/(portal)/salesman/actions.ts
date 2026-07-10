"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"

// Record a recovery collection from a party against the linked booker's credit
// invoices (oldest first). Only salesman logins can use this.
export async function recordCollection(payload: {
  partyId: string
  amount: number
  method: string
  reference?: string
}) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (currentUser.role !== "salesman" || !currentUser.booker_id) {
    return { error: "Only salesman accounts can record collections" }
  }

  if (!payload.partyId || !payload.amount || payload.amount <= 0) {
    return { error: "Valid party and amount required" }
  }

  const bookerId = currentUser.booker_id

  // Outstanding invoices for this party under the linked booker, oldest first
  const { data: invoices } = await supabase
    .from("sales_invoices")
    .select("id, total, status")
    .eq("party_id", payload.partyId)
    .eq("user_id", currentUser.effectiveUserId)
    .eq("booker_id", bookerId)
    .in("status", ["Pending", "Credit", "Draft"])
    .order("created_at", { ascending: true })

  if (!invoices || invoices.length === 0) {
    return { error: "No outstanding invoices for this party" }
  }

  const invoiceIds = invoices.map((i) => i.id)
  const { data: existingPayments } = await supabase
    .from("payments")
    .select("invoice_id, amount")
    .in("invoice_id", invoiceIds)

  const invoiceBalances = invoices
    .map((inv) => {
      const paid = (existingPayments || [])
        .filter((p) => p.invoice_id === inv.id)
        .reduce((s, p) => s + Number(p.amount || 0), 0)
      return { id: inv.id, total: Number(inv.total || 0), remaining: Number(inv.total || 0) - paid }
    })
    .filter((i) => i.remaining > 0)

  const totalOutstanding = invoiceBalances.reduce((s, i) => s + i.remaining, 0)
  if (payload.amount > totalOutstanding) {
    return { error: `Amount exceeds party outstanding (${totalOutstanding.toFixed(2)})` }
  }

  // Cascade the collection across invoices oldest-first
  let remaining = payload.amount
  for (const inv of invoiceBalances) {
    if (remaining <= 0) break
    const toApply = Math.min(remaining, inv.remaining)

    const { error: insertError } = await supabase.from("payments").insert({
      invoice_id: inv.id,
      amount: toApply,
      method: payload.method,
      reference: payload.reference || null,
      user_id: currentUser.effectiveUserId,
      collected_by: currentUser.id,
      booker_id: bookerId,
    })
    if (insertError) return { error: insertError.message }
    remaining -= toApply

    const newStatus = toApply >= inv.remaining ? "Paid" : "Pending"
    await supabase
      .from("sales_invoices")
      .update({ status: newStatus })
      .eq("id", inv.id)
      .eq("user_id", currentUser.effectiveUserId)
  }

  revalidatePath("/salesman")
  revalidatePath("/booker")
  revalidatePath("/pos/payments")
  return { error: null }
}
