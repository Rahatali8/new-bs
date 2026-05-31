"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getAdminSessionOrRedirect } from "@/lib/auth"

export async function saveSystemInvoice(payload: {
  invoiceNo: string
  clientId: string
  clientName: string
  clientEmail: string
  plan: string
  period: string
  amount: number
  notes?: string
}) {
  await getAdminSessionOrRedirect("/admin/login")
  const supabase = createClient()

  const { error } = await supabase.from("system_invoices").insert({
    invoice_no: payload.invoiceNo,
    client_id: payload.clientId,
    client_name: payload.clientName,
    client_email: payload.clientEmail,
    plan: payload.plan,
    period: payload.period,
    amount: payload.amount,
    notes: payload.notes || null,
  })

  if (error) return { error: error.message }
  revalidatePath("/admin/dashboard/invoices")
  return { error: null }
}

export async function getSystemInvoices() {
  await getAdminSessionOrRedirect("/admin/login")
  const supabase = createClient()

  const { data, error } = await supabase
    .from("system_invoices")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return { data: [] }
  return { data: data || [] }
}

export async function deleteSystemInvoice(id: string) {
  await getAdminSessionOrRedirect("/admin/login")
  const supabase = createClient()

  const { error } = await supabase.from("system_invoices").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/dashboard/invoices")
  return { error: null }
}
