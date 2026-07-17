import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'glass';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading = false, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
    
    const variants = {
      default: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/25",
      destructive: "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/25",
      outline: "border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-200",
      secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700",
      ghost: "hover:bg-slate-800/80 text-slate-300 hover:text-slate-100",
      glass: "glass text-indigo-400 hover:bg-indigo-600/10 hover:text-indigo-300"
    }

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3 text-xs",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10"
    }

    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={loading || props.disabled}
        {...(props as any)}
      >
        {loading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : null}
        {children}
      </motion.button>
    )
  }
)
Button.displayName = "Button"

export { Button }
