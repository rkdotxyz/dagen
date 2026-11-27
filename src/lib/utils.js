/*
  utils.js — the one helper every shadcn/ui component uses.

  cn() joins class names, and when two Tailwind classes fight (say
  "px-2" from the component and "px-4" passed in), the one passed in
  wins. That's what lets you restyle a component from the outside.
*/

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
