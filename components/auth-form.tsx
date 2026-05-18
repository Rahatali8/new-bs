"use client"

import { useState } from "react"
import { useActionState } from "react"
import { signIn } from "@/app/(auth)/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Eye, EyeOff, LogIn } from "lucide-react"

const initialState = { error: "" }

export function AuthForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction, pending] = useActionState(async (_prev, formData) => {
    const result = await signIn(formData)
    if (result?.error) return { error: result.error }
    return initialState
  }, initialState)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-[28px] font-bold text-foreground tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
      </div>

      {/* Form */}
      <form action={formAction} className="space-y-5">
        {state.error && (
          <div className="flex items-start gap-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl p-3.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{state.error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email address
          </Label>
          <Input
            name="email"
            id="email"
            type="email"
            placeholder="you@company.com"
            required
            className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 text-sm px-4"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </Label>
          <div className="relative">
            <Input
              name="password"
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              minLength={6}
              required
              className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 text-sm px-4 pr-12"
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full h-12 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 mt-2"
        >
          {pending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Sign in</span>
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground">
        Powered by{" "}
        <span className="font-semibold text-indigo-600 dark:text-indigo-400">AN-Tech Solutions</span>
      </p>
    </div>
  )
}
