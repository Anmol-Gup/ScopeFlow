import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-25 w-full resize-y rounded-md border border-input bg-background px-3.5 py-2.5 text-base text-foreground transition-colors duration-150 outline-none placeholder:text-placeholder hover:border-placeholder focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/[0.12] disabled:cursor-not-allowed disabled:bg-[#F3F4EF] disabled:text-muted-foreground read-only:bg-[#F7F7F5] aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/[0.12] md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
