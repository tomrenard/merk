"use client";

import Link, { useLinkStatus } from "next/link";
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

/** A link that opens a screen: it slides in from the right, like on iOS. */
export const Push = ({ children, ...props }: Props) => (
  <Link transitionTypes={["push"]} {...props}>
    {children}
    <Pending />
  </Link>
);

/** A link back to the screen before (✕, ‹, Done): the screen slides away to the right. */
export const Back = ({ children, ...props }: Props) => (
  <Link transitionTypes={["back"]} {...props}>
    {children}
    <Pending />
  </Link>
);
