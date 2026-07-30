import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'glass' | 'live';
}

function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
  
  const variants = {
    default: "border-transparent bg-indigo-600 text-white hover:bg-indigo-600/80",
    secondary: "border-transparent bg-slate-800 text-slate-100 hover:bg-slate-800/80",
    destructive: "border-transparent bg-red-950/40 text-red-400 border-red-900/50",
    success: "border-transparent bg-emerald-950/40 text-emerald-400 border-emerald-900/50",
    warning: "border-transparent bg-amber-950/40 text-amber-400 border-amber-900/50",
    info: "border-transparent bg-blue-950/40 text-blue-400 border-blue-900/50",
    outline: "text-slate-200 border-slate-700",
    glass: "border-slate-700/50 bg-slate-800/30 text-slate-200 backdrop-blur-md shadow-sm",
    live: "border-emerald-900/50 bg-emerald-950/40 text-emerald-400"
  }

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props}>
      {variant === 'live' && (
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      )}
      {children}
    </div>
  )
}

export { Badge }
