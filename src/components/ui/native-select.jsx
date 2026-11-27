/*
  native-select.jsx — shadcn/ui's NativeSelect: a real <select>, styled
  to match Input, with a chevron drawn on top.

  Why the native one rather than shadcn's fancier Select: on a phone the
  native list opens the system's own picker, which is quicker to use,
  and it behaves exactly like the <select> the tests already drive.
*/

import { ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function NativeSelect({ className, ...props }) {
  return (
    <div className={cn('relative w-full', className)} data-slot="native-select-wrapper">
      <select
        data-slot="native-select"
        className="border-input dark:bg-input/30 h-9 pointer-coarse:h-11 w-full min-w-0 appearance-none rounded-md border bg-transparent py-1 pr-8 pl-3 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm [&>option]:bg-background [&>optgroup]:bg-background"
        {...props}
      />
      {/* aria-hidden: the chevron is decoration, not something to read out. */}
      <ChevronDownIcon
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
      />
    </div>
  )
}

export { NativeSelect }
