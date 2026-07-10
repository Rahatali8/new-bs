"use server"

import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"
import { requirePrivilege } from "@/lib/auth/privileges"

export interface PartyOutstanding {
  partyId: string
  name: string
  phone: string | null
  totalSales: number
  totalCollected: number
  outstanding: number
}

export interface BookerLedger {
  booker: { id: string; name: string; phone: string | null }
  parties: PartyOutstanding[]
  totals: { sales: number; collected: number; outstanding: number }
  todaySales: number
  todayCollected: number
  recentInvoices: Array<{
    id: string
    partyName: string
    total: number
    status: string
    created_at: string
  }>
}

function startOfToday(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// Full credit/recovery picture for one booker, scoped to the tenant.
// Booker/salesman logins may only query their own linked booker.
export async function getBookerLedger(bookerId: string): Promise<BookerLedger | null> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const eff = currentUser.effectiveUserId

  if ((currentUser.role === "booker" || currentUser.role === "salesman") && currentUser.booker_id !== bookerId) {
    return null
  }

  const { data: booker } = await supabase
    .from("bookers")
    .select("id, name, phone")
    .eq("id", bookerId)
    .eq("user_id", eff)
    .single()

  if (!booker) return null

  const { data: invoices } = await supabase
    .from("sales_invoices")
    .select("id, party_id, total, status, created_at")
    .eq("user_id", eff)
    .eq("booker_id", bookerId)
    .neq("status", "Cancelled")
    .order("created_at", { ascending: false })

  const invoiceList = invoices ?? []
  const invoiceIds = invoiceList.map((i) => i.id)

  let payments: Array<{ invoice_id: string; amount: number; created_at: string }> = []
  if (invoiceIds.length > 0) {
    const { data } = await supabase
      .from("payments")
      .select("invoice_id, amount, created_at")
      .in("invoice_id", invoiceIds)
    payments = data ?? []
  }

  const partyIds = [...new Set(invoiceList.map((i) => i.party_id))]
  let partyRows: Array<{ id: string; name: string; phone: string | null }> = []
  if (partyIds.length > 0) {
    const { data } = await supabase
      .from("parties")
      .select("id, name, phone")
      .in("id", partyIds)
    partyRows = data ?? []
  }
  const partyById = new Map(partyRows.map((p) => [p.id, p]))

  const paidByInvoice = new Map<string, number>()
  for (const p of payments) {
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount || 0))
  }

  const byParty = new Map<string, PartyOutstanding>()
  for (const inv of invoiceList) {
    const party = partyById.get(inv.party_id)
    const row = byParty.get(inv.party_id) ?? {
      partyId: inv.party_id,
      name: party?.name ?? "Unknown",
      phone: party?.phone ?? null,
      totalSales: 0,
      totalCollected: 0,
      outstanding: 0,
    }
    row.totalSales += Number(inv.total || 0)
    row.totalCollected += paidByInvoice.get(inv.id) ?? 0
    byParty.set(inv.party_id, row)
  }

  const parties = [...byParty.values()]
    .map((row) => ({ ...row, outstanding: row.totalSales - row.totalCollected }))
    .sort((a, b) => b.outstanding - a.outstanding)

  const totals = parties.reduce(
    (acc, row) => ({
      sales: acc.sales + row.totalSales,
      collected: acc.collected + row.totalCollected,
      outstanding: acc.outstanding + row.outstanding,
    }),
    { sales: 0, collected: 0, outstanding: 0 },
  )

  const today = startOfToday()
  const todaySales = invoiceList
    .filter((inv) => inv.created_at >= today)
    .reduce((sum, inv) => sum + Number(inv.total || 0), 0)
  const todayCollected = payments
    .filter((p) => p.created_at >= today)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const recentInvoices = invoiceList.slice(0, 10).map((inv) => ({
    id: inv.id,
    partyName: partyById.get(inv.party_id)?.name ?? "Unknown",
    total: Number(inv.total || 0),
    status: inv.status,
    created_at: inv.created_at,
  }))

  return { booker, parties, totals, todaySales, todayCollected, recentInvoices }
}

export interface CollectionEntry {
  id: string
  amount: number
  method: string
  created_at: string
  partyName: string
  bookerName: string
  collectorName: string
}

// Collections (recovery payments) with party/booker/collector names resolved.
// Scoped to tenant; optional filters for one collector or one booker.
export async function getCollections(options?: {
  collectedBy?: string
  bookerId?: string
  todayOnly?: boolean
}): Promise<CollectionEntry[]> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const eff = currentUser.effectiveUserId

  let query = supabase
    .from("payments")
    .select("id, amount, method, created_at, collected_by, booker_id, invoice_id")
    .eq("user_id", eff)
    .not("collected_by", "is", null)
    .order("created_at", { ascending: false })
    .limit(200)

  if (options?.collectedBy) query = query.eq("collected_by", options.collectedBy)
  if (options?.bookerId) query = query.eq("booker_id", options.bookerId)
  if (options?.todayOnly) query = query.gte("created_at", startOfToday())

  const { data: payments } = await query
  const paymentList = payments ?? []
  if (paymentList.length === 0) return []

  const invoiceIds = [...new Set(paymentList.map((p) => p.invoice_id))]
  const { data: invoices } = await supabase
    .from("sales_invoices")
    .select("id, party_id")
    .in("id", invoiceIds)
  const partyIdByInvoice = new Map((invoices ?? []).map((i) => [i.id, i.party_id]))

  const partyIds = [...new Set((invoices ?? []).map((i) => i.party_id))]
  const { data: parties } = partyIds.length
    ? await supabase.from("parties").select("id, name").in("id", partyIds)
    : { data: [] }
  const partyNameById = new Map((parties ?? []).map((p) => [p.id, p.name]))

  const bookerIds = [...new Set(paymentList.map((p) => p.booker_id).filter(Boolean))] as string[]
  const { data: bookers } = bookerIds.length
    ? await supabase.from("bookers").select("id, name").in("id", bookerIds)
    : { data: [] }
  const bookerNameById = new Map((bookers ?? []).map((b) => [b.id, b.name]))

  const collectorIds = [...new Set(paymentList.map((p) => p.collected_by).filter(Boolean))] as string[]
  const { data: collectors } = collectorIds.length
    ? await supabase.from("pos_users").select("id, name, email").in("id", collectorIds)
    : { data: [] }
  const collectorNameById = new Map((collectors ?? []).map((c) => [c.id, c.name || c.email]))

  return paymentList.map((p) => {
    const partyId = partyIdByInvoice.get(p.invoice_id)
    return {
      id: p.id,
      amount: Number(p.amount || 0),
      method: p.method,
      created_at: p.created_at,
      partyName: (partyId && partyNameById.get(partyId)) || "Unknown",
      bookerName: (p.booker_id && bookerNameById.get(p.booker_id)) || "—",
      collectorName: (p.collected_by && collectorNameById.get(p.collected_by)) || "—",
    }
  })
}

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

// Admin/staff view: per-booker udhaar and per-salesman collections
export async function getRecoverySummary(): Promise<RecoverySummary> {
  const currentUser = await requirePrivilege("pos")
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

  const bookerNameById2 = new Map((bookers ?? []).map((b) => [b.id, b.name]))

  // Per-salesman aggregates (their recorded collections)
  const salesmanRows: SalesmanRecoveryRow[] = (salesmen ?? []).map((s) => {
    const own = payments.filter((p) => p.collected_by === s.id)
    return {
      userId: s.id,
      name: s.name || s.email,
      bookerName: (s.booker_id && bookerNameById2.get(s.booker_id)) || "—",
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
