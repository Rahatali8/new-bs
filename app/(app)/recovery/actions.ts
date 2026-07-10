"use server"

import { createClient } from "@/lib/supabase/server"
import { requirePrivilege } from "@/lib/auth/privileges"

export interface BookerRecoveryRow {
  bookerId: string
  name: string
  phone: string
  totalSales: number
  totalCollected: number
  outstanding: number
  todayCollected: number
}

export interface SalesmanRecoveryRow {
  userId: string
  name: string
  bookerName: string
  todayCollected: number
  totalCollected: number
  isActive: boolean
}

export interface RecoverySummary {
  todayRecovery: number
  totalOutstanding: number
  totalCollected: number
  bookers: BookerRecoveryRow[]
  salesmen: SalesmanRecoveryRow[]
}

function startOfToday(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function getRecoverySummary(): Promise<RecoverySummary> {
  const currentUser = await requirePrivilege("accounts")
  const supabase = createClient()
  const eff = currentUser.effectiveUserId
  const today = startOfToday()

  const [{ data: bookers }, { data: invoices }, { data: salesmen }] = await Promise.all([
    supabase.from("bookers").select("id, name, phone").eq("user_id", eff).order("name"),
    supabase
      .from("sales_invoices")
      .select("id, booker_id, total, status")
      .eq("user_id", eff)
      .not("booker_id", "is", null)
      .neq("status", "Cancelled"),
    supabase
      .from("pos_users")
      .select("id, name, email, booker_id, is_active")
      .eq("parent_user_id", eff)
      .eq("role", "salesman"),
  ])

  const invoiceList = invoices ?? []
  const bookerByInvoice = new Map(invoiceList.map((i) => [i.id, i.booker_id as string]))
  const invoiceIds = invoiceList.map((i) => i.id)

  let payments: Array<{ invoice_id: string; amount: number; created_at: string; collected_by: string | null }> = []
  if (invoiceIds.length > 0) {
    const { data } = await supabase
      .from("payments")
      .select("invoice_id, amount, created_at, collected_by")
      .eq("user_id", eff)
      .in("invoice_id", invoiceIds)
    payments = data ?? []
  }

  // Per-booker aggregates
  const bookerRows: BookerRecoveryRow[] = (bookers ?? []).map((b) => {
    const bookerInvoices = invoiceList.filter((i) => i.booker_id === b.id)
    const totalSales = bookerInvoices.reduce((s, i) => s + Number(i.total || 0), 0)
    const bookerPayments = payments.filter((p) => bookerByInvoice.get(p.invoice_id) === b.id)
    const totalCollected = bookerPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
    const todayCollected = bookerPayments
      .filter((p) => p.created_at >= today)
      .reduce((s, p) => s + Number(p.amount || 0), 0)

    return {
      bookerId: b.id,
      name: b.name,
      phone: b.phone,
      totalSales,
      totalCollected,
      outstanding: totalSales - totalCollected,
      todayCollected,
    }
  })

  const bookerNameById = new Map((bookers ?? []).map((b) => [b.id, b.name]))

  // Per-salesman aggregates (their recorded collections)
  const salesmanRows: SalesmanRecoveryRow[] = (salesmen ?? []).map((s) => {
    const own = payments.filter((p) => p.collected_by === s.id)
    return {
      userId: s.id,
      name: s.name || s.email,
      bookerName: (s.booker_id && bookerNameById.get(s.booker_id)) || "—",
      todayCollected: own.filter((p) => p.created_at >= today).reduce((sum, p) => sum + Number(p.amount || 0), 0),
      totalCollected: own.reduce((sum, p) => sum + Number(p.amount || 0), 0),
      isActive: s.is_active,
    }
  })

  const salesmanIds = new Set((salesmen ?? []).map((s) => s.id))
  const todayRecovery = payments
    .filter((p) => p.created_at >= today && p.collected_by !== null && salesmanIds.has(p.collected_by))
    .reduce((s, p) => s + Number(p.amount || 0), 0)

  return {
    todayRecovery,
    totalOutstanding: bookerRows.reduce((s, b) => s + b.outstanding, 0),
    totalCollected: bookerRows.reduce((s, b) => s + b.totalCollected, 0),
    bookers: bookerRows,
    salesmen: salesmanRows,
  }
}
