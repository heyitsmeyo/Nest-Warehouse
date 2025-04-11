/* eslint-disable */
import * as React from "react"
import { cn } from "@/lib/utils"

export interface SeparatorProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("h-[1px] w-full bg-border", className)}
        {...props}
      />
    )
  }
)
Separator.displayName = "Separator"

export { Separator } 