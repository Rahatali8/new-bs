"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { LogOut, Menu, X } from "lucide-react"
import { signOut } from "@/app/(auth)/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface PortalHeaderProps {
  title: string
  roleLabel: string
  userName: string
  nav?: Array<{ href: string; label: string }>
}

export function PortalHeader({ title, roleLabel, userName, nav = [] }: PortalHeaderProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 left-3 z-40 lg:hidden bg-primary text-primary-foreground p-2.5 rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`w-72 bg-sidebar border-r border-sidebar-border fixed top-0 left-0 h-screen z-30 flex flex-col shadow-[0_12px_50px_rgba(0,0,0,0.2)] transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo / Title */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
            {title.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{title}</p>
            <p className="text-xs text-sidebar-foreground/70 truncate">{userName}</p>
          </div>
          <Badge variant="secondary" className="ml-auto shrink-0 text-xs">{roleLabel}</Badge>
        </div>

        {/* Nav links */}
        <nav className="flex-1 pt-5 px-3 space-y-1">
          {nav.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="p-4 border-t border-sidebar-border">
          <form action={signOut}>
            <Button variant="ghost" type="submit" className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  )
}
