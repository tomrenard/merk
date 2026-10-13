# merk

A German course and flashcard app for adults living in Germany, from A1 to B2. Invite-only
accounts, installable on your phone as a web app. Explanations are in English.

- **Course:** 125 lessons in parts A1.1 → B2.2: grammar, topic lessons (a theme's words) and
  stories. Each lesson has four parts: the lesson itself, listen & read, speak, write.
- **Exams:** a short exam closes each part (70% to pass); a Goethe-style exam closes each level
  (listening, reading, grammar, writing, speaking; 60% to pass). The path waits at an exam.
- **Placement test:** words, grammar and listening, about 10 minutes; starts you at the right
  lesson.
- **Flashcards:** ~4,600 words and phrases, A1 → B2, scheduled with FSRS
  ([ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)). der/die/das colours, typed
  answers that accept `ae/oe/ue/ss`.
- **AI teacher:** feedback on your writing, and on spoken answers in level exams (Claude Haiku
  via Vercel AI Gateway); speech-to-text for the speaking parts. Daily limits per person, a
  cache, and a monthly budget on the gateway keep it cheap.
- **Recorded voices:** every lesson and exam sentence is recorded once (Gemini TTS) and served
  from [merk-audio](https://github.com/tomrenard/merk-audio) on GitHub Pages; anything else
  uses the phone's German voice.

Stack: Next.js, React, Neon Postgres, Drizzle, Better Auth, Vercel (AI Gateway).

## Run your own

```sh
pnpm install
vercel link && vercel integration add neon   # or set DATABASE_URL yourself
cp .env.example .env.local                    # fill BETTER_AUTH_SECRET and ALLOWED_EMAILS
pnpm db:migrate
pnpm import:words   # A1 → B2 + phrases, from data/ (backs up first)
pnpm dev
```

AI feedback needs AI Gateway access: on Vercel the deployment's OIDC token is used
automatically; locally run `vercel env pull .env.local` (or set `AI_GATEWAY_API_KEY`). Set a
monthly budget for the project in the gateway. Without it, writing and speaking fall back to
marking yourself.

On iPhone: open the site in Safari → Share → Add to Home Screen, then log in inside the
installed app.

## Content

Lessons, exams and word data are in `data/` (see [data/README.md](data/README.md) for sources
and licences). After adding or changing lessons, run `pnpm units:index`; to record new
sentences, run `scripts/gen-audio.ts` (see its header) and push the merk-audio repo.

## Keys

In reviews, `Space` shows the answer and `1`–`4` grade it (Again, Hard, Good, Easy).

Code is MIT.
