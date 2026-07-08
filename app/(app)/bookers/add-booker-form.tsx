"use client"

import { useActionState, useEffect, useRef } from "react"
import { createBooker } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const initialState = { error: "" }

export default function AddBookerForm() {
  const router = useRouter()
  const prevPendingRef = useRef(false)

  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await createBooker(formData)
      return { error: result?.error || "" }
    },
    initialState,
  )

  useEffect(() => {
    if (prevPendingRef.current && !pending && !state.error) {
      toast.success("Booker created successfully!")
      router.push("/bookers")
    }
    prevPendingRef.current = pending
  }, [pending, state.error, router])

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Ahmed Ali" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" placeholder="03001234567" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" placeholder="123 Main Street, City" />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Save Booker"}
      </Button>
    </form>
  )
}
