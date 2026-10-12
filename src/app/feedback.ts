/** Colours of the answer panel and its button, shared by every checked exercise. */
export const PANEL = {
  right: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  wrong: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

/** For a `btn btn-solid` button: brand before checking, then green or red. */
export const SOLID = {
  idle: "[--c:var(--brand-fill)]",
  right: "[--c:#1a7a43]",
  wrong: "[--c:#d63c3c]",
};
