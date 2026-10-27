/**
 * Records every lesson and exam sentence, every Darija word, and every German word, example and
 * phrase of the shared word list (read from the database), once with Gemini's voices
 * (Kore; Charon for the second speaker of a dialogue) through AI Gateway, as a/<audioKey>.m4a
 * in a clone of the public tomrenard/merk-audio repo (GitHub Pages serves it: see AUDIO_BASE).
 * Sentences already there are skipped, so re-runs cost nothing; commit and push the new files
 * afterwards.
 *
 * Needs AI_GATEWAY_API_KEY (a capped one-off key) and DATABASE_URL (run with
 * --env-file=.env.local). AUDIO_DIR: the clone (default ../merk-audio).
 * macOS only (afconvert turns the WAV into small AAC). Flags: --dry (count only), --limit N,
 * --max-usd N (stop once the audio recorded would cost this much; default 8).
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres from "postgres";
import { audioKey, isArabic, normalize, solved } from "../src/lib/audio.ts";
import type { Exam } from "../src/lib/exams.ts";
import { spokenForm } from "../src/lib/german.ts";
import { PAIRS } from "../src/lib/sounds.ts";
import type { Unit, UnitItem } from "../src/lib/units.ts";

const MODEL = "google/gemini-3.8-flash-lite-tts";
/** Kore reads everything outside dialogues. In a dialogue each character gets a voice of their
 * gender: women Kore, Aoede, Leda; men Charon, Puck, Orus, Fenrir (a story can have a narrator and three men). */
const VOICES = { f: ["Kore", "Aoede", "Leda"], m: ["Charon", "Puck", "Orus", "Fenrir"] } as const;
const FIRST = VOICES.f[0];

/** Every character's gender (titles and role words decide the rest). A new name stops the run. */
const WOMEN =
  "Camille Sophie Jana Lena Anna Julia Elif Petra Mia Nadia Clara Katrin Amélie Sabine Claire Sandra Nina Élodie Mira Lea Amira Emma Marie Sarah Léa Miriam Mathilde Ingrid Leonie Ayla Paula Katja Sofia Laura Lisa Sara Nora Julie Monika Hanna Kerstin Mila Erna Layla Fatima Khadija Amina Salma Zineb Meryem Hajar";
const MEN =
  "Jonas Paul Marc Lukas Ben Felix Stefan Max Thomas Tom Jan Hugo Markus David Karim Tim Rafael Tobias Uwe Leon Daniel Frank Julien Lucas Antoine Gerd Mehmet Malik Erik Simon Ahmed Luca Malte Heinz Youssef Hamid Mehdi Omar Rachid Hicham Anas Driss";
const ROLES: Record<string, "f" | "m"> = {
  Erzähler: "m",
  Moderator: "m",
  Moderatorin: "f",
  Mitarbeiter: "m",
  Verkäuferin: "f",
  Arzthelferin: "f",
  "Dr. Wagner": "m",
  "Katja Lorenz": "f",
  // Recorded announcements and voicemails: a woman; radio and news: a man.
  Durchsage: "f",
  Ansage: "f",
  Praxis: "f",
  Anrufbeantworter: "f",
  Radio: "m",
  Nachrichten: "m",
};
const RECORDINGS = ["Durchsage", "Ansage", "Praxis", "Anrufbeantworter", "Radio", "Nachrichten"];
function gender(speaker: string): "f" | "m" {
  if (speaker.startsWith("Frau ")) return "f";
  if (speaker.startsWith("Herr ")) return "m";
  if (WOMEN.split(" ").includes(speaker)) return "f";
  if (MEN.split(" ").includes(speaker)) return "m";
  const role = ROLES[speaker];
  if (!role) throw new Error(`Unknown speaker "${speaker}": add them to WOMEN, MEN or ROLES`);
  return role;
}
const STYLE = "Read in natural standard German from Germany, at a calm everyday pace.";
/** Darija lessons are in Arabic script; the spike showed this keeps Gemini off MSA. */
const DARIJA =
  "Read in natural Moroccan Darija (Moroccan Arabic, as spoken in Casablanca), not Modern Standard Arabic, at a calm everyday pace.";
const styleOf = (text: string) => (isArabic(text) ? DARIJA : STYLE);
const dry = process.argv.includes("--dry");
const limitAt = process.argv.indexOf("--limit");
const limit = limitAt > 0 ? Number(process.argv[limitAt + 1]) : Number.POSITIVE_INFINITY;
const maxAt = process.argv.indexOf("--max-usd");
const maxUsd = maxAt > 0 ? Number(process.argv[maxAt + 1]) : 8;
if (!(maxUsd > 0)) throw new Error("--max-usd needs a positive number");
/** Flash-Lite TTS: $6 per million audio tokens, 25 tokens a second (doubles on 2027-01-01). */
const USD_PER_SECOND = (6 * 25) / 1e6;
let spent = 0;

const out = join(process.env.AUDIO_DIR ?? "../merk-audio", "a");
if (!existsSync(join(out, ".."))) throw new Error(`No audio repo clone at ${join(out, "..")}`);
mkdirSync(out, { recursive: true });

const json = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8"));
const units = readdirSync("data/units").map((f) => json<Unit>(`data/units/${f}`));
const exams = readdirSync("data/exams").map((f) => json<Exam>(`data/exams/${f}`));

// One voice per sentence: a dialogue line gets its character's voice; everything else is read
// by the first voice. First assignment wins (a sentence is one file).
const wanted = new Map<string, { text: string; voice: string }>();
function add(text: string, voice: string = FIRST) {
  const clean = normalize(text);
  if (clean && !wanted.has(audioKey(clean))) wanted.set(audioKey(clean), { text: clean, voice });
}
function dialogue(lines: { speaker: string; de: string }[]) {
  const seen = { f: 0, m: 0 };
  const voice = new Map<string, string>();
  // People who talk to each other get different voices first; recordings take what is left.
  const speakers = [...new Set(lines.map((l) => l.speaker))].sort(
    (a, b) => Number(RECORDINGS.includes(a)) - Number(RECORDINGS.includes(b)),
  );
  for (const speaker of speakers) {
    const g = gender(speaker);
    voice.set(speaker, VOICES[g][seen[g]++ % VOICES[g].length] ?? FIRST);
  }
  for (const line of lines) add(line.de, voice.get(line.speaker));
}
for (const unit of units) dialogue(unit.listening.lines);
for (const exam of exams) for (const task of exam.hoeren) dialogue(task.lines);
for (const unit of units) {
  for (const text of [
    ...unit.examples.map((e) => e.de),
    ...unit.dictation,
    ...unit.speaking.map((s) => s.de),
    unit.writing.model,
    ...unit.items.map(solved),
  ])
    add(text);
}
for (const exam of exams) {
  for (const item of exam.sprachbausteine) add(solved({ ...item, type: "choice" } as UnitItem));
  for (const task of [...exam.schreiben, ...exam.sprechen]) add(task.model);
}
// Sound-alike pairs: the drill needs a clear voice for ü/u, long/short vowels.
for (const pair of PAIRS) for (const word of pair.words) add(word);
// Darija words too: phones have no Darija voice, so a word card is silent without a recording.
const darijaWords = "data/darija/words.json";
if (existsSync(darijaWords))
  for (const w of json<{ de: string; exampleDe?: string }[]>(darijaWords))
    for (const text of [w.de, w.exampleDe ?? ""]) add(text);
// German words as the app says them (spokenForm), their examples, and phrases.
if (!process.env.DATABASE_URL)
  throw new Error("Needs DATABASE_URL: run with --env-file=.env.local");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const germanWords = await sql<{ de: string; example_de: string | null }[]>`
  select de, example_de from notes
  where course = 'de' and user_id is null and source not in ('unit', 'mine') order by ord`;
await sql.end();
for (const w of germanWords) for (const text of [spokenForm(w.de), w.example_de ?? ""]) add(text);

const stored = new Set(readdirSync(out).map((f) => f.replace(/\.m4a$/, "")));
// Which voice each stored file has: a sentence whose voice changed is recorded again.
const manifestFile = join(out, "..", "voices.json");
const manifest: Record<string, string> = existsSync(manifestFile)
  ? JSON.parse(readFileSync(manifestFile, "utf8"))
  : {};
// Written aside, then renamed: a run stopped mid-write can't leave half a file.
const saveManifest = () => {
  writeFileSync(
    `${manifestFile}.tmp`,
    `${JSON.stringify(manifest, Object.keys(manifest).sort(), 0)}\n`,
  );
  renameSync(`${manifestFile}.tmp`, manifestFile);
};

const todo = [...wanted]
  .filter(([key, { voice }]) => !stored.has(key) || manifest[key] !== voice)
  .slice(0, limit);
const chars = todo.reduce((sum, [, s]) => sum + s.text.length, 0);
console.log(
  `${wanted.size} sentences, ${stored.size} stored, ${todo.length} to record (${chars} chars)`,
);
if (dry) process.exit(0);
// Printable ASCII only: a pasted placeholder (…) otherwise fails every request in the header.
if (!/^[\x21-\x7e]+$/.test(process.env.AI_GATEWAY_API_KEY ?? ""))
  throw new Error("Needs AI_GATEWAY_API_KEY (the real key, not a placeholder)");

const dir = mkdtempSync(join(tmpdir(), "merk-audio-"));
async function record(key: string, { text, voice }: { text: string; voice: string }) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://ai-gateway.vercel.sh/v4/ai/speech-model", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
        "ai-gateway-protocol-version": "0.0.1",
        "ai-speech-model-specification-version": "4",
        "ai-model-id": MODEL,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, voice, instructions: styleOf(text), outputFormat: "wav" }),
    });
    const body = (await res.json().catch(() => ({}))) as { audio?: string };
    if (res.ok && body.audio) {
      const wav = join(dir, `${key}.wav`);
      const bytes = Buffer.from(body.audio, "base64");
      // Header bytes 28-31: bytes per second of audio.
      spent += ((bytes.length - 44) / bytes.readUInt32LE(28)) * USD_PER_SECOND;
      writeFileSync(wav, bytes);
      execFileSync("afconvert", [
        "-f",
        "m4af",
        "-d",
        "aac",
        "-b",
        "32000",
        wav,
        join(out, `${key}.m4a`),
      ]);
      manifest[key] = voice;
      return;
    }
    // A spent budget (402) or a bad request won't get better by retrying.
    if (res.status === 402 || res.status === 400 || attempt >= 4) {
      throw new Error(
        `${res.status} on "${text.slice(0, 40)}": ${JSON.stringify(body).slice(0, 200)}`,
      );
    }
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

let done = 0;
let next = 0;
const failed: string[] = [];
async function worker() {
  while (next < todo.length && spent < maxUsd) {
    const [key, sentence] = todo[next++] as [string, { text: string; voice: string }];
    try {
      await record(key, sentence);
    } catch (error) {
      failed.push(String(error));
      if (String(error).startsWith("Error: 402")) next = todo.length;
    }
    // Saved as it goes, so a stopped run doesn't record the same sentences again.
    if (++done % 100 === 0) {
      saveManifest();
      console.log(`${done}/${todo.length} ~$${spent.toFixed(2)}`);
    }
  }
}
await Promise.all(Array.from({ length: 16 }, worker));
saveManifest();
console.log(`recorded ${done - failed.length}, failed ${failed.length}, ~$${spent.toFixed(2)}`);
if (spent >= maxUsd) console.log(`Stopped at the --max-usd ${maxUsd} cap.`);
for (const f of failed.slice(0, 10)) console.log(f);
