import Link from "next/link";

/** Line icons (24px, stroke = currentColor), so the active tab simply turns blue. */
const ICONS = {
  "/": "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  "/learn": "M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5",
  "/practice":
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  "/words": "M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM4 17a3 3 0 0 1 3-3h11M20 7v13",
} as const;

const TABS = [
  { href: "/", label: "Today" },
  { href: "/learn", label: "Course" },
  { href: "/practice", label: "Practice" },
  { href: "/words", label: "Words" },
] as const;

/** Bottom navigation of the main screens; `active` is the current tab's href. */
export function TabBar({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav
      className="line fixed inset-x-0 bottom-0 z-10 border-t pb-[env(safe-area-inset-bottom)]"
      style={{ background: "var(--surface)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 px-3 pt-2 pb-1">
        {TABS.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              // Loads the whole tab in the background, so tapping it shows it at once.
              prefetch
              aria-current={tab.href === active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-1 text-xs font-semibold ${
                tab.href === active ? "text-[var(--brand)]" : "muted"
              }`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={tab.href === active ? 2.2 : 1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={ICONS[tab.href]} />
              </svg>
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
