// Compact placeholder top bar for mobile. US-023 adds date context, search,
// notifications, and profile controls into this same bar.
export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center border-b border-line bg-surface px-4 lg:hidden">
      <span className="font-display text-h3 font-semibold text-ink-900">
        GAC
      </span>
    </header>
  );
}
