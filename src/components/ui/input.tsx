import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-input bg-background px-3.5 py-1 text-base text-foreground transition-colors duration-150 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-placeholder hover:border-placeholder focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/[0.12] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#F3F4EF] disabled:text-muted-foreground read-only:bg-[#F7F7F5] aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/[0.12] md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
