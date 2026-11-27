/*
  test-setup.js — runs before every test file.

  The tests run in jsdom, a pretend browser. It lacks ResizeObserver, which
  shadcn/ui's Switch and Checkbox (built on Radix) use to measure
  themselves. A stand-in that does nothing is enough: the tests check
  what's on screen and what gets saved, not sizes.
*/

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
