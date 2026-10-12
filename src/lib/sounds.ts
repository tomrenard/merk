/**
 * Minimal pairs for sounds French speakers often mix up in German: ü/i, ö/e, ö/o, ü/u, long vs
 * short vowels, ei/ie, h (spoken in German), ch, z/s, w/b.
 */
export type Pair = { focus: string; words: [string, string]; en: [string, string] };

export const PAIRS: Pair[] = [
  { focus: "ü or i", words: ["Kiste", "Küste"], en: ["box", "coast"] },
  { focus: "ü or i", words: ["Tier", "Tür"], en: ["animal", "door"] },
  {
    focus: "ü or i",
    words: ["liegen", "lügen"],
    en: ["to lie down", "to lie (not tell the truth)"],
  },
  { focus: "ü or i", words: ["Kissen", "küssen"], en: ["pillow", "to kiss"] },
  { focus: "ü or i", words: ["spielen", "spülen"], en: ["to play", "to rinse"] },
  { focus: "ö or e", words: ["lesen", "lösen"], en: ["to read", "to solve"] },
  { focus: "ö or e", words: ["kennen", "können"], en: ["to know", "can"] },
  { focus: "ö or o", words: ["schon", "schön"], en: ["already", "nice"] },
  { focus: "ö or o", words: ["Tochter", "Töchter"], en: ["daughter", "daughters"] },
  { focus: "ü or u", words: ["Mutter", "Mütter"], en: ["mother", "mothers"] },
  { focus: "ü or u", words: ["Bruder", "Brüder"], en: ["brother", "brothers"] },
  { focus: "ü or u", words: ["fuhr", "für"], en: ["drove", "for"] },
  { focus: "long or short vowel", words: ["Miete", "Mitte"], en: ["rent", "middle"] },
  { focus: "long or short vowel", words: ["Ofen", "offen"], en: ["oven", "open"] },
  { focus: "long or short vowel", words: ["bieten", "bitten"], en: ["to offer", "to ask"] },
  { focus: "long or short vowel", words: ["Höhle", "Hölle"], en: ["cave", "hell"] },
  { focus: "long or short vowel", words: ["Hüte", "Hütte"], en: ["hats", "hut"] },
  { focus: "long or short vowel", words: ["fühlen", "füllen"], en: ["to feel", "to fill"] },
  { focus: "long or short vowel", words: ["Beet", "Bett"], en: ["flower bed", "bed"] },
  { focus: "long or short vowel", words: ["Staat", "Stadt"], en: ["state", "town"] },
  { focus: "ei or ie", words: ["Wein", "Wien"], en: ["wine", "Vienna"] },
  { focus: "ei or ie", words: ["Leid", "Lied"], en: ["sorrow", "song"] },
  { focus: "ei or ie", words: ["Weise", "Wiese"], en: ["way", "meadow"] },
  { focus: "h or no h", words: ["Haus", "aus"], en: ["house", "out"] },
  { focus: "h or no h", words: ["heiß", "Eis"], en: ["hot", "ice cream"] },
  { focus: "h or no h", words: ["hier", "ihr"], en: ["here", "you (plural)"] },
  { focus: "ch or sch", words: ["Kirche", "Kirsche"], en: ["church", "cherry"] },
  { focus: "ch or sch", words: ["mich", "misch"], en: ["me", "mix!"] },
  { focus: "ch or ck", words: ["Nacht", "nackt"], en: ["night", "naked"] },
  { focus: "z or s", words: ["Zoo", "so"], en: ["zoo", "so"] },
  { focus: "z or s", words: ["Zahl", "Saal"], en: ["number", "hall"] },
  { focus: "w or b", words: ["Wald", "bald"], en: ["forest", "soon"] },
];
