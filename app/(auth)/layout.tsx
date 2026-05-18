import type { ReactNode } from "react"
import { ReceiptText, ShieldCheck, TrendingUp, Package, Users } from "lucide-react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* Left Panel */}
      <div className="hidden lg:flex w-[55%] flex-col justify-between bg-[#0f172a] relative overflow-hidden p-12">

        {/* Background gradient blobs */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px]" />
          <div className="absolute bottom-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full bg-violet-600/20 blur-[100px]" />
          <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-[80px]" />
        </div>

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Top logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <ReceiptText className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">Smart POS</p>
            <p className="text-indigo-400 text-xs font-medium mt-0.5">Business Suite</p>
          </div>
        </div>

        {/* Center hero text */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-indigo-300 text-xs font-medium tracking-wide">All-in-one ERP System</span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Run your business<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                smarter & faster
              </span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              Complete billing, inventory, accounts and employee management — all in one place.
            </p>
          </div>

          {/* Feature list */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: TrendingUp, label: "Sales & POS", desc: "Fast checkout" },
              { icon: Package, label: "Inventory", desc: "Stock tracking" },
              { icon: Users, label: "Parties", desc: "CRM built-in" },
              { icon: ShieldCheck, label: "Secure", desc: "Role-based access" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl p-3 backdrop-blur-sm">
                <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-indigo-400" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-none">{label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom footer */}
        <div className="relative z-10 flex items-center justify-between">
          <p className="text-slate-600 text-xs">© 2025 AN-Tech Solutions</p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-500 text-xs">All systems operational</span>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 py-12">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-10">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ReceiptText className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <p className="text-foreground font-bold text-lg">Smart POS</p>
          </div>

          {children}
        </div>
      </div>

    </div>
  )
}
