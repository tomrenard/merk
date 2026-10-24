import { getT } from "@/lib/locale";
import { Dock } from "./Dock";

/** Line icons (24px, stroke = currentColor). */
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
export async function TabBar({ active }: { active: (typeof TABS)[number]["href"] }) {
  const t = await getT();
  return (
    <Dock
      active={active}
      label={t("Sections")}
      tabs={TABS.map((tab) => ({ href: tab.href, label: t(tab.label), icon: ICONS[tab.href] }))}
    />
  );
}
