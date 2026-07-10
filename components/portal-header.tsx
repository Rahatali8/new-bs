import Link from "next/link"
import { LogOut } from "lucide-react"
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
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">{title}</h1>
            <p className="text-xs text-muted-foreground truncate">{userName}</p>
          </div>
          <Badge variant="secondary" className="shrink-0">{roleLabel}</Badge>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex items-center gap-1 sm:gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={signOut}>
            <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
