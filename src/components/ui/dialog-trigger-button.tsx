"use client";

import type { ComponentProps, ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import { DialogTrigger } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A DialogTrigger styled like a Button, without nesting an actual <Button>
// inside it. Composing two separate `render`-based primitives (Button +
// DialogTrigger) causes their `data-slot` attributes to merge differently on
// the server vs. the client in this version of Base UI, producing a
// hydration-mismatch warning — this avoids that entirely by applying
// Button's classes directly to DialogTrigger's own rendered element.
type Props = ComponentProps<typeof DialogTrigger> & VariantProps<typeof buttonVariants>;

export function DialogTriggerButton({ variant, size, className, ...props }: Props) {
  return <DialogTrigger className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

// `content` must be a pre-rendered ReactNode (e.g. `<><Plus />Add item</>`),
// never a bare component reference (e.g. `Plus`) — a raw component/function
// reference isn't serializable across the Server-to-Client Component
// boundary, only actual React elements and plain data are.
export type DialogFormTrigger = {
  content: ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
};
