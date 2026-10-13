/**
 * Records every lesson and exam sentence once with Gemini's German voices (Kore; Charon for the
 * second speaker of a dialogue) through AI Gateway, and stores them on the public Blob store as
 * a/<audioKey>.m4a. Sentences already stored are skipped, so re-runs cost nothing.
 *
 * Needs AI_GATEWAY_API_KEY (a capped one-off key) and BLOB_READ_WRITE_TOKEN. macOS only
 * (afconvert turns the WAV into small AAC). Flags: --dry (count only), --limit N.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { list, put } from "@vercel/blob";
import { audioKey, normalize, solved } from "../src/lib/audio.ts";
import type { Exam } from "../src/lib/exams.ts";
import type { Unit, UnitItem } from "../src/lib/units.ts";

const MODEL = "google/gemini-3.8-flash-lite-tts";
const FIRST = "Kore";
const SECOND = "Charon";
const STYLE = "Read in natural standard German from Germany, at a calm everyday pace.";
const dry = process.argv.includes("--dry");
const limitAt = process.argv.indexOf("--limit");
const limit = limitAt > 0 ? Number(process.argv[limitAt + 1]) : Number.POSITIVE_INFINITY;

if (!process.env.AI_GATEWAY_API_KEY || !process.env.BLOB_READ_WRITE_TOKEN)
  throw new Error("Needs AI_GATEWAY_API_KEY and BLOB_READ_WRITE_TOKEN");

const json = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8"));
const units = readdirSync("data/units").map((f) => json<Unit>(`data/units/${f}`));
const exams = readdirSync("data/exams").map((f) => json<Exam>(`data/exams/${f}`));

// One voice per sentence: a dialogue line keeps its speaker's voice (the app's second speaker
// is the other voice); everything else is read by the first voice. First assignment wins.
const wanted = new Map<string, { text: string; voice: string }>();
function add(text: string, voice = FIRST) {
  const clean = normalize(text);
  if (clean && !wanted.has(audioKey(clean))) wanted.set(audioKey(clean), { text: clean, voice });
}
function dialogue(lines: { speaker: string; de: string }[]) {
  const speakers = [...new Set(lines.map((l) => l.speaker))];
  for (const line of lines) add(line.de, speakers.indexOf(line.speaker) % 2 ? SECOND : FIRST);
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

const stored = new Set<string>();
let cursor: string | undefined;
do {
  const page = await list({ prefix: "a/", cursor, limit: 1000 });
  for (const blob of page.blobs) stored.add(blob.pathname.slice(2, -4));
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

const todo = [...wanted].filter(([key]) => !stored.has(key)).slice(0, limit);
const chars = todo.reduce((sum, [, s]) => sum + s.text.length, 0);
console.log(
  `${wanted.size} sentences, ${stored.size} stored, ${todo.length} to record (${chars} chars)`,
);
if (dry) process.exit(0);

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
      body: JSON.stringify({ text, voice, instructions: STYLE, outputFormat: "wav" }),
    });
    const body = (await res.json().catch(() => ({}))) as { audio?: string };
    if (res.ok && body.audio) {
      const wav = join(dir, `${key}.wav`);
      const m4a = join(dir, `${key}.m4a`);
      writeFileSync(wav, Buffer.from(body.audio, "base64"));
      execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "32000", wav, m4a]);
      await put(`a/${key}.m4a`, readFileSync(m4a), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "audio/mp4",
        cacheControlMaxAge: 31_536_000,
      });
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
  while (next < todo.length) {
    const [key, sentence] = todo[next++] as [string, { text: string; voice: string }];
    try {
      await record(key, sentence);
    } catch (error) {
      failed.push(String(error));
      if (String(error).startsWith("Error: 402")) next = todo.length;
    }
    if (++done % 100 === 0) console.log(`${done}/${todo.length}`);
  }
}
await Promise.all(Array.from({ length: 16 }, worker));
console.log(`recorded ${done - failed.length}, failed ${failed.length}`);
for (const f of failed.slice(0, 10)) console.log(f);
