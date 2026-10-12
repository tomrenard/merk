# merk

A small, self-hosted spaced-repetition app for learning German, in the spirit of Anki.
One user, one password, installable on your phone as a PWA.

- FSRS scheduling ([ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs))
- der/die/das colours, German text-to-speech in the browser
- Type-the-German cards that accept `ae/oe/ue/ss` for `ä/ö/ü/ß`
- Goethe-Institut word lists A1 → B1 (~3,000 words, both directions, in level order)

Stack: Next.js, Neon Postgres, Drizzle, Vercel.

## Run your own

```sh
pnpm install
vercel link && vercel integration add neon   # or set DATABASE_URL yourself
cp .env.example .env.local                    # fill APP_PASSWORD and SESSION_SECRET
pnpm db:migrate
pnpm import:words   # A1 → B1 + phrases, from data/ (backs up first)
pnpm dev
```

On iPhone: open the site in Safari → Share → Add to Home Screen, then log in inside the installed app.

## Keys

`Space` shows the answer, `1`–`4` grade it (Again, Hard, Good, Easy).

## Content

See [data/README.md](data/README.md) for sources and licences. Code is MIT.
