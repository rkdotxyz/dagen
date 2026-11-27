/*
  undo.js — putting something back after "Undo".

  Since Phase 17 every delete in Dagen offers Undo for a few seconds.
  Putting a thing back is the same move each time: return it to the list
  at the place it was, unless it's somehow there already (pressed twice,
  or it came back another way). Returns the same list when nothing
  changes, so React has no reason to redraw.
*/

export function putBack(list, item, index = list.length) {
  if (list.some((existing) => existing.id === item.id)) return list
  const next = [...list]
  next.splice(Math.min(Math.max(index, 0), next.length), 0, item)
  return next
}
