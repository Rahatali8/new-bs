import { createClient } from "@/lib/supabase/server"
import { POSNewSaleForm } from "@/components/pos-new-sale-form"
import { requireRole } from "@/lib/auth/roles"
import { getOrCreateWalkInParty } from "@/app/(app)/pos/actions"

export default async function BookerNewSalePage() {
  const currentUser = await requireRole(["booker"])
  const supabase = createClient()

  const [{ data: parties = [] }, { data: inventory = [] }, { data: booker }, walkIn] = await Promise.all([
    supabase.from("parties").select("id, name, address").eq("type", "Customer").eq("user_id", currentUser.effectiveUserId).order("name"),
    supabase.from("inventory_items").select("id, name, stock, selling_price, cash_price, credit_price, supplier_price, cost_price").eq("user_id", currentUser.effectiveUserId).order("name"),
    supabase.from("bookers").select("id, name, phone").eq("id", currentUser.booker_id!).eq("user_id", currentUser.effectiveUserId).single(),
    getOrCreateWalkInParty(),
  ])

  const normalizedInventory = (inventory || []).map((item) => ({
    id: item.id,
    name: (item as { name?: string }).name || "",
    stock: Number((item as { stock?: number }).stock ?? 0),
    unitPrice: Number((item as { cash_price?: number }).cash_price ?? (item as { selling_price?: number }).selling_price ?? 0),
    cashPrice: Number((item as { cash_price?: number }).cash_price ?? (item as { selling_price?: number }).selling_price ?? 0),
    creditPrice: Number((item as { credit_price?: number }).credit_price ?? (item as { selling_price?: number }).selling_price ?? 0),
    supplierPrice: Number((item as { supplier_price?: number }).supplier_price ?? (item as { selling_price?: number }).selling_price ?? 0),
    costPrice: Number((item as { cost_price?: number }).cost_price ?? 0),
  }))

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold text-foreground">New Sale</h1>
      <p className="text-xs sm:text-sm text-muted-foreground">
        Sales you create are booked under {booker?.name ?? "your booker account"}.
      </p>
      <POSNewSaleForm
        parties={(parties || []).map((p) => ({ id: (p as { id: string }).id, name: (p as { name?: string }).name || "", address: (p as { address?: string | null }).address ?? null }))}
        bookers={booker ? [{ id: booker.id, name: booker.name || "", phone: booker.phone || "" }] : []}
        lockedBookerId={booker?.id}
        inventory={normalizedInventory}
        initialItemId={null}
        autoAdd={false}
        walkInPartyId={walkIn.id}
        isOwner={false}
      />
    </div>
  )
}
