# Data sources

`goethe-a1.tsv`: "Goethe Institute A1 Wordlist" Anki deck by Patrizia,
https://codeberg.org/patrizia/anki_german_a1_vocab (commit 313000d), based on the
Goethe-Institut A1 Wortliste. Licensed CC BY-SA 4.0
(https://creativecommons.org/licenses/by-sa/4.0/). This file is unchanged and shared under
the same licence.

A2 and B1 are not stored here: their sources state no licence, so `scripts/import-words.ts`
fetches them into `data/.cache/` at import time:
- A2: https://github.com/langfield/A2_Wortliste_Goethe
- B1: https://github.com/kennethsible/goethe-wortliste (English and examples written by Claude, in `b1-translations.json`)

`core-words.tsv`: hand-written for merk (numbers, days, months, seasons, time words, countries
and languages, pronoun forms, ander-/all-/eigen-/beid-). The Goethe lists keep these in topic
groups that the sources above leave out. Same licence as the repo.

Teaching order uses the DeReWo frequency list (Institut für Deutsche Sprache, CC BY-NC,
https://www.ids-mannheim.de/derewo). It is fetched into `data/.cache/` at import time and never
committed; only the resulting order is stored in the database.

Written by Claude for merk, checked by separate review passes, and committed (same licence as
the repo): `b1-translations.json` (B1 English and examples), `b2-words.json` (~1,000 B2 words
picked from DeReWo frequency ranks after B1, with English and examples), `verbs.json` (verb
forms and the case/preposition each verb takes), `phrases.json` (everyday phrases by
situation), `units/` (125 lessons: grammar, topic and story lessons, A1 → B2), `exams/`
(Goethe-style level exams A1 → B2; not official Goethe material).

Recorded audio for lesson and exam sentences was generated with Google Gemini TTS and lives in
the separate [merk-audio](https://github.com/tomrenard/merk-audio) repo.
