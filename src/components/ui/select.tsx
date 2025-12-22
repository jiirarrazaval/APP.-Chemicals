import * as React from 'react'
import { cn } from '../../lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, label, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label ? <label className="text-sm text-muted-foreground">{label}</label> : null}
      <select
        ref={ref}
        className={cn(
          'h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
)
Select.displayName = 'Select'
