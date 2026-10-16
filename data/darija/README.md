# Darija: spelling guide

Moroccan Darija as spoken in Casablanca, for French speakers. Every Darija text is written
twice: Arabic script (`de` in the data, shown big and read by the recorded voice) and Latin
"Arabizi" (`tr`, shown under it and what typed answers are checked against). Explanations,
glosses and tasks are in French.

There is no official spelling, so lessons follow this one and every review pass checks it.

## Arabic script

- Spell words as Moroccans write them online, not as in MSA: ف (not في), ديال, واش, شنو,
  بزاف, دابا, كنبغي.
- No vowel marks (harakat), except a shadda where a word is ambiguous without it.
- The verb prefix ك is joined: كنسكن, كتخدم.

## Latin (Arabizi)

| Sound | Latin | Arabic | Example |
|---|---|---|---|
| ʿayn | 3 | ع | 3afak (s'il te plaît) |
| ḥ | 7 | ح | 7na (nous) |
| q | 9 | ق | 9hwa (café) |
| kh | kh | خ | khoya (mon frère) |
| gh | gh | غ | bghit (je veux) |
| ch | ch | ش | chno (quoi) |
| ou | ou | و (vowel) | nouss (moitié) |
| w | w | و (consonant) | wach (est-ce que) |
| y | y | ي (consonant) | mzyan (bien) |

- Short vowels only where Moroccans say them: bzzaf, mzyan, chokran, smiti.
- No capitals, no apostrophes inside words.

## What typed answers accept

Checked in `src/lib/darija.ts`: case, punctuation and spaces don't count; sh = ch, 5 = kh,
q = 9; ou, o, u and w are one sound (houwa = howa, ou nta = w nta), and so are y and i
(dair = dayr); doubled letters = single (bzaf = bzzaf); a written `e` next to a consonant may
be left out (mezyan = mzyan, enta = nta). One letter off is "almost".

