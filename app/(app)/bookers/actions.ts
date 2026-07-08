"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"

export async function createBooker(formData: FormData) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const payload = {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    address: String(formData.get("address") || "").trim() || null,
    user_id: currentUser.effectiveUserId,
  }

  if (!payload.name || !payload.phone) {
    return { error: "Name and phone are required" }
  }

  const { error } = await supabase.from("bookers").insert(payload)
  if (error) return { error: error.message }

  revalidatePath("/bookers")
  revalidatePath("/bookers/add")
  return { error: null }
}

export async function updateBooker(formData: FormData) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const id = String(formData.get("id") || "").trim()
  const payload = {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    address: String(formData.get("address") || "").trim() || null,
  }

  if (!id || !payload.name || !payload.phone) {
    return { error: "ID, name and phone are required" }
  }

  const { error } = await supabase
    .from("bookers")
    .update(payload)
    .eq("id", id)
    .eq("user_id", currentUser.effectiveUserId)

  if (error) return { error: error.message }

  revalidatePath("/bookers")
  return { error: null }
}

export async function deleteBooker(bookerId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { error } = await supabase
    .from("bookers")
    .delete()
    .eq("id", bookerId)
    .eq("user_id", currentUser.effectiveUserId)

  if (error) return { error: error.message }

  revalidatePath("/bookers")
  return { error: null }
}
