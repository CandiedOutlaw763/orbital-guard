const INTERACTIVE_SELECTOR = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  'option',
  'label',
  '[role="button"]',
  '[role="tab"]',
  '[role="tablist"]',
  '[role="switch"]',
  '[data-sidebar-chrome]',
].join(', ')

export function isSidebarDismissIgnored(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR))
}

export function isFinePointerDevice() {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
