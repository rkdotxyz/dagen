/*
  card.jsx — shadcn/ui's Card: a bordered, rounded box that groups things.
  CardHeader, CardTitle and CardContent are its usual parts.
*/

import { cn } from '@/lib/utils'

function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-card text-card-foreground flex flex-col gap-4 rounded-xl border py-4 shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-wrap items-center gap-2 px-4', className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }) {
  return (
    <h2
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn('px-4', className)} {...props} />
}

export { Card, CardContent, CardHeader, CardTitle }
