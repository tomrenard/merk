"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

/**
 * While a tapped screen is loading, a thin bar at the top shows it (only after a short delay,
 * so fast loads don't flash it): the tap is never left without feedback.
 */
function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-hidden="true" className="pending-bar" /> : null;
}

/** A link to another screen, with loading feedback when it isn't instant. */
export function Go({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      {children}
      <Pending />
    </Link>
  );
}
