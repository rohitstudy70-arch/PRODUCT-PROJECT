import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.InputHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  label?: string;
  error?: boolean;
  value?: string;
  onChange?: (e: any) => void;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, label, error, value, onChange, ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-1 w-full">
        {label && <label className="text-xs font-semibold text-slate-400">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            value={value}
            onChange={onChange}
            className={cn(
              "flex h-10 w-full rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm ring-offset-background placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 text-slate-100 appearance-none pr-10 cursor-pointer",
              error && "border-red-500 focus-visible:ring-red-500/30",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>
    )
  }
)

Select.displayName = "Select"
