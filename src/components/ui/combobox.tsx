"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { ChevronDownIcon, CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxItem = { value: string; label: string; disabled?: boolean; description?: string };

const Combobox = ComboboxPrimitive.Root;

function ComboboxInputGroup({ className, ...props }: ComboboxPrimitive.InputGroup.Props) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      className={cn("relative flex items-center", className)}
      {...props}
    />
  );
}

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cn(
        "h-11 w-full rounded-md border border-input bg-background py-2 pr-16 pl-3.5 text-sm text-foreground outline-none transition-colors duration-150 placeholder:text-placeholder hover:border-placeholder focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/[0.12] disabled:cursor-not-allowed disabled:bg-[#F3F4EF] disabled:text-muted-foreground disabled:opacity-100",
        className
      )}
      {...props}
    />
  );
}

function ComboboxTrigger({ className, ...props }: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      aria-label="Open"
      className={cn(
        "absolute right-1.5 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="pointer-events-none size-4" />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      aria-label="Clear"
      className={cn(
        "absolute right-8 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      <XIcon className="pointer-events-none size-4" />
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxContent({
  className,
  children,
  sideOffset = 4,
  ...props
}: Omit<ComboboxPrimitive.Popup.Props, "children"> &
  Pick<ComboboxPrimitive.Positioner.Props, "sideOffset"> &
  Pick<ComboboxPrimitive.List.Props, "children">) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner sideOffset={sideOffset} className="isolate z-50">
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          <ComboboxPrimitive.Empty className="p-3 text-center text-sm text-muted-foreground empty:m-0 empty:p-0">
            No matches found.
          </ComboboxPrimitive.Empty>
          <ComboboxPrimitive.List className="scroll-my-1 p-1">{children}</ComboboxPrimitive.List>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxItemRow({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span className="flex flex-1 shrink-0 gap-2">{children}</span>
      <ComboboxPrimitive.ItemIndicator
        render={<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />}
      >
        <CheckIcon className="pointer-events-none size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

// A searchable single-select dropdown for a plain {value,label} list — the
// same shape/role as our Select, but with a filter-as-you-type input for
// lists too long to scan (leads, projects). Item text-matching (label AND
// value) is handled by base-ui's default filter for {value,label}-shaped
// items, so no custom filter function is needed here.
function SearchableSelect({
  items,
  value,
  onValueChange,
  placeholder = "Search...",
  disabled,
  id,
}: {
  items: ComboboxItem[];
  value: string;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}) {
  const selected = items.find((i) => i.value === value) ?? null;

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(next) => onValueChange((next as ComboboxItem | null)?.value ?? null)}
      itemToStringLabel={(item: ComboboxItem) => item.label}
      disabled={disabled}
    >
      <ComboboxInputGroup>
        <ComboboxInput id={id} placeholder={placeholder} />
        {value && <ComboboxClear />}
        <ComboboxTrigger />
      </ComboboxInputGroup>
      <ComboboxContent>
        {(item: ComboboxItem) => (
          <ComboboxItemRow key={item.value} value={item} disabled={item.disabled}>
            {item.label}
            {item.disabled && item.description ? ` — ${item.description}` : ""}
          </ComboboxItemRow>
        )}
      </ComboboxContent>
    </Combobox>
  );
}

export {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxClear,
  ComboboxContent,
  ComboboxItemRow,
  SearchableSelect,
};
