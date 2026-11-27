/*
  label.jsx — shadcn/ui's Label, as a plain <label> (shadcn's own wraps
  a Radix one; a normal label does the same job here with one package
  fewer). Point it at a field with htmlFor.
*/

import { cn } from '@/lib/utils'

function Label({ className, ...props }) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
