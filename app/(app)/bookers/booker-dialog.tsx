"use client"

import { useState, useActionState, useEffect, useRef } from "react"
import { updateBooker, deleteBooker } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Booker {
  id: string
  name: string
  phone: string
  address?: string | null
}

const initialState = { error: "" }

export function BookerDialog({ booker }: { booker: Booker }) {
  const [open, setOpen] = useState(false)
  const prevPendingRef = useRef(false)

  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await updateBooker(formData)
      return { error: result?.error || "" }
    },
    initialState,
  )

  useEffect(() => {
    if (prevPendingRef.current && !pending && !state.error) {
      toast.success("Booker updated successfully!")
      setOpen(false)
    }
    prevPendingRef.current = pending
  }, [pending, state.error])

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <Pencil className="w-4 h-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Booker</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={booker.id} />
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" name="name" defaultValue={booker.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" name="phone" defaultValue={booker.phone} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" name="address" defaultValue={booker.address || ""} />
            </div>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function DeleteBookerButton({ bookerId }: { bookerId: string }) {
  const [pending, setPending] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this booker?")) return
    setPending(true)
    const result = await deleteBooker(bookerId)
    setPending(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Booker deleted")
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleDelete} disabled={pending}>
      <Trash2 className="w-4 h-4 text-destructive" />
    </Button>
  )
}
