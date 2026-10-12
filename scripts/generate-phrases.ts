/**
 * Writes data/phrases.json: everyday phrases for life in Germany, by situation, from Claude
 * once (committed; re-runs only fill missing situations). Needs AI_GATEWAY_API_KEY or
 * VERCEL_OIDC_TOKEN (`vercel env pull .env.vercel`).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const SITUATIONS = [
  "Greetings, introducing yourself, small talk with neighbours",
  "Not understanding: asking to repeat, slow down, spell, explain",
  "Café, bakery and restaurant: ordering, asking for the bill, paying",
  "Supermarket and shops: finding things, sizes, returns, paying by card",
  "Public transport and Deutsche Bahn: tickets, delays, platforms, asking the way",
  "Doctor and pharmacy: appointments, symptoms, sick note (Krankmeldung, AU)",
  "Phone calls: making appointments, leaving a message, being put through",
  "Bürgeramt and Ausländerbehörde: Anmeldung, documents, appointments, forms",
  "Flat and landlord: rent, repairs, Hausverwaltung, Handwerker, Nebenkosten, moving",
  "Post office and parcels: sending, picking up, missed delivery (Benachrichtigung)",
  "Bank and money: account, card blocked, transfers",
  "Work: colleagues, meetings, small talk, asking for help, being off sick",
  "Invitations and plans with friends: suggesting, accepting, declining, being late",
  "Opinions and feelings: agreeing, disagreeing, likes, being tired or stressed",
  "Informal spoken German with friends (du, common short forms and particles)",
  "Emergencies and problems: help, police, lost things, something is broken",
  "Weather, weekend and free time small talk",
  "Polite requests and complaints (Könnten Sie…, Es tut mir leid, aber…)",
];

const Phrases = z.object({
  items: z.array(
    z.object({
      de: z.string(),
      en: z.string(),
      cefr: z.enum(["A1", "A2", "B1"]),
      note: z.string(),
    }),
  ),
});
type Phrase = z.infer<typeof Phrases>["items"][number] & { situation: string };

const file = new URL("../data/phrases.json", import.meta.url).pathname;
const known: Phrase[] = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
const client = new Anthropic({
  baseURL: "https://ai-gateway.vercel.sh",
  apiKey: process.env.AI_GATEWAY_API_KEY ?? process.env.VERCEL_OIDC_TOKEN,
});

for (const situation of SITUATIONS) {
  if (known.some((p) => p.situation === situation)) continue;
  const response = await client.messages.parse({
    model: "anthropic/claude-opus-5.5",
    max_tokens: 8000,
    output_config: { effort: "medium", format: zodOutputFormat(Phrases) },
    messages: [
      {
        role: "user",
        content: `You are writing a phrase deck for an adult French native speaker who lives in Germany, is at A1 and wants to manage everyday life up to B1. Situation: "${situation}".

Give the 20 phrases a person really says or hears most often in this situation in Germany today, from simplest (A1) to B1. Rules:
- de: natural, correct, everyday German as people actually say it (standard German; use Sie unless the situation is informal), one short sentence or chunk, with correct punctuation
- en: a natural English equivalent
- cefr: A1, A2 or B1
- note: optional short usage note in English (register, when to use it, a common reply); empty string if none
Include both things you say and things you will hear. No duplicates.`,
      },
    ],
  });
  for (const item of response.parsed_output?.items ?? []) known.push({ ...item, situation });
  writeFileSync(file, `${JSON.stringify(known, null, 1)}\n`);
  console.log(`${situation}: ${known.filter((p) => p.situation === situation).length}`);
}
console.log(`${known.length} phrases`);
