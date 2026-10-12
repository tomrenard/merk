/**
 * Listening drills generated on the fly: the app says something, you type what you heard.
 * `say` is what the German voice reads (digits are read out in German), `answers` what counts
 * as right after normalising spaces, and `shown` the answer displayed afterwards.
 */
export type Drill = { kind: string; say: string; answers: string[]; shown: string };

type Random = () => number;
const pick = <T>(items: readonly T[], random: Random): T =>
  items[Math.floor(random() * items.length)] as T;
const between = (min: number, max: number, random: Random) =>
  min + Math.floor(random() * (max - min + 1));

function number(random: Random): Drill {
  // Mostly the tricky range: units before tens (einundzwanzig) and hundreds.
  const n = pick(
    [
      between(13, 19, random),
      between(21, 99, random),
      between(100, 999, random),
      between(1000, 2999, random),
    ],
    random,
  );
  return { kind: "Number", say: String(n), answers: [String(n)], shown: String(n) };
}

function price(random: Random): Drill {
  const euros = between(1, 49, random);
  const cents = pick([0, 49, 50, 95, 99, between(1, 98, random)], random);
  const shown = `${euros},${String(cents).padStart(2, "0")} €`;
  const say = cents ? `${euros} Euro ${cents}` : `${euros} Euro`;
  const value = `${euros},${String(cents).padStart(2, "0")}`;
  return {
    kind: "Price",
    say,
    answers: [value, value.replace(",", "."), ...(cents ? [] : [String(euros)])],
    shown,
  };
}

const UNITS = [
  "null",
  "eins",
  "zwei",
  "drei",
  "vier",
  "fünf",
  "sechs",
  "sieben",
  "acht",
  "neun",
  "zehn",
  "elf",
  "zwölf",
];

/**
 * Everyday spoken time for h:m on a 12-hour clock: "Viertel nach drei" (3:15), "halb vier"
 * (3:30: half *to* four), "zehn vor vier" (3:50). Minutes are multiples of 5 except 25/35.
 */
export function spokenTime(hour: number, minute: number): string {
  const next = (hour % 12) + 1;
  const h = UNITS[hour] ?? String(hour);
  const n = UNITS[next] ?? String(next);
  if (minute === 0) return `${h} Uhr`;
  if (minute === 15) return `Viertel nach ${h}`;
  if (minute === 30) return `halb ${n}`;
  if (minute === 45) return `Viertel vor ${n}`;
  if (minute < 30) return `${UNITS[minute] ?? "zwanzig"} nach ${h}`;
  return `${UNITS[60 - minute] ?? "zwanzig"} vor ${n}`;
}

function time(random: Random): Drill {
  const hour = between(1, 12, random);
  const minute = pick([0, 5, 10, 15, 20, 30, 30, 40, 45, 45, 50, 55], random);
  const mm = String(minute).padStart(2, "0");
  return {
    kind: "Time",
    say: spokenTime(hour, minute),
    answers: [`${hour}:${mm}`, `${hour + 12}:${mm}`, `${String(hour).padStart(2, "0")}:${mm}`],
    shown: `${hour}:${mm}`,
  };
}

function phone(random: Random): Drill {
  const digits = `01${between(50, 79, random)}${Array.from({ length: 7 }, () => between(0, 9, random)).join("")}`;
  return {
    kind: "Phone number",
    say: digits.split("").join(" "),
    answers: [digits],
    shown: digits,
  };
}

/** Names you spell on the phone, with letters a French speaker mixes up (e, i, j, v, w, z, umlauts). */
const NAMES = [
  "Müller",
  "Schmidt",
  "Weber",
  "Wagner",
  "Becker",
  "Schäfer",
  "Jung",
  "Vogel",
  "Zimmermann",
  "Krüger",
  "Hofmann",
  "Groß",
  "Köhler",
  "Yilmaz",
  "Jäger",
  "Wolf",
  "Ziegler",
  "Braun",
  "Fuchs",
  "Keller",
];

/** German letter names, for the voice to spell with. */
const LETTERS: Record<string, string> = {
  a: "A",
  b: "Be",
  c: "Ze",
  d: "De",
  e: "E",
  f: "Eff",
  g: "Ge",
  h: "Ha",
  i: "I",
  j: "Jott",
  k: "Ka",
  l: "Ell",
  m: "Emm",
  n: "Enn",
  o: "O",
  p: "Pe",
  q: "Ku",
  r: "Err",
  s: "Ess",
  t: "Te",
  u: "U",
  v: "Fau",
  w: "We",
  x: "Ix",
  y: "Ypsilon",
  z: "Zett",
  ä: "Ä",
  ö: "Ö",
  ü: "Ü",
  ß: "Eszett",
};

function spelling(random: Random): Drill {
  const name = pick(NAMES, random);
  const say = [...name.toLowerCase()].map((c) => LETTERS[c] ?? c).join(", ");
  return { kind: "Spelled name", say, answers: [name], shown: name };
}

const KINDS = [number, price, time, time, phone, spelling];

export function drills(count: number, random: Random = Math.random): Drill[] {
  return Array.from({ length: count }, () => pick(KINDS, random)(random));
}

export function isRightDrill(input: string, drill: Drill): boolean {
  // Spaces and € don't matter; ue for ü etc. is fine, as on the phone keyboard.
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[\s€]/g, "")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss");
  return drill.answers.some((answer) => clean(answer) === clean(input));
}
