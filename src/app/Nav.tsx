"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Link>;

/**
 * While a tapped screen is loading, a thin bar at the top shows it (only after a short delay,
 * so fast loads don't flash it): the tap is never left without feedback.
 */
function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-hidden="true" className="pending-bar" /> : null;
}

/** Lessons (/learn/…) don't slide, in or out: Tom found it odd there. */
function useSlide(href: Props["href"], type: string) {
  const lesson = (path: string) => path.startsWith("/learn/");
  return lesson(usePathname()) || lesson(String(href)) ? undefined : [type];
}

/** A link that opens a screen: it slides in from the right, like on iOS. */
export function Push({ children, ...props }: Props) {
  return (
    <Link transitionTypes={useSlide(props.href, "push")} {...props}>
      {children}
      <Pending />
    </Link>
  );
}

/** A link back to the screen before (✕, ‹, Done): the screen slides away to the right. */
export function Back({ children, ...props }: Props) {
  return (
    <Link transitionTypes={useSlide(props.href, "back")} {...props}>
      {children}
      <Pending />
    </Link>
  );
}
