import Link from "next/link";

const TABS = [
  { href: "/", icon: "🏠", label: "Today" },
  { href: "/learn", icon: "🎓", label: "Course" },
  { href: "/practice", icon: "🎯", label: "Practice" },
  { href: "/words", icon: "📚", label: "Words" },
] as const;

/** Bottom navigation of the main screens; `active` is the current tab's href. */
export function TabBar({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav
      className="line fixed inset-x-0 bottom-0 z-10 border-t-2 pb-[env(safe-area-inset-bottom)]"
      style={{ background: "var(--bg)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 gap-2 px-3 py-2">
        {TABS.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={tab.href === active ? "page" : undefined}
              className={`flex flex-col items-center rounded-2xl border-2 py-1.5 text-xs font-extrabold ${
                tab.href === active
                  ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                  : "muted border-transparent"
              }`}
            >
              <span aria-hidden="true" className="text-2xl leading-8">
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
