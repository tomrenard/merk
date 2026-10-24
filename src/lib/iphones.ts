/** Launch screens for current iPhones: [CSS width, CSS height, pixel ratio]. */
export const IPHONES = [
  [440, 956, 3],
  [430, 932, 3],
  [402, 874, 3],
  [393, 852, 3],
  [428, 926, 3],
  [390, 844, 3],
  [375, 812, 3],
  [414, 896, 2],
] as const;

/** The only splash sizes served, in pixels ("1320x2868"). */
export const SPLASH_SIZES = IPHONES.map(([w, h, r]) => `${w * r}x${h * r}`);
