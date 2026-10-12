# Data sources

`goethe-a1.tsv`: "Goethe Institute A1 Wordlist" Anki deck by Patrizia,
https://codeberg.org/patrizia/anki_german_a1_vocab (commit 313000d), based on the
Goethe-Institut A1 Wortliste. Licensed CC BY-SA 4.0
(https://creativecommons.org/licenses/by-sa/4.0/). This file is unchanged and shared under
the same licence.

A2 and B1 are not stored here: their sources state no licence, so `scripts/import-words.ts`
fetches them into `data/.cache/` at import time:
- A2: https://github.com/langfield/A2_Wortliste_Goethe
- B1: https://github.com/kennethsible/goethe-wortliste (English and examples generated with Claude)
