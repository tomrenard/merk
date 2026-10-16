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


## Decisions taken while writing A1

- The article in Latin shows how it is said: `l` before moon letters (lbare7, lmdina,
  l9hwa), doubled first letter before sun letters (ssalam, ddar, ttobis, ssa3a). Arabic always
  writes ال.
- Negation is one word in both scripts: ماعنديش ma3ndich, ماكاينش makaynch, مابغيتش mabghitch.
  The answers also accept it split (ma bghitch), since spaces don't count.
- Numbers: wa7ed, jouj, tlata, rb3a, khamsa, stta, sb3a, tmnya, ts3a, 3achra; 7dach, tnach,
  tlettach, rb3tach, khmstach, settach, sb3tach, tmentach, ts3tach, 3chrin; in compounds 2 is
  tnin (tnin w 3chrin). After 3–10 the noun is plural (tlata drahem), after 11+ singular
  (3chrin dirham).
- ج is a moon letter (ljem3a, ljouj); د, ش, ت, ر, س, ص, ز, ن… are sun letters (ddwa, cchta,
  ttbib, rrbat).
- Rain and sun are feminine: kayna cchta, kayna cchems; clouds and cold: kayn ss7ab, kayn lberd.
- Excuse me: sme7 liya / sm7i liya (to a woman).
- Present with ka- (كن، كت، كي): kanskon, katskon, kayskon; to a woman katskni.
- Future: ghadi / ghadya / ghadyin + verb.
