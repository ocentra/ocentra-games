# Gap-Fill: Consolidated Checklist (TEMP)

**Single source for AI context.** Game names, JSON path, URLs, local HTML status.
**â†’ Read [GameReadyValidation.md](GameReadyValidation.md) for workflow and Ready Gate.**

---

## Format

- **Names** = all aliases for this game (alsoKnownAs candidates)
- **JSON** = canonical file in `src/processed-games/`
- **URLs** = all sources (Pagat, Wikipedia, etc. from game_names_pagat.txt in src/schema/)
- **Local HTML** = âœ“ with file(s) if SourceHtml/ has cached copy, âœ— if needs fetch

**Validation:** `npm run validate` or `npx tsx src/scripts/validate-with-ts-schema.ts src/processed-games/<id>.json [--skip-url-check]`

---

### A

- 1 : [x] **Abyssinia Poker**
  - JSON: [abyssinia-poker.json](../src/processed-games/abyssinia-poker.json)
  - URLs: https://www.pagat.com/poker/variants/buyyourcard.html#abyssinia | https://en.wikipedia.org/wiki/Poker | https://en.wikipedia.org/wiki/Poker_variants
  - Local HTML: âœ“ (pagat-buy-your-card.html, wiki-poker.html)

- 2 : [x] **Accordion**
  - JSON: [accordion.json](../src/processed-games/accordion.json)
  - URLs: https://en.wikipedia.org/wiki/Accordion_(card_game)
  - Local HTML: âœ“ (wiki-accordion-alt.html, wiki-accordion.html)

- 3 : [x] **Ace To Five Lowball**
  - JSON: [ace-to-five-lowball.json](../src/processed-games/ace-to-five-lowball.json)
  - URLs: https://www.pagat.com/poker/variants/lowball.html#california | https://en.wikipedia.org/wiki/Lowball_(poker)
  - Local HTML: âœ“ (pagat-lowball.html, wiki-2-7-triple-draw.html, wiki-lowball-poker-2.html, wiki-lowball-poker.html)

- 4 : [x] **Ace To Six Lowball**
  - JSON: [ace-to-six-lowball.json](../src/processed-games/ace-to-six-lowball.json)
  - URLs: https://www.pagat.com/poker/variants/lowball.html#acetosix | https://en.wikipedia.org/wiki/Lowball_(poker)
  - Local HTML: âœ“ (pagat-lowball.html, wiki-2-7-triple-draw.html, wiki-lowball-poker-2.html, wiki-lowball-poker.html)

- 5 : [x] **Ace-To-Six Lowball (Draw) Poker**
  - JSON: [ace-to-six-lowball-draw-poker.json](../src/processed-games/ace-to-six-lowball-draw-poker.json)
  - URLs: https://www.pagat.com/poker/variants/lowball.html#acetosix | https://en.wikipedia.org/wiki/Lowball_(poker)
  - Local HTML: âœ“ (pagat-lowball.html, wiki-2-7-triple-draw.html, wiki-lowball-poker-2.html, wiki-lowball-poker.html)

- 6 : [x] **Aces Up**
  - JSON: [aces-up.json](../src/processed-games/aces-up.json)
  - URLs: https://www.pagat.com/patience/acesup.html | https://en.wikipedia.org/wiki/Aces_Up | https://www.pagat.com/solitaire/card.html
  - Local HTML: âœ“ (pagat-solitaire.html, wiki-aces-up.html)

- 7 : [x] **Aces, Straights and Flushes Poker**
  - JSON: [aces-straights-and-flushes-poker.json](../src/processed-games/aces-straights-and-flushes-poker.json)
  - URLs: https://www.pagat.com/poker/variants/7stud.html#ace_straight_flush | https://en.wikipedia.org/wiki/Seven-card_stud
  - Local HTML: âœ“ (pagat-seven-card-stud.html, wiki-seven-card-stud.html)

- 8 : [x] **Aggravation Speed**
  - JSON: [aggravation-speed.json](../src/processed-games/aggravation-speed.json)
  - URLs: https://www.pagat.com/patience/california_speed.html#aggravation | https://en.wikipedia.org/wiki/Speed_(card_game)
  - Local HTML: âœ“ (pagat-california-speed.html, wiki-speed-2.html, wiki-speed-4.html, wiki-speed.html)

- 9 : [x] **Agram**
  - JSON: [agram.json](../src/processed-games/agram.json)
  - URLs: https://www.pagat.com/last/agram.html | https://en.wikipedia.org/wiki/Last_Card | https://en.wikipedia.org/wiki/Agram_(card_game)
  - Local HTML: âœ“ (pagat-agram.html, wiki-agram-2.html, wiki-agram.html)

- 10 : [x] **Albastini**
  - JSON: [albastini.json](../src/processed-games/albastini.json)
  - URLs: https://www.pagat.com/aceten/albastini.html | https://en.wikipedia.org/wiki/Tressette | https://en.wikipedia.org/wiki/Bisca_(card_game)
  - Local HTML: âœ“ (pagat-albastini.html, wiki-bisca.html, wiki-tressette-2.html, wiki-tressette.html)

- 11 : [x] **Alcalde**
  - JSON: [alcalde.json](../src/processed-games/alcalde.json)
  - URLs: https://www.pagat.com/aceten/alcalde.html | https://en.wikipedia.org/wiki/Tressette | https://members.tripod.com/~j_carrillo_vii/Briscas1.htm
  - Local HTML: âœ“ (pagat-alcalde.html, wiki-tressette-2.html, wiki-tressette.html)

- 12 : [x] **Algerian**
  - JSON: [algerian.json](../src/processed-games/algerian.json)
  - URLs: https://en.wikipedia.org/wiki/Algerian_(card_game)
  - Local HTML: âœ“ (wiki-algerian-card-game.html)

- 13 : [x] **Alkort**
  - JSON: [alkort.json](../src/processed-games/alkort.json)
  - URLs: https://www.pagat.com/karnoeffel/alkort.html | https://en.wikipedia.org/wiki/Karn%C3%B6ffel
  - Local HTML: âœ“ (pagat-alkort.html, wiki-karnffel.html, wiki-karnoeffel.html)

- 14 : [x] **All Fives cards**
  - JSON: [all-fives-cards.json](../src/processed-games/all-fives-cards.json)
  - URLs: https://www.pagat.com/allfours/allfives.html | https://en.wikipedia.org/wiki/All_fours_(card_game) | https://web.archive.org/web/20021201161652/w3.one.net/~dbarker/cards/all-fives.html
  - Local HTML: âœ“ (pagat-allfives.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 15 : [x] **All Fives dominoes**
  - JSON: [all-fives-dominoes.json](../src/processed-games/all-fives-dominoes.json)
  - URLs: https://www.pagat.com/domino/cross/all_fives.html | https://en.wikipedia.org/wiki/Dominoes | https://en.wikipedia.org/wiki/Muggins
  - Local HTML: âœ“ (pagat-domino-all-fives.html, wiki-dominoes.html, wiki-muggins.html)

- 16 : [x] **All for One and One for All Poker**
  - JSON: [all-for-one-and-one-for-all-poker.json](../src/processed-games/all-for-one-and-one-for-all-poker.json)
  - URLs: https://www.pagat.com/poker/variants/5draw.html#allforone | https://en.wikipedia.org/wiki/Poker | https://en.wikipedia.org/wiki/Five-card_draw
  - Local HTML: âœ“ (pagat-five-card-draw.html, wiki-five-card-draw.html, wiki-poker.html)

- 17 : [x] **All Fours | Old Sledge | Seven Up**
  - JSON: [all-fours.json](../src/processed-games/all-fours.json)
  - URLs: https://www.pagat.com/allfours/allfours.html | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (pagat-allfours-game.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 18 : [x] **All Fours 17th Century**
  - JSON: [all-fours-17th-century.json](../src/processed-games/all-fours-17th-century.json)
  - URLs: https://www.pagat.com/allfours/allfours.html | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (pagat-allfours-game.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 19 : [x] **All Fours Lancashire**
  - JSON: [all-fours-lancashire.json](../src/processed-games/all-fours-lancashire.json)
  - URLs: https://www.pagat.com/allfours/allfours.html | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (pagat-allfours-game.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 20 : [x] **All Fours North American**
  - JSON: [all-fours-north-american.json](../src/processed-games/all-fours-north-american.json)
  - URLs: https://www.pagat.com/allfours/allfours.html | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (pagat-allfours-game.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 21 : [x] **All Fours Trinidad**
  - JSON: [all-fours-trinidad.json](../src/processed-games/all-fours-trinidad.json)
  - URLs: https://www.pagat.com/allfours/allfours.html | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (pagat-allfours-game.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 22 : [x] **All Fours Yorkshire**
  - JSON: [all-fours-yorkshire.json](../src/processed-games/all-fours-yorkshire.json)
  - URLs: https://www.pagat.com/allfours/allfours.html | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (pagat-allfours-game.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 23 : [x] **All Threes Dominoes**
  - JSON: [all-threes-dominoes.json](../src/processed-games/all-threes-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/muggins.html#all_threes | https://en.wikipedia.org/wiki/Dominoes | https://en.wikipedia.org/wiki/Muggins
  - Local HTML: âœ“ (pagat-muggins.html, wiki-dominoes.html, wiki-muggins.html)

- 24 : [x] **AlsÃ³s**
  - JSON: [alsos.json](../src/processed-games/alsos.json)
  - URLs: https://www.pagat.com/jass/alsos.html | https://en.wikipedia.org/wiki/Jass | https://en.wikipedia.org/wiki/Als%C3%B3s
  - Local HTML: âœ“ (pagat-alsos.html, wiki-alsos-alt.html, wiki-alsos.html, wiki-alss.html, wiki-jass-3.html, wiki-jass.html)

- 25 : [x] **Aluette | Vache, jeu de la**
  - JSON: [aluette.json](../src/processed-games/aluette.json)
  - URLs: https://www.pagat.com/put/aluette.html | https://en.wikipedia.org/wiki/Aluette
  - Local HTML: âœ“ (pagat-aluette.html, wiki-aluette-2.html, wiki-aluette.html)

- 26 : [x] **Amerikaner**
  - JSON: [amerikaner.json](../src/processed-games/amerikaner.json)
  - URLs: https://www.pagat.com/boston/amerikaner.html | https://en.wikipedia.org/wiki/Boston_(card_game)
  - Local HTML: âœ“ (pagat-amerikaner.html, wiki-boston-4.html, wiki-boston.html)

- 27 : [x] **Anaconda**
  - JSON: [anaconda.json](../src/processed-games/anaconda.json)
  - URLs: https://www.pagat.com/poker/variants/passthetrash.html#trash | https://en.wikipedia.org/wiki/Poker | https://en.wikipedia.org/wiki/Anaconda_(poker)
  - Local HTML: âœ“ (pagat-pass-the-trash.html, wiki-anaconda-poker.html, wiki-poker.html)

- 28 : [x] **Andar Bahar | Mangatha à®®à®™à¯à®•à®¾à®¤à¯à®¤ | Ullae Veliyae**
  - JSON: [andar-bahar.json](../src/processed-games/andar-bahar.json)
  - URLs: https://www.pagat.com/banking/andar_bahar.html | https://en.wikipedia.org/wiki/Matka_gambling | https://www.coololdgames.com/card-games/gambling/andar-bahar/
  - Local HTML: âœ“ (pagat-andar-bahar.html, wiki-matka-gambling.html)

- 29 : [x] **Animals**
  - JSON: [animals.json](../src/processed-games/animals.json)
  - URLs: https://www.pagat.com/war/snap.html#animals | https://en.wikipedia.org/wiki/War_(card_game) | https://en.wikipedia.org/wiki/Snap_(card_game)
  - Local HTML: âœ“ (pagat-snap.html, wiki-snap-3.html, wiki-snap.html, wiki-war-3.html, wiki-war.html)

- 30 : [x] **Anrufen**
  - JSON: [anrufen.json](../src/processed-games/anrufen.json)
  - URLs: https://www.pagat.com/marriage/anrufen.html#anrufen | https://en.wikipedia.org/wiki/Bezique | https://en.wikipedia.org/wiki/Schafkopf
  - Local HTML: âœ“ (pagat-anrufen.html, wiki-bezique-2.html, wiki-bezique.html, wiki-schafkopf-3.html, wiki-schafkopf.html)

- 31 : [x] **Arba'a Turub**
  - JSON: [arba-a-turub.json](../src/processed-games/arba-a-turub.json)
  - URLs: https://www.pagat.com/whist/arpaa_turup.html | https://en.wikipedia.org/wiki/Whist | https://en.wikipedia.org/wiki/Turup
  - Local HTML: âœ“ (pagat-arpaa-turup.html, wiki-turup.html, wiki-whist-4.html, wiki-whist.html)

- 32 : [x] **Archie**
  - JSON: [archie.json](../src/processed-games/archie.json)
  - URLs: https://www.pagat.com/poker/variants/5draw.html#archie
  - Local HTML: âœ“ (pagat-five-card-draw.html)

- 33 : [x] **Archie Poker**
  - JSON: [archie-poker.json](../src/processed-games/archie-poker.json)
  - URLs: https://www.pagat.com/poker/variants/5draw.html#archie | https://en.wikipedia.org/wiki/Poker | https://en.wikipedia.org/wiki/Five-card_draw
  - Local HTML: âœ“ (pagat-five-card-draw.html, wiki-five-card-draw.html, wiki-poker.html)

- 34 : [x] **Arizona 29-card Pitch**
  - JSON: [arizona-29-card-pitch.json](../src/processed-games/arizona-29-card-pitch.json)
  - URLs: https://www.pagat.com/allfours/pitch.html#29-card | https://en.wikipedia.org/wiki/Pitch_(card_game)
  - Local HTML: âœ“ (pagat-pitch.html, wiki-pitch-5.html, wiki-pitch.html)

- 35 : [x] **Arlington | Fortune Rummy | Oklahoma Rummy**
  - JSON: [arlington.json](../src/processed-games/arlington.json)
  - URLs: https://www.pagat.com/rummy/arlington.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-arlington.html, wiki-rummy-4.html, wiki-rummy.html)

- 36 : [x] **Asserufen Schafkopf | Schafkopf Palatinate**
  - JSON: [asserufen-schafkopf.json](../src/processed-games/asserufen-schafkopf.json)
  - URLs: https://www.pagat.com/schafkopf/palatinate.html | https://en.wikipedia.org/wiki/Schafkopf
  - Local HTML: âœ“ (pagat-palatinate.html, wiki-schafkopf-3.html, wiki-schafkopf.html)

- 37 : [x] **Asso Pigliatutto**
  - JSON: [asso-pigliatutto-scopa.json](../src/processed-games/asso-pigliatutto-scopa.json)
  - URLs: https://www.pagat.com/fishing/scopa.html#pigliatutto | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-scopa.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 38 : [x] **Asszorti**
  - JSON: [asszorti.json](../src/processed-games/asszorti.json)
  - URLs: https://www.pagat.com/preference/asszorti.html | https://en.wikipedia.org/wiki/Pr%C3%A9f%C3%A9rence | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-asszorti.html, wiki-jass-3.html, wiki-jass.html, wiki-preference.html, wiki-prfrence.html)

- 39 : [x] **Auction Bridge**
  - JSON: [auction-bridge.json](../src/processed-games/auction-bridge.json)
  - URLs: https://www.pagat.com/auctionwhist/bridge.html | https://en.wikipedia.org/wiki/Whist | https://en.wikipedia.org/wiki/Auction_bridge
  - Local HTML: âœ“ (pagat-bridge.html, wiki-auction-bridge-2.html, wiki-auction-bridge.html, wiki-whist-4.html, wiki-whist.html)

- 40 : [x] **Auction Draw Dominoes**
  - JSON: [auction-draw-dominoes.json](../src/processed-games/auction-draw-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/auction.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-auction.html, wiki-dominoes.html)

- 41 : [x] **Auction Forty-Fives | 120 | 45s | Forty-Fives | One Hundred and Twenty**
  - JSON: [auction-forty-fives.json](../src/processed-games/auction-forty-fives.json)
  - URLs: https://www.pagat.com/spoil5/45.html | https://en.wikipedia.org/wiki/Forty-fives
  - Local HTML: âœ“ (pagat-spoil-five-45.html, wiki-forty-fives-2.html, wiki-forty-fives-3.html, wiki-forty-fives.html)

- 42 : [x] **Auction Poker**
  - JSON: [auction-poker.json](../src/processed-games/auction-poker.json)
  - URLs: https://www.pagat.com/poker/variants/buyyourcard.html#auction | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-buy-your-card.html, wiki-poker.html)

- 43 : [x] **Australian Patience**
  - JSON: [australian-patience.json](../src/processed-games/australian-patience.json)
  - URLs: https://www.pagat.com/patience/australian.html | https://en.wikipedia.org/wiki/Patience_(game) | https://en.wikipedia.org/wiki/Australian_Patience
  - Local HTML: âœ“ (pagat-australian.html, wiki-australian-patience-2.html, wiki-australian-patience.html, wiki-patience.html)

- 44 : [x] **Austrian Dominoes**
  - JSON: [austrian-dominoes.json](../src/processed-games/austrian-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/austrian.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-austrian.html, wiki-dominoes.html)

- 45 : [x] **Authors**
  - JSON: [authors.json](../src/processed-games/authors.json)
  - URLs: https://www.pagat.com/quartet/gofish.html#authors | https://en.wikipedia.org/wiki/Happy_Families | https://en.wikipedia.org/wiki/Authors_(card_game)
  - Local HTML: âœ“ (pagat-gofish.html, wiki-authors-2.html, wiki-authors-alt.html, wiki-authors.html, wiki-happy-families.html)

- 46 : [x] **Avinas**
  - JSON: [avinas.json](../src/processed-games/avinas.json)
  - URLs: https://www.pagat.com/schafkopf/avinas.html | https://en.wikipedia.org/wiki/Schafkopf
  - Local HTML: âœ“ (pagat-avinas.html, wiki-schafkopf-3.html, wiki-schafkopf.html)

### B

- 47 : [x] **Baccarat Ã  Deux Tableaux Baccarat Banque**
  - JSON: [baccarat-deux-tableaux-baccarat-banque.json](../src/processed-games/baccarat-deux-tableaux-baccarat-banque.json)
  - URLs: https://www.pagat.com/banking/baccarat.html#banque
  - Local HTML: âœ“ (pagat-baccarat.html)

- 48 : [x] **Baccarat Chemin de Fer | Chemin de Fer Baccarat**
  - JSON: [chemin-de-fer.json](../src/processed-games/chemin-de-fer.json)
  - URLs: https://www.pagat.com/banking/baccarat.html#chemindefer | https://en.wikipedia.org/wiki/Baccarat
  - Local HTML: âœ“ (pagat-baccarat.html, wiki-baccarat-alt.html, wiki-baccarat.html)

- 49 : [x] **Baccarat Punto Banco**
  - JSON: [baccarat-punto-banco.json](../src/processed-games/baccarat-punto-banco.json)
  - URLs: https://www.pagat.com/banking/baccarat.html | https://en.wikipedia.org/wiki/Baccarat
  - Local HTML: âœ“ (pagat-baccarat.html, wiki-baccarat-alt.html, wiki-baccarat.html)

- 50 : [x] **BÃ¡ciga**
  - JSON: [baciga.json](../src/processed-games/baciga.json)
  - URLs: https://www.pagat.com/fishing/chorizo.html#baciga | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-chorizo.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 51 : [x] **Back Alley | Back Street Bridge | Blooper**
  - JSON: [back-alley.json](../src/processed-games/back-alley.json)
  - URLs: https://www.pagat.com/auctionwhist/backalley.html | https://en.wikipedia.org/wiki/Whist | https://en.wikipedia.org/wiki/Bluke
  - Local HTML: âœ“ (pagat-backalley.html, wiki-bluke-2.html, wiki-bluke.html, wiki-whist-4.html, wiki-whist.html)

- 52 : [x] **Backstab Fish**
  - JSON: [backstab-fish.json](../src/processed-games/backstab-fish.json)
  - URLs: https://www.pagat.com/quartet/gofish.html#australia | https://en.wikipedia.org/wiki/Happy_Families | https://en.wikipedia.org/wiki/Go_Fish
  - Local HTML: âœ“ (pagat-gofish.html, wiki-go-fish-2.html, wiki-go-fish.html, wiki-happy-families.html)

- 53 : [x] **Badacey**
  - JSON: [badacey.json](../src/processed-games/badacey.json)
  - URLs: https://wizardofodds.com/games/poker/badeucy-badacey/
  - Local HTML: âœ“ (wizardofodds-badeucy-badacey.html)

- 54 : [x] **Badeucy**
  - JSON: [badeucy.json](../src/processed-games/badeucy.json)
  - URLs: https://wizardofodds.com/games/poker/badeucy-badacey/
  - Local HTML: âœ“ (wizardofodds-badeucy-badacey.html)

- 55 : [x] **Badugi | Off Suit Lowball | Progressive Badugi | Progressive Badugi with a Buy**
  - JSON: [badugi.json](../src/processed-games/badugi.json)
  - URLs: https://www.pagat.com/poker/variants/badugi.html | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/badugi.html#progressive
  - Local HTML: âœ“ (pagat-badugi.html, wiki-poker.html)

- 56 : [x] **Bagchen | Pagchen**
  - JSON: [bagchen.json](../src/processed-games/bagchen.json)
  - URLs: https://www.pagat.com/domino/trick/bagchen.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-bagchen.html, wiki-dominoes.html)

- 57 : [x] **Baloot**
  - JSON: [baloot.json](../src/processed-games/baloot.json)
  - URLs: https://www.pagat.com/jass/baloot.html | https://en.wikipedia.org/wiki/Jass | https://en.wikipedia.org/wiki/Baloot
  - Local HTML: âœ“ (pagat-baloot.html, wiki-baloot.html, wiki-jass-3.html, wiki-jass.html)

- 58 : [x] **Bam**
  - JSON: [bam.json](../src/processed-games/bam.json)
  - URLs: https://catsatcards.com/Games/Pluck.html
  - Local HTML: âœ“ (catsatcards-pluck.html)

- 59 : [x] **Banakil**
  - JSON: [banakil.json](../src/processed-games/banakil.json)
  - URLs: https://www.pagat.com/rummy/banakil.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-banakil.html, wiki-rummy-4.html, wiki-rummy.html)

- 60 : [x] **Banca**
  - JSON: [banca.json](../src/processed-games/banca.json)
  - URLs: https://www.pagat.com/banking/baccarat.html
  - Local HTML: âœ“ (pagat-baccarat.html)

- 61 : [x] **Bandar Q**
  - JSON: [bandar-q.json](../src/processed-games/bandar-q.json)
  - URLs: https://www.pagat.com/domino/adding/bandar_q.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-bandar-q.html, wiki-dominoes.html)

- 62 : [x] **BÄƒo HuÃ¡ng ä¿çš‡ | DÃ¬wÃ¡ng å¸çŽ‹**
  - JSON: [bao-huang.json](../src/processed-games/bao-huang.json)
  - URLs: https://www.pagat.com/climbing/baohuang.html | https://en.wikipedia.org/wiki/Dou_dizhu
  - Local HTML: âœ“ (pagat-baohuang.html, wiki-dou-dizhu.html)

- 63 : [x] **Barbu**
  - JSON: [barbu.json](../src/processed-games/barbu.json)
  - URLs: https://www.pagat.com/compendium/barbu.html | https://en.wikipedia.org/wiki/Barbu_(card_game) | https://en.wikipedia.org/wiki/Barbu
  - Local HTML: âœ“ (pagat-barbu.html, wiki-barbu-2.html, wiki-barbu-alt.html, wiki-barbu.html)

- 64 : [x] **Bartok**
  - JSON: [bartok.json](../src/processed-games/bartok.json)
  - URLs: https://www.pagat.com/eights/bartog.html | https://en.wikipedia.org/wiki/Bartok_(card_game)
  - Local HTML: âœ“ (pagat-bartog.html, wiki-bartok-alt.html, wiki-bartok.html)

- 65 : [x] **Baseball**
  - JSON: [baseball.json](../src/processed-games/baseball.json)
  - URLs: https://www.pagat.com/poker/variants/baseball.html
  - Local HTML: âœ“ (pagat-baseball-poker.html)

- 66 : [x] **Baseball Poker | Football Poker | Good, the Bad and the Ugly, The Poker | Howdy Doody Poker | Midnight Baseball Poker | Night Baseball Poker | No Peek Baseball Poker**
  - JSON: [baseball-poker.json](../src/processed-games/baseball-poker.json)
  - URLs: https://www.pagat.com/poker/variants/baseball.html#baseball | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/baseball.html#baseball_vars | https://www.pagat.com/poker/variants/baseball.html#gbu | https://www.pagat.com/poker/variants/baseball.html#howdy | https://www.pagat.com/poker/variants/baseball.html#night
  - Local HTML: âœ“ (pagat-baseball-poker.html, wiki-poker.html)

- 67 : [x] **BaÅ›ka**
  - JSON: [ba-ka.json](../src/processed-games/ba-ka.json)
  - URLs: https://www.pagat.com/schafkopf/kop.html#baska | https://en.wikipedia.org/wiki/Schafkopf
  - Local HTML: âœ“ (pagat-kop.html, wiki-schafkopf-3.html, wiki-schafkopf.html)

- 68 : [x] **Basra**
  - JSON: [basra.json](../src/processed-games/basra.json)
  - URLs: https://www.pagat.com/fishing/basra.html | https://en.wikipedia.org/wiki/Scopa | https://en.wikipedia.org/wiki/Bastra
  - Local HTML: âœ“ (pagat-basra.html, wiki-bastra.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 69 : [x] **Bastard Brag**
  - JSON: [bastard-brag.json](../src/processed-games/bastard-brag.json)
  - URLs: https://www.pagat.com/commerce/bastard_brag.html | https://en.wikipedia.org/wiki/Schwimmen | https://en.wikipedia.org/wiki/Brag_(card_game)
  - Local HTML: âœ“ (pagat-bastard-brag.html, wiki-brag-4.html, wiki-brag.html, wiki-schwimmen.html)

- 70 : [x] **Bauernschnapsen | Schnapsen | Talon-Schnapsen**
  - JSON: [bauernschnapsen.json](../src/processed-games/bauernschnapsen.json)
  - URLs: https://www.pagat.com/marriage/bauernschnapsen.html | https://en.wikipedia.org/wiki/Bezique | https://www.pagat.com/marriage/schnapsen.html | https://en.wikipedia.org/wiki/Schnapsen | https://www.pagat.com/marriage/schnapsen.html#talon
  - Local HTML: âœ“ (pagat-bauernschnapsen.html, wiki-bezique-2.html, wiki-bezique.html, wiki-schnapsen-2.html, wiki-schnapsen.html)

- 71 : [x] **Bauernstoss**
  - JSON: [bauernstoss.json](../src/processed-games/bauernstoss.json)
  - URLs: https://www.pagat.com/schafkopf/bauernstoss.html | https://en.wikipedia.org/wiki/Schafkopf
  - Local HTML: âœ“ (pagat-bauernstoss.html, wiki-schafkopf-3.html, wiki-schafkopf.html)

- 72 : [x] **Be-Ranga Double Sar**
  - JSON: [be-ranga-double-sar.json](../src/processed-games/be-ranga-double-sar.json)
  - URLs: https://www.pagat.com/whist/rang.html#beranga | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-rang.html, wiki-whist-4.html, wiki-whist.html)

- 73 : [x] **Beccaccino**
  - JSON: [marafon-beccaccino.json](../src/processed-games/marafon-beccaccino.json)
  - URLs: https://www.pagat.com/tressette/beccaccino.html | https://en.wikipedia.org/wiki/Tressette
  - Local HTML: âœ“ (pagat-beccaccino.html, wiki-tressette-2.html, wiki-tressette.html)

- 74 : [x] **Beggar My Neighbour | Bataille Corse | Beat Your Neighbour Out of Doors | Strip Jack Naked | Suck the Well | Taxes**
  - JSON: [beggar-my-neighbour.json](../src/processed-games/beggar-my-neighbour.json)
  - URLs: https://www.pagat.com/war/beggar_my_neighbour.html | https://en.wikipedia.org/wiki/War_(card_game) | https://en.wikipedia.org/wiki/Beggar-my-neighbour | https://en.wikipedia.org/wiki/Beggar_My_Neighbour
  - Local HTML: âœ“ (pagat-beggar-my-neighbour.html, wiki-beggar-my-neighbour-alt.html, wiki-beggar-my-neighbour.html, wiki-war-3.html, wiki-war.html)

- 75 : [x] **Beleaguered Castle**
  - JSON: [beleaguered-castle.json](../src/processed-games/beleaguered-castle.json)
  - URLs: https://www.pagat.com/solitaire/castle.html
  - Local HTML: âœ“ (wiki-beleaguered-castle.html, wiki-streets-alleys.html)

- 76 : [x] **Belote**
  - JSON: [belote.json](../src/processed-games/belote.json)
  - URLs: https://www.pagat.com/jass/belote.html | https://en.wikipedia.org/wiki/Jass | https://en.wikipedia.org/wiki/Belote
  - Local HTML: âœ“ (pagat-belote.html, wiki-belote.html, wiki-jass-3.html, wiki-jass.html)

- 77 : [x] **Belote CoinchÃ©e**
  - JSON: [belote-coinch-e.json](../src/processed-games/belote-coinch-e.json)
  - URLs: https://www.pagat.com/jass/coinche.html | https://en.wikipedia.org/wiki/Jass | https://en.wikipedia.org/wiki/Coinche
  - Local HTML: âœ“ (pagat-coinche.html, wiki-coinche.html, wiki-jass-3.html, wiki-jass.html)

- 78 : [x] **Belote DÃ©couverte**
  - JSON: [belote-decouverte.json](../src/processed-games/belote-decouverte.json)
  - URLs: https://www.pagat.com/jass/belote.html#belote-for-2 | https://en.wikipedia.org/wiki/Jass | https://www.pagat.com/jass/belote.html | https://en.wikipedia.org/wiki/Belote
  - Local HTML: âœ“ (pagat-belote.html, wiki-belote.html, wiki-jass-3.html, wiki-jass.html)

- 79 : [x] **Bergen**
  - JSON: [bergen.json](../src/processed-games/bergen.json)
  - URLs: https://www.pagat.com/domino/line/bergen.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-bergen.html, wiki-dominoes.html)

- 80 : [x] **Bestia**
  - JSON: [bestia.json](../src/processed-games/bestia.json)
  - URLs: https://www.pagat.com/rams/bestia.html | https://en.wikipedia.org/wiki/Rams_(card_game)
  - Local HTML: âœ“ (pagat-bestia.html, wiki-rams-4.html, wiki-rams.html)

- 81 : [x] **Bezique**
  - JSON: [bezique.json](../src/processed-games/bezique.json)
  - URLs: https://www.pagat.com/marriage/bezique.html | https://en.wikipedia.org/wiki/Bezique
  - Local HTML: âœ“ (pagat-bezique.html, wiki-bezique-2.html, wiki-bezique.html)

- 82 : [x] **Bhabhi Getaway**
  - JSON: [bhabhi-getaway.json](../src/processed-games/bhabhi-getaway.json)
  - URLs: https://www.pagat.com/inflation/getaway.html
  - Local HTML: âœ“ (pagat-getaway.html)

- 83 : [x] **Bid Euchre**
  - JSON: [bid-euchre.json](../src/processed-games/bid-euchre.json)
  - URLs: https://www.pagat.com/euchre/bideuch.html | https://en.wikipedia.org/wiki/Euchre | https://en.wikipedia.org/wiki/Bid_Euchre
  - Local HTML: âœ“ (pagat-bideuch.html, wiki-bid-euchre.html, wiki-euchre-3.html, wiki-euchre.html)

- 84 : [x] **Bid Whist | Whist Bid**
  - JSON: [bid-whist.json](../src/processed-games/bid-whist.json)
  - URLs: https://www.pagat.com/auctionwhist/bidwhist.html | https://en.wikipedia.org/wiki/Whist | https://en.wikipedia.org/wiki/Bid_whist
  - Local HTML: âœ“ (pagat-bidwhist.html, wiki-bid-whist-2.html, wiki-bid-whist.html, wiki-whist-4.html, wiki-whist.html)

- 85 : [x] **Bieten**
  - JSON: [bieten.json](../src/processed-games/bieten.json)
  - URLs: https://www.pagat.com/last/bieten.html | https://en.wikipedia.org/wiki/Last_Card | https://en.wikipedia.org/wiki/Schafkopf
  - Local HTML: âœ“ (pagat-bieten.html, wiki-schafkopf-3.html, wiki-schafkopf.html)

- 86 : [x] **Big A æ‰“å¤§A**
  - JSON: [big-a.json](../src/processed-games/big-a.json)
  - URLs: https://www.pagat.com/climbing/bigA.html
  - Local HTML: âœ“ (pagat-climbing-big-ace.html)

- 87 : [x] **Big Three | Da San å¤§ä¸‰ | Dig Pit | Wa Keng æŒ–å‘**
  - JSON: [big-three.json](../src/processed-games/big-three.json)
  - URLs: https://www.pagat.com/climbing/bigthree.html | https://en.wikipedia.org/wiki/Big_two
  - Local HTML: âœ“ (pagat-big-three.html, wiki-big-two.html)

- 88 : [x] **Big Two | Bu Bu Gao Sheng æ­¥æ­¥é«˜æ˜‡ | Choh Dai Di é‹¤å¤§D | Da Lao Er å¤§è€äºŒ | Dai Di å¤§åœ° | Deuces | Pusoy Dos | SjalaliÃ«n**
  - JSON: [big-two.json](../src/processed-games/big-two.json)
  - URLs: https://www.pagat.com/climbing/bigtwo.html | https://en.wikipedia.org/wiki/Big_two
  - Local HTML: âœ“ (pagat-big-two.html, wiki-big-two.html)

- 89 : [x] **Billitonnen**
  - JSON: [billitonnen.json](../src/processed-games/billitonnen.json)
  - URLs: https://www.pagat.com/domino/line/blind_hughie.html#billitonnen | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-blind-hughie.html, wiki-dominoes.html)

- 90 : [x] **Binglao poker**
  - JSON: [binglao-poker.json](../src/processed-games/binglao-poker.json)
  - URLs: https://www.pagat.com/poker/variants/omaha.html#binglao | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-omaha.html, wiki-poker.html)

- 91 : [x] **Bingo Card | Bango | Card Bingo | Hoy!**
  - JSON: [bingo-card.json](../src/processed-games/bingo-card.json)
  - URLs: https://www.pagat.com/banking/bingo.html | https://en.wikipedia.org/wiki/Bingo_(card_game)
  - Local HTML: âœ“ (pagat-banking-bingo.html, wiki-bingo-card-game.html, wiki-bingo-card.html, wiki-bingo.html)

- 92 : [x] **Bingo dominoes**
  - JSON: [bingo-dominoes.json](../src/processed-games/bingo-dominoes.json)
  - URLs: https://www.pagat.com/domino/trick/bingo.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-bingo.html, wiki-dominoes.html)

- 93 : [x] **Biriba Brazilian | Canastra Brazilian | Perida**
  - JSON: [buraco.json](../src/processed-games/buraco.json)
  - URLs: https://www.pagat.com/rummy/buraco.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-buraco.html, wiki-rummy-4.html, wiki-rummy.html)

- 94 : [x] **Biriba ÎœÏ€Î¹ÏÎ¯Î¼Ï€Î±**
  - JSON: [biriba.json](../src/processed-games/biriba.json)
  - URLs: https://www.pagat.com/rummy/biriba.html | https://en.wikipedia.org/wiki/Rummy | https://en.wikipedia.org/wiki/Buraco
  - Local HTML: âœ“ (pagat-biriba.html, wiki-buraco.html, wiki-rummy-4.html, wiki-rummy.html)

- 95 : [x] **Biritch**
  - JSON: [biritch.json](../src/processed-games/biritch.json)
  - URLs: https://www.pagat.com/auctionwhist/biritch.html | https://en.wikipedia.org/wiki/Whist | https://en.wikipedia.org/wiki/Contract_bridge
  - Local HTML: âœ“ (pagat-biritch.html, wiki-contract-bridge.html, wiki-whist-4.html, wiki-whist.html)

- 96 : [x] **Bisca**
  - JSON: [bisca.json](../src/processed-games/bisca.json)
  - URLs: https://www.pagat.com/aceten/bisca.html | https://en.wikipedia.org/wiki/Tressette | https://en.wikipedia.org/wiki/Bisca_(card_game)
  - Local HTML: âœ“ (pagat-bisca.html, wiki-bisca.html, wiki-tressette-2.html, wiki-tressette.html)

- 97 : [x] **Bismarck**
  - JSON: [bismarck.json](../src/processed-games/bismarck.json)
  - URLs: https://www.pagat.com/quotawhist/bismarck.html | https://en.wikipedia.org/wiki/Whist | https://en.wikipedia.org/wiki/Bid_whist
  - Local HTML: âœ“ (pagat-bismarck.html, wiki-bid-whist-2.html, wiki-bid-whist.html, wiki-whist-4.html, wiki-whist.html)

- 98 : [x] **Bitch, The Poker**
  - JSON: [bitch-the-poker.json](../src/processed-games/bitch-the-poker.json)
  - URLs: https://www.pagat.com/poker/variants/chicago.html#bitch | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-chicago-poker.html, wiki-poker.html)

- 99 : [x] **Black Maria**
  - JSON: [black-maria.json](../src/processed-games/black-maria.json)
  - URLs: https://www.pagat.com/reverse/hearts.html#blackmaria | https://en.wikipedia.org/wiki/Hearts_(card_game) | https://en.wikipedia.org/wiki/Black_Maria_(card_game)
  - Local HTML: âœ“ (pagat-hearts.html, wiki-black-maria-3.html, wiki-black-maria.html, wiki-hearts-3.html, wiki-hearts.html)

- 100 : [x] **Black Mariah Poker**
  - JSON: [black-mariah-poker.json](../src/processed-games/black-mariah-poker.json)
  - URLs: https://www.pagat.com/poker/variants/chicago.html#blackmariah | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-chicago-poker.html, wiki-poker.html)

- 101 : [x] **Blackjack 21 | 21 | Tournament Blackjack | Twenty-One**
  - JSON: [blackjack.json](../src/processed-games/blackjack.json)
  - URLs: https://www.pagat.com/banking/blackjack.html | https://www.pagat.com/banking/blackjack.html#tournament
  - Local HTML: âœ“ (pagat-blackjack.html)

- 102 : [x] **Blind Don**
  - JSON: [blind-don.json](../src/processed-games/blind-don.json)
  - URLs: https://www.pagat.com/allfours/don.html#blind | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (pagat-don.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 103 : [x] **Blind Hughie Dominoes**
  - JSON: [blind-hughie-dominoes.json](../src/processed-games/blind-hughie-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/blind_hughie.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-blind-hughie.html, wiki-dominoes.html)

- 104 : [x] **Blind-Watten | Ladinisch Watten**
  - JSON: [blind-watten.json](../src/processed-games/blind-watten.json)
  - URLs: https://www.pagat.com/trumps/watten.html
  - Local HTML: âœ“ (pagat-watten.html)

- 105 : [x] **Block Dominoes**
  - JSON: [block-dominoes.json](../src/processed-games/block-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/block.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-block.html, wiki-dominoes.html)

- 106 : [x] **Block Dominoes with Spinners**
  - JSON: [block-dominoes-with-spinners.json](../src/processed-games/block-dominoes-with-spinners.json)
  - URLs: https://www.pagat.com/domino/cross/block_sp.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-block-sp.html, wiki-dominoes.html)

- 107 : [x] **Bluff**
  - JSON: [bluff.json](../src/processed-games/bluff.json)
  - URLs: https://www.pagat.com/beating/doubt.html#bluff | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-doubt.html, wiki-durak-3.html, wiki-durak.html)

- 108 : [x] **Bock | Bog**
  - JSON: [poch-poker-ancestor.json](../src/processed-games/poch-poker-ancestor.json)
  - URLs: https://www.pagat.com/stops/poch.html | https://en.wikipedia.org/wiki/Michigan_(card_game)
  - Local HTML: âœ“ (pagat-poch.html, wiki-michigan.html)

- 109 : [x] **Boerenbridge**
  - JSON: [boerenbridge.json](../src/processed-games/boerenbridge.json)
  - URLs: https://www.pagat.com/exact/ohhell.html#boerenbridge | https://en.wikipedia.org/wiki/Oh_hell
  - Local HTML: âœ“ (pagat-oh-hell.html, wiki-oh-hell-3.html, wiki-oh-hell.html)

- 110 : [x] **Bonanza Pai Gow**
  - JSON: [bonanza-pai-gow.json](../src/processed-games/bonanza-pai-gow.json)
  - URLs: https://www.pagat.com/domino/partition/bonanza.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-bonanza.html, wiki-dominoes.html)

- 111 : [x] **Boodle | Michigan | Newmarket | Stops**
  - JSON: [michigan-rummy.json](../src/processed-games/michigan-rummy.json)
  - URLs: https://www.pagat.com/stops/michigan.html | https://en.wikipedia.org/wiki/Michigan_(card_game)
  - Local HTML: âœ“ (pagat-michigan.html, wiki-michigan.html)

- 112 : [x] **Boomke Wies**
  - JSON: [boomke-wies.json](../src/processed-games/boomke-wies.json)
  - URLs: https://www.pagat.com/auctionwhist/boomke-wies.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-boomke-wies.html, wiki-whist-4.html, wiki-whist.html)

- 113 : [x] **Boonaken**
  - JSON: [boonaken.json](../src/processed-games/boonaken.json)
  - URLs: https://www.pagat.com/jass/boonaken.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-boonaken.html, wiki-jass-3.html, wiki-jass.html)

- 114 : [x] **Boston**
  - JSON: [boston.json](../src/processed-games/boston.json)
  - URLs: https://www.pagat.com/boston/
  - Local HTML: âœ“ (pagat-boston-index.html, pagat-boston.html)

- 115 : [x] **Botifarra**
  - JSON: [botifarra.json](../src/processed-games/botifarra.json)
  - URLs: https://www.pagat.com/manille/botifar.html | https://en.wikipedia.org/wiki/Manille
  - Local HTML: âœ“ (pagat-botifar.html, wiki-manille-2.html, wiki-manille.html)

- 116 : [x] **Bouchon**
  - JSON: [pig-reaction.json](../src/processed-games/pig-reaction.json)
  - URLs: https://www.pagat.com/passing/pig.html
  - Local HTML: âœ“ (pagat-passing-pig.html)

- 117 : [x] **Bouillotte**
  - JSON: [bouillotte.json](../src/processed-games/bouillotte.json)
  - URLs: https://www.pagat.com/vying/bouillotte.html
  - Local HTML: âœ“ (pagat-vying-bouillotte.html)

- 118 : [x] **BourrÃ© | Boo-Ray**
  - JSON: [bourr.json](../src/processed-games/bourr.json)
  - URLs: https://www.pagat.com/rams/boure.html | https://en.wikipedia.org/wiki/Rams_(card_game) | https://en.wikipedia.org/wiki/Bourr%C3%A9
  - Local HTML: âœ“ (pagat-boure.html, wiki-bourr.html, wiki-bourre.html, wiki-rams-4.html, wiki-rams.html)

- 119 : [x] **Brag 3 Card**
  - JSON: [brag-3-card.json](../src/processed-games/brag-3-card.json)
  - URLs: https://www.pagat.com/vying/brag.html
  - Local HTML: âœ“ (pagat-vying-brag.html)

- 120 : [x] **Brag 4 card**
  - JSON: [brag-4-card.json](../src/processed-games/brag-4-card.json)
  - URLs: https://www.pagat.com/vying/brag.html#four | https://en.wikipedia.org/wiki/Brag_(card_game)
  - Local HTML: âœ“ (pagat-vying-brag.html, wiki-brag-4.html, wiki-brag.html)

- 121 : [x] **Brag 5 card**
  - JSON: [brag-5-card.json](../src/processed-games/brag-5-card.json)
  - URLs: https://www.pagat.com/vying/brag.html#five | https://en.wikipedia.org/wiki/Brag_(card_game)
  - Local HTML: âœ“ (pagat-vying-brag.html, wiki-brag-4.html, wiki-brag.html)

- 122 : [x] **Brag 6 card | 6-card Brag | Six-card Brag**
  - JSON: [brag-6-card.json](../src/processed-games/brag-6-card.json)
  - URLs: https://www.pagat.com/partition/crash.html#six | https://en.wikipedia.org/wiki/Brag_(card_game)
  - Local HTML: âœ“ (pagat-crash.html, wiki-brag-4.html, wiki-brag.html)

- 123 : [x] **Brag 7 card | 7-card Brag**
  - JSON: [brag-7-card.json](../src/processed-games/brag-7-card.json)
  - URLs: https://www.pagat.com/partition/crash.html#seven | https://en.wikipedia.org/wiki/Brag_(card_game)
  - Local HTML: âœ“ (pagat-crash.html, wiki-brag-4.html, wiki-brag.html)

- 124 : [x] **Brag 9 card | 9-card Brag | Nine-card Brag**
  - JSON: [brag-9-card.json](../src/processed-games/brag-9-card.json)
  - URLs: https://www.pagat.com/partition/crash.html#nine | https://www.pagat.com/vying/brag.html#nine
  - Local HTML: âœ“ (pagat-crash.html, pagat-vying-brag.html)

- 125 : [x] **BrÃ¤us Gotland**
  - JSON: [br-us-gotland.json](../src/processed-games/br-us-gotland.json)
  - URLs: https://www.pagat.com/karnoeffel/braus.html | https://en.wikipedia.org/wiki/Karn%C3%B6ffel
  - Local HTML: âœ“ (pagat-braus.html, wiki-karnffel.html, wiki-karnoeffel.html)

- 126 : [x] **Bridge | Chicago Bridge | Contract Bridge | Duplicate Bridge | Rubber Bridge**
  - JSON: [bridge-contract.json](../src/processed-games/bridge-contract.json)
  - URLs: https://www.pagat.com/auctionwhist/bridge.html | https://en.wikipedia.org/wiki/Whist | https://www.pagat.com/auctionwhist/bridge.html#chicago | https://www.pagat.com/auctionwhist/bridge.html#duplicate | https://www.pagat.com/auctionwhist/bridge.html#rubber
  - Local HTML: âœ“ (pagat-bridge.html, wiki-whist-4.html, wiki-whist.html)

- 127 : [x] **Bridge with Semi-exposed Dummies | Double Dummy Bridge**
  - JSON: [bridge-with-semi-exposed-dummies.json](../src/processed-games/bridge-with-semi-exposed-dummies.json)
  - URLs: https://www.pagat.com/auctionwhist/honeymoon.html#semi | https://en.wikipedia.org/wiki/Whist | https://www.pagat.com/auctionwhist/honeymoon.html#double | https://en.wikipedia.org/wiki/Contract_bridge
  - Local HTML: âœ“ (pagat-honeymoon.html, wiki-contract-bridge.html, wiki-whist-4.html, wiki-whist.html)

- 128 : [x] **Brisca**
  - JSON: [brisca.json](../src/processed-games/brisca.json)
  - URLs: https://www.pagat.com/aceten/brisca.html | https://en.wikipedia.org/wiki/Tressette | https://en.wikipedia.org/wiki/Brisca
  - Local HTML: âœ“ (pagat-brisca.html, wiki-brisca-2.html, wiki-brisca.html, wiki-tressette-2.html, wiki-tressette.html)

- 129 : [x] **Briscola | BriÅ¡kula**
  - JSON: [briscola.json](../src/processed-games/briscola.json)
  - URLs: https://www.pagat.com/aceten/briscola.html | https://en.wikipedia.org/wiki/Tressette | https://en.wikipedia.org/wiki/Briscola
  - Local HTML: âœ“ (pagat-briscola.html, wiki-briscola.html, wiki-tressette-2.html, wiki-tressette.html)

- 130 : [x] **Briscola 151**
  - JSON: [briscola-151.json](../src/processed-games/briscola-151.json)
  - URLs: https://www.pagat.com/marriage/marianna.html#briscola151 | https://en.wikipedia.org/wiki/Bezique | https://en.wikipedia.org/wiki/Briscola
  - Local HTML: âœ“ (pagat-marianna.html, wiki-bezique-2.html, wiki-bezique.html, wiki-briscola.html)

- 131 : [x] **Briscola a 31**
  - JSON: [briscola-a-31.json](../src/processed-games/briscola-a-31.json)
  - URLs: https://www.pagat.com/aceten/briscola.html#briscola31 | https://en.wikipedia.org/wiki/Tressette | https://en.wikipedia.org/wiki/Briscola
  - Local HTML: âœ“ (pagat-briscola.html, wiki-briscola.html, wiki-tressette-2.html, wiki-tressette.html)

- 132 : [x] **Briscola Chiamata | Briscola Bastarda**
  - JSON: [briscola-chiamata.json](../src/processed-games/briscola-chiamata.json)
  - URLs: https://www.pagat.com/aceten/briscola_chiamata.html | https://en.wikipedia.org/wiki/Tressette | https://en.wikipedia.org/wiki/Briscola
  - Local HTML: âœ“ (pagat-briscola-chiamata.html, wiki-briscola.html, wiki-tressette-2.html, wiki-tressette.html)

- 133 : [x] **Briscola Scoperta**
  - JSON: [briscola-scoperta.json](../src/processed-games/briscola-scoperta.json)
  - URLs: https://www.pagat.com/aceten/briscola.html#scoperta | https://en.wikipedia.org/wiki/Tressette | https://en.wikipedia.org/wiki/Briscola
  - Local HTML: âœ“ (pagat-briscola.html, wiki-briscola.html, wiki-tressette-2.html, wiki-tressette.html)

- 134 : [x] **Briscolone**
  - JSON: [briscolone.json](../src/processed-games/briscolone.json)
  - URLs: https://www.pagat.com/aceten/briscola.html#briscolone | https://en.wikipedia.org/wiki/Tressette | https://en.wikipedia.org/wiki/Briscola
  - Local HTML: âœ“ (pagat-briscola.html, wiki-briscola.html, wiki-tressette-2.html, wiki-tressette.html)

- 135 : [x] **Bristol**
  - JSON: [bristol.json](../src/processed-games/bristol.json)
  - URLs: https://en.wikipedia.org/wiki/Bristol_(card_game)
  - Local HTML: âœ“ (wiki-bristol.html)

- 136 : [x] **Brouc**
  - JSON: [brouc.json](../src/processed-games/brouc.json)
  - URLs: https://www.pagat.com/marriage/brouc.html | https://en.wikipedia.org/wiki/Bezique
  - Local HTML: âœ“ (pagat-brouc.html, wiki-bezique-2.html, wiki-bezique.html)

- 137 : [x] **Brus Denmark**
  - JSON: [brus-denmark.json](../src/processed-games/brus-denmark.json)
  - URLs: https://www.pagat.com/karnoeffel/brus.html | https://en.wikipedia.org/wiki/Karn%C3%B6ffel
  - Local HTML: âœ“ (pagat-brus.html, wiki-karnffel.html, wiki-karnoeffel.html)

- 138 : [x] **BrÃºs Iceland**
  - JSON: [brus-iceland.json](../src/processed-games/brus-iceland.json)
  - URLs: https://www.pagat.com/karnoeffel/brus.html#iceland | https://en.wikipedia.org/wiki/Karn%C3%B6ffel
  - Local HTML: âœ“ (pagat-brus.html, wiki-karnffel.html, wiki-karnoeffel.html)

- 139 : [x] **Bruus North Friesland**
  - JSON: [bruus-north-friesland.json](../src/processed-games/bruus-north-friesland.json)
  - URLs: https://www.pagat.com/karnoeffel/bruus.html | https://en.wikipedia.org/wiki/Karn%C3%B6ffel
  - Local HTML: âœ“ (pagat-bruus.html, wiki-karnffel.html, wiki-karnoeffel.html)

- 140 : [x] **Buck Euchre | Dirty Clubs**
  - JSON: [buck-euchre.json](../src/processed-games/buck-euchre.json)
  - URLs: https://www.pagat.com/euchre/buck.html | https://en.wikipedia.org/wiki/Euchre
  - Local HTML: âœ“ (pagat-buck.html, wiki-euchre-3.html, wiki-euchre.html)

- 141 : [x] **Buddha's Folly Poker**
  - JSON: [buddha-s-folly-poker.json](../src/processed-games/buddha-s-folly-poker.json)
  - URLs: https://www.pagat.com/poker/variants/passthetrash.html#buddha | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-pass-the-trash.html, wiki-poker.html)

- 142 : [x] **Buki Dominoes**
  - JSON: [buki-dominoes.json](../src/processed-games/buki-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/austrian.html#buki | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-austrian.html, wiki-dominoes.html)

- 143 : [x] **Bullshit | Cheat | I Doubt It Cheat | I Doubt It!**
  - JSON: [bullshit.json](../src/processed-games/bullshit.json)
  - URLs: https://www.pagat.com/beating/cheat.html | https://en.wikipedia.org/wiki/Durak | https://en.wikipedia.org/wiki/Cheat_(game)
  - Local HTML: âœ“ (pagat-cheat.html, wiki-cheat-3.html, wiki-cheat.html, wiki-durak-3.html, wiki-durak.html)

- 144 : [x] **Bura**
  - JSON: [bura.json](../src/processed-games/bura.json)
  - URLs: https://www.pagat.com/aceten/bura.html | https://en.wikipedia.org/wiki/Tressette
  - Local HTML: âœ“ (pagat-bura.html, wiki-tressette-2.html, wiki-tressette.html)

- 145 : [x] **Buraco Brazilian**
  - JSON: [buraco-brazilian.json](../src/processed-games/buraco-brazilian.json)
  - URLs: https://www.pagat.com/rummy/buraco.html | https://en.wikipedia.org/wiki/Rummy | https://en.wikipedia.org/wiki/Buraco
  - Local HTML: âœ“ (pagat-buraco.html, wiki-buraco.html, wiki-rummy-4.html, wiki-rummy.html)

- 146 : [x] **Burako Argentinean**
  - JSON: [burako-argentinean.json](../src/processed-games/burako-argentinean.json)
  - URLs: https://www.pagat.com/rummy/burako.html | https://en.wikipedia.org/wiki/Rummy | https://en.wikipedia.org/wiki/Buraco
  - Local HTML: âœ“ (pagat-burako.html, wiki-buraco.html, wiki-rummy-4.html, wiki-rummy.html)

- 147 : [x] **Burraco Italian**
  - JSON: [burraco-italian.json](../src/processed-games/burraco-italian.json)
  - URLs: https://www.pagat.com/rummy/burraco.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-burraco.html, wiki-rummy-4.html, wiki-rummy.html)

- 148 : [x] **Burro | Donkey Spain / Portugal**
  - JSON: [burro.json](../src/processed-games/burro.json)
  - URLs: https://www.pagat.com/inflation/cangkul.html#burro | https://en.wikipedia.org/wiki/President_(card_game)
  - Local HTML: âœ“ (pagat-cangkul.html, wiki-president-5.html, wiki-president.html)

- 149 : [x] **Busca**
  - JSON: [busca.json](../src/processed-games/busca.json)
  - URLs: https://www.pagat.com/tressette/ciapano.html#busca | https://en.wikipedia.org/wiki/Tressette
  - Local HTML: âœ“ (pagat-ciapano.html, wiki-tressette-2.html, wiki-tressette.html)

- 150 : [x] **Buy Your Card / Substitution Poker | Grocery Store Dots Poker | Substitution Poker**
  - JSON: [buy-your-card-substitution-poker.json](../src/processed-games/buy-your-card-substitution-poker.json)
  - URLs: https://www.pagat.com/poker/variants/buyyourcard.html#buyyourcard | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/buyyourcard.html#grocery | https://gambiter.com/cards/poker/poker-variants.html
  - Local HTML: âœ“ (pagat-buy-your-card.html, wiki-poker.html)

- 151 : [x] **Buying-Selling**
  - JSON: [money-matching.json](../src/processed-games/money-matching.json)
  - URLs: https://www.pagat.com/war/money.html | https://en.wikipedia.org/wiki/War_(card_game)
  - Local HTML: âœ“ (pagat-war-money.html, wiki-war-3.html, wiki-war.html)

### C

- 152 : [x] **Cabo Golf | Cactus Golf | Cambio Golf | Dacz Golf**
  - JSON: [golf-power.json](../src/processed-games/golf-power.json)
  - URLs: https://www.pagat.com/draw/golf.html#power
  - Local HTML: âœ“ (pagat-golf.html)

- 153 : [x] **Calabresella | Terziglio**
  - JSON: [calabresella.json](../src/processed-games/calabresella.json)
  - URLs: https://www.pagat.com/tressette/calabresella.html | https://en.wikipedia.org/wiki/Tressette
  - Local HTML: âœ“ (pagat-calabresella.html, wiki-tressette-2.html, wiki-tressette.html)

- 154 : [x] **Calculation Strategy**
  - JSON: [calculation-strategy.json](../src/processed-games/calculation-strategy.json)
  - URLs: https://en.wikipedia.org/wiki/Calculation_(card_game)
  - Local HTML: âœ“ (wiki-calculation.html)

- 155 : [x] **Calcutta Horse Race | Horse Race cards | Race Horse Dominoes**
  - JSON: [horse-race.json](../src/processed-games/horse-race.json)
  - URLs: https://www.pagat.com/race/horse_race.html#calcutta | https://www.pagat.com/race/horse_race.html | https://www.pagat.com/domino/race/horse_race.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-horse-race.html, wiki-dominoes.html)

- 156 : [x] **California Lowball Poker | Ace-To-Five Lowball Poker | Low Poker | Lowball (Draw) Poker | Triple Draw Poker**
  - JSON: [california-lowball.json](../src/processed-games/california-lowball.json)
  - URLs: https://www.pagat.com/poker/variants/lowball.html#california | https://en.wikipedia.org/wiki/Lowball_(poker) | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/lowball.html | https://www.pagat.com/poker/variants/lowball.html#triple
  - Local HTML: âœ“ (pagat-lowball.html, wiki-2-7-triple-draw.html, wiki-lowball-poker-2.html, wiki-lowball-poker.html, wiki-poker.html)

- 157 : [x] **California Stud Poker | SÃ¶kÃ¶ Stud Poker**
  - JSON: [five-card-stud-soko.json](../src/processed-games/five-card-stud-soko.json)
  - URLs: https://www.pagat.com/poker/variants/5stud.html#soko | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-five-card-stud.html, wiki-poker.html)

- 158 : [x] **Call Bridge | Call Break**
  - JSON: [call-bridge.json](../src/processed-games/call-bridge.json)
  - URLs: https://www.pagat.com/auctionwhist/call_bridge.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-call-bridge.html, wiki-whist-4.html, wiki-whist.html)

- 159 : [x] **Call Partner Rook Â®**
  - JSON: [call-partner-rook.json](../src/processed-games/call-partner-rook.json)
  - URLs: https://www.pagat.com/kt5/rook.html#call-partner | https://en.wikipedia.org/wiki/Rook_(card_game)
  - Local HTML: âœ“ (pagat-rook.html, wiki-rook.html)

- 160 : [x] **Calypso**
  - JSON: [calypso.json](../src/processed-games/calypso.json)
  - URLs: https://www.pagat.com/pointtrk/calypso.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-calypso.html, wiki-whist-4.html, wiki-whist.html)

- 161 : [x] **Camicia**
  - JSON: [camicia.json](../src/processed-games/camicia.json)
  - URLs: https://www.pagat.com/war/camicia.html | https://en.wikipedia.org/wiki/War_(card_game)
  - Local HTML: âœ“ (pagat-camicia.html, wiki-war-3.html, wiki-war.html)

- 162 : [x] **CÄn ChÃ¡n åƒç¦ª | XiÃ ng ShÃ­ FÃ¹ ç›¸åå‰¯**
  - JSON: [xiang-shi-fu.json](../src/processed-games/xiang-shi-fu.json)
  - URLs: https://www.pagat.com/domino/solitaire/xiangshifu.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-xiangshifu.html, wiki-dominoes.html)

- 163 : [x] **Canadian Salad | Wisconsin Scramble**
  - JSON: [canadian-salad.json](../src/processed-games/canadian-salad.json)
  - URLs: https://www.pagat.com/compendium/canadian_salad.html
  - Local HTML: âœ“ (pagat-canadian-salad.html)

- 164 : [x] **Canasta | New Canasta | Railroad Canasta**
  - JSON: [canasta.json](../src/processed-games/canasta.json)
  - URLs: https://www.pagat.com/rummy/canasta.html | https://en.wikipedia.org/wiki/Rummy | https://www.pagat.com/rummy/canasta.html#new | https://www.pagat.com/rummy/canasta.html#railroad
  - Local HTML: âœ“ (pagat-canasta.html, wiki-rummy-4.html, wiki-rummy.html)

- 165 : [x] **Canastone | Italian Canasta**
  - JSON: [canastone.json](../src/processed-games/canastone.json)
  - URLs: https://www.pagat.com/rummy/canastone.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-canastone.html, wiki-rummy-4.html, wiki-rummy.html)

- 166 : [x] **Cancellation Hearts**
  - JSON: [hearts-cancellation.json](../src/processed-games/hearts-cancellation.json)
  - URLs: https://www.pagat.com/reverse/hearts.html#cancellation | https://en.wikipedia.org/wiki/Hearts_(card_game)
  - Local HTML: âœ“ (pagat-hearts.html, wiki-hearts-3.html, wiki-hearts.html)

- 167 : [x] **Candyman | Drug Dealer**
  - JSON: [candyman.json](../src/processed-games/candyman.json)
  - URLs: https://www.pagat.com/role/candyman.html
  - Local HTML: âœ“ (pagat-candyman.html)

- 168 : [x] **Cangkul**
  - JSON: [cangkul.json](../src/processed-games/cangkul.json)
  - URLs: https://www.pagat.com/inflation/cangkul.html | https://en.wikipedia.org/wiki/President_(card_game)
  - Local HTML: âœ“ (pagat-cangkul.html, wiki-president-5.html, wiki-president.html)

- 169 : [x] **Cap-It | Push Rummy**
  - JSON: [cap-it.json](../src/processed-games/cap-it.json)
  - URLs: https://www.pagat.com/rummy/push.html#variations | https://en.wikipedia.org/wiki/Rummy | https://www.pagat.com/rummy/push.html
  - Local HTML: âœ“ (pagat-rummy-push.html, wiki-rummy-4.html, wiki-rummy.html)

- 170 : [x] **Card Bingo**
  - JSON: [card-bingo.json](../src/processed-games/card-bingo.json)
  - URLs: https://www.pagat.com/banking/bingo.html
  - Local HTML: âœ“ (pagat-banking-bingo.html)

- 171 : [x] **Caribbean Dominoes | Dominoes Caribbean**
  - JSON: [caribbean-dominoes.json](../src/processed-games/caribbean-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/caribbean.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-caribbean.html, wiki-dominoes.html)

- 172 : [x] **Caribbean Stud Poker | Cyberstud Poker**
  - JSON: [caribbean-stud.json](../src/processed-games/caribbean-stud.json)
  - URLs: https://www.pagat.com/banking/caribbean.html
  - Local HTML: âœ“ (pagat-caribbean.html)

- 173 : [x] **Carioca | Loba Honduras**
  - JSON: [carioca.json](../src/processed-games/carioca.json)
  - URLs: https://www.pagat.com/rummy/carioca.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-carioca.html, wiki-rummy-4.html, wiki-rummy.html)

- 174 : [x] **Carousel | Finagle | Guadalupe | Manipulation Rummy**
  - JSON: [carousel.json](../src/processed-games/carousel.json)
  - URLs: https://www.pagat.com/rummy/carousel.html#carousel | https://en.wikipedia.org/wiki/Rummy | https://www.pagat.com/rummy/carousel.html#manipulation | https://www.pagat.com/rummy/carousel.html#guadalupe
  - Local HTML: âœ“ (pagat-carousel.html, wiki-rummy-4.html, wiki-rummy.html)

- 175 : [x] **Carpet**
  - JSON: [carpet.json](../src/processed-games/carpet.json)
  - URLs: https://www.semicolon.com/Solitaire/Rules/Carpet.html | https://en.wikipedia.org/wiki/Carpet_(card_game)
  - Local HTML: âœ“ (semicolon-carpet.html, wiki-carpet-card-game.html)

- 176 : [x] **Casino**
  - JSON: [cassino.json](../src/processed-games/cassino.json)
  - URLs: https://www.pagat.com/fishing/casino.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-casino.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 177 : [x] **Casino Dominican**
  - JSON: [casino-dominican.json](../src/processed-games/casino-dominican.json)
  - URLs: https://www.pagat.com/fishing/royal_casino.html#dominican | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-royal-casino.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 178 : [x] **Casino Hold'em Poker**
  - JSON: [casino-hold-em.json](../src/processed-games/casino-hold-em.json)
  - URLs: https://www.pagat.com/banking/holdem.html#casino
  - Local HTML: âœ“ (pagat-holdem.html)

- 179 : [x] **Casino Hungarian**
  - JSON: [casino-hungarian.json](../src/processed-games/casino-hungarian.json)
  - URLs: https://www.pagat.com/fishing/royal_casino.html#hungarian | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-royal-casino.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 180 : [x] **Casino Sotho | Sotho Casino**
  - JSON: [casino-sotho.json](../src/processed-games/casino-sotho.json)
  - URLs: https://www.pagat.com/fishing/african_casino.html#sotho | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-african-casino.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 181 : [x] **Casino South African | South African Casino**
  - JSON: [casino-south-african.json](../src/processed-games/casino-south-african.json)
  - URLs: https://www.pagat.com/fishing/african_casino.html#south_african | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-african-casino.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 182 : [x] **Casino Swazi | Swazi Casino**
  - JSON: [casino-swazi.json](../src/processed-games/casino-swazi.json)
  - URLs: https://www.pagat.com/fishing/african_casino.html#swazi | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-african-casino.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 183 : [x] **Casita Robada**
  - JSON: [casita-robada.json](../src/processed-games/casita-robada.json)
  - URLs: https://www.pagat.com/fishing/bundle.html#casita_robada | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-bundle.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 184 : [x] **Cau Robat**
  - JSON: [cau-robat.json](../src/processed-games/cau-robat.json)
  - URLs: https://www.pagat.com/fishing/cau.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-cau.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 185 : [x] **Ce Deng æ–œé’‰ | Tsair Deng**
  - JSON: [ce-deng.json](../src/processed-games/ce-deng.json)
  - URLs: https://www.pagat.com/domino/arm/tsairdeng.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-tsairdeng.html, wiki-dominoes.html)

- 186 : [x] **Cego**
  - JSON: [cego.json](../src/processed-games/cego.json)
  - URLs: https://www.pagat.com/tarot/cego.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (pagat-cego.html, wiki-tarot-2.html, wiki-tarot.html)

- 187 : [x] **Ch'i TÃ¡i Shap | K'ap TÃ¡i Shap | Kim TÃ¡i Shap**
  - JSON: [kap-tai-shap.json](../src/processed-games/kap-tai-shap.json)
  - URLs: https://www.pagat.com/domino/draw/kaptaishap.html | https://en.wikipedia.org/wiki/Dominoes | https://www.pagat.com/tile/domino/kap_shap.html
  - Local HTML: âœ“ (pagat-kaptaishap.html, wiki-dominoes.html)

- 188 : [x] **ChahÃ¢r barg four cards | Haft khÃ¢j seven clubs | PÃ¢sur | YÃ¢zdahtÃ¢yi eleveny**
  - JSON: [p-sur.json](../src/processed-games/p-sur.json)
  - URLs: https://www.pagat.com/fishing/pasur.html | https://en.wikipedia.org/wiki/Scopa | https://web.archive.org/web/20131006153246/jahanshiri.ir/cardgames/en/pasur.html
  - Local HTML: âœ“ (pagat-pasur.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 189 : [x] **Charlemagne**
  - JSON: [charlemagne.json](../src/processed-games/charlemagne.json)
  - URLs: https://www.pagat.com/euchre/charlemagne.html | https://en.wikipedia.org/wiki/Euchre
  - Local HTML: âœ“ (pagat-charlemagne.html, wiki-euchre-3.html, wiki-euchre.html)

- 190 : [x] **Checkmate**
  - JSON: [checkmate.json](../src/processed-games/checkmate.json)
  - URLs: https://www.pagat.com/eights/checkmate.html
  - Local HTML: âœ“ (pagat-checkmate.html)

- 191 : [x] **Chicago Poker | Dirty Schultz Poker | Follow The Queen Poker | Henway Poker | High Chicago Poker | Jack the Shifter Poker | Low Chicago Poker**
  - JSON: [chicago.json](../src/processed-games/chicago.json)
  - URLs: https://www.pagat.com/poker/variants/chicago.html#high | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/chicago.html#schultz | https://www.pagat.com/poker/variants/chicago.html#followqueen | https://www.pagat.com/poker/variants/chicago.html#henway | https://www.pagat.com/poker/variants/chicago.html#low | https://www.pagat.com/poker/variants/chicago.html#shifter
  - Local HTML: âœ“ (pagat-chicago-poker.html, wiki-poker.html)

- 192 : [x] **Chicago Swedish**
  - JSON: [chicago-swedish.json](../src/processed-games/chicago-swedish.json)
  - URLs: https://www.pagat.com/last/chicago.html | https://en.wikipedia.org/wiki/Last_Card
  - Local HTML: âœ“ (pagat-last-chicago.html)

- 193 : [x] **Chicken Foot**
  - JSON: [chicken-foot.json](../src/processed-games/chicken-foot.json)
  - URLs: https://www.pagat.com/domino/tree/chickenfoot.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-chickenfoot.html, wiki-dominoes.html)

- 194 : [x] **Chinese Patience**
  - JSON: [chinese-patience.json](../src/processed-games/chinese-patience.json)
  - URLs: https://www.pagat.com/patience/chinese.html | https://en.wikipedia.org/wiki/Patience_(game)
  - Local HTML: âœ“ (pagat-chinese.html, wiki-patience.html)

- 195 : [x] **Chinese Poker | Luosong Pai Jiu ç¾…å®‹ç‰Œä¹ | Pepito | Pusoy | Sap Sam Cheung åä¸‰å¼µ**
  - JSON: [chinese-poker.json](../src/processed-games/chinese-poker.json)
  - URLs: https://www.pagat.com/partition/pusoy.html | https://en.wikipedia.org/wiki/Chinese_poker | https://officialgamerules.org/game-rules/chinese-poker-pusoy/ | https://pokercm.com/en/rules/chinese-poker/
  - Local HTML: âœ“ (pagat-pusoy.html, wiki-chinese-poker.html)

- 196 : [x] **Chinese Ten | Gob Dum Gob Dang à¸à¸šà¸”à¸³à¸à¸šà¹à¸”à¸‡ | JiÄƒn HÃ³ng DiÄƒn æ€ç´…é»ž | Red Frog Black Frog**
  - JSON: [chinese-ten.json](../src/processed-games/chinese-ten.json)
  - URLs: https://www.pagat.com/fishing/chinten.html | https://en.wikipedia.org/wiki/Scopa | https://www.pagat.com/fishing/chinten.html#frog
  - Local HTML: âœ“ (pagat-chinten.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 197 : [x] **Chiva | Shutout Dominoes**
  - JSON: [chiva.json](../src/processed-games/chiva.json)
  - URLs: https://www.pagat.com/domino/line/caribbean.html#chiva | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-caribbean.html, wiki-dominoes.html)

- 198 : [x] **Chkobba**
  - JSON: [chkobba.json](../src/processed-games/chkobba.json)
  - URLs: https://www.pagat.com/fishing/scopa.html#chkobba | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-scopa.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 199 : [x] **Chor Voli**
  - JSON: [chor-voli.json](../src/processed-games/chor-voli.json)
  - URLs: https://www.pagat.com/partition/chor_voli.html
  - Local HTML: âœ“ (pagat-chor-voli.html)

- 200 : [x] **Chorizo**
  - JSON: [chorizo.json](../src/processed-games/chorizo.json)
  - URLs: https://www.pagat.com/fishing/chorizo.html | https://en.wikipedia.org/wiki/Scopa | https://www.pagat.com/fishing/escoba.html
  - Local HTML: âœ“ (pagat-chorizo.html, pagat-escoba.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 201 : [x] **CHORSE Poker | CHORSEL Poker | Eight Game Mix Poker | HOE Poker | HORSE Poker | HOSE Poker | ROE Poker | SHOE Poker**
  - JSON: [horse.json](../src/processed-games/horse.json)
  - URLs: https://www.pagat.com/poker/variants/horse.html#chorse | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/horse.html#eight | https://www.pagat.com/poker/variants/horse.html#hoe | https://www.pagat.com/poker/variants/horse.html | https://www.pagat.com/poker/variants/horse.html#hose | https://www.pagat.com/poker/variants/horse.html#roe | https://www.pagat.com/poker/variants/horse.html#shoe | https://www.pokernews.com/poker-rules/horse.htm
  - Local HTML: âœ“ (pagat-horse-poker.html, wiki-poker.html)

- 202 : [x] **Chouine**
  - JSON: [chouine.json](../src/processed-games/chouine.json)
  - URLs: https://www.pagat.com/marriage/chouine.html | https://en.wikipedia.org/wiki/Bezique
  - Local HTML: âœ“ (pagat-marriage-chouine.html, wiki-bezique-2.html, wiki-bezique.html)

- 203 : [x] **CiapanÃ²**
  - JSON: [ciapan.json](../src/processed-games/ciapan.json)
  - URLs: https://www.pagat.com/tressette/ciapano.html | https://en.wikipedia.org/wiki/Tressette
  - Local HTML: âœ“ (pagat-ciapano.html, wiki-tressette-2.html, wiki-tressette.html)

- 204 : [x] **Cicera**
  - JSON: [cicera.json](../src/processed-games/cicera.json)
  - URLs: https://www.pagat.com/fishing/cicera.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-cicera.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 205 : [x] **Cinch | Dom Pedro | Double Pedro | High Five**
  - JSON: [pedro-63.json](../src/processed-games/pedro-63.json)
  - URLs: https://www.pagat.com/allfours/pedro.html | https://en.wikipedia.org/wiki/All_fours_(card_game) | https://www.pagat.com/allfours/pedro.html#sancho
  - Local HTML: âœ“ (pagat-pedro.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 206 : [x] **Cinch**
  - JSON: [cinch.json](../src/processed-games/cinch.json)
  - URLs: https://www.pagat.com/allfours/pedro.html
  - Local HTML: âœ“ (pagat-pedro.html)

- 207 : [x] **Cincinnati Poker**
  - JSON: [cincinnati.json](../src/processed-games/cincinnati.json)
  - URLs: https://www.pagat.com/poker/variants/cincinnati.html#cincinnati | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-cincinnati.html, wiki-poker.html)

- 208 : [x] **Cinquecento**
  - JSON: [cinquecento.json](../src/processed-games/cinquecento.json)
  - URLs: https://www.pagat.com/marriage/marianna.html#500 | https://en.wikipedia.org/wiki/Bezique
  - Local HTML: âœ“ (pagat-marianna.html, wiki-bezique-2.html, wiki-bezique.html)

- 209 : [x] **Cirulla**
  - JSON: [cirulla.json](../src/processed-games/cirulla.json)
  - URLs: https://www.pagat.com/fishing/cirulla.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-cirulla.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 210 : [x] **Cirullone**
  - JSON: [cirullone.json](../src/processed-games/cirullone.json)
  - URLs: https://www.pagat.com/fishing/cirulla.html#cirullone | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-cirulla.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 211 : [x] **Clabber | Dad**
  - JSON: [clabber.json](../src/processed-games/clabber.json)
  - URLs: https://www.pagat.com/jass/clabber.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-clabber.html, wiki-jass-3.html, wiki-jass.html)

- 212 : [x] **Clag | Nominations Clag**
  - JSON: [clag.json](../src/processed-games/clag.json)
  - URLs: https://www.pagat.com/exact/clag.html | https://en.wikipedia.org/wiki/Oh_hell | https://www.pagat.com/exact/clag.html#nominations
  - Local HTML: âœ“ (pagat-clag.html, wiki-oh-hell-3.html, wiki-oh-hell.html)

- 213 : [x] **Classic**
  - JSON: [classic.json](../src/processed-games/classic.json)
  - URLs: https://www.pagat.com/whist/whist.html
  - Local HTML: âœ“ (pagat-whist.html)

- 214 : [x] **Clobyosh | Bela | Clob | Kalabriasz**
  - JSON: [clobyosh.json](../src/processed-games/clobyosh.json)
  - URLs: https://www.pagat.com/jass/bela.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-bela.html, wiki-jass-3.html, wiki-jass.html)

- 215 : [x] **Clubs**
  - JSON: [clubs-mens.json](../src/processed-games/clubs-mens.json)
  - URLs: https://www.pagat.com/quotawhist/clubs.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-clubs.html, wiki-whist-4.html, wiki-whist.html)

- 216 : [x] **Coiffeur-Schieber Jass | Jass Swiss | Schieber Jass | Swiss Jass**
  - JSON: [jass.json](../src/processed-games/jass.json)
  - URLs: https://www.pagat.com/jass/coiffeur.html | https://en.wikipedia.org/wiki/Jass | https://www.pagat.com/jass/swjass.html | https://www.pagat.com/jass/schieber.html
  - Local HTML: âœ“ (pagat-coiffeur.html, pagat-schieber.html, pagat-swjass.html, wiki-jass-3.html, wiki-jass.html)

- 217 : [x] **Coinche | Belote aux EnchÃ¨res**
  - JSON: [coinche.json](../src/processed-games/coinche.json)
  - URLs: https://www.pagat.com/jass/coinche.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-coinche.html, wiki-jass-3.html, wiki-jass.html)

- 218 : [x] **Concentration**
  - JSON: [pelmanism-memory.json](../src/processed-games/pelmanism-memory.json)
  - URLs: https://www.pagat.com/misc/pelmanism.html
  - Local HTML: âœ“ (pagat-pelmanism.html)

- 219 : [x] **Concentration Dominoes**
  - JSON: [memory.json](../src/processed-games/memory.json)
  - URLs: https://www.pagat.com/domino/misc/concentration.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-concentration.html, wiki-dominoes.html)

- 220 : [x] **Conquian**
  - JSON: [conquian.json](../src/processed-games/conquian.json)
  - URLs: https://www.pagat.com/rummy/conquian.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-conquian.html, wiki-rummy-4.html, wiki-rummy.html)

- 221 : [x] **Contract Rummy | Liverpool Rummy | May I? | Progressive Rummy | Shanghai Rummy**
  - JSON: [contract-rummy.json](../src/processed-games/contract-rummy.json)
  - URLs: https://www.pagat.com/rummy/ctrummy.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-contract-rummy.html, wiki-rummy-4.html, wiki-rummy.html)

- 222 : [x] **Correlativa**
  - JSON: [correlativa.json](../src/processed-games/correlativa.json)
  - URLs: https://www.pagat.com/domino/star/garrafina.html#correlativa | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-garrafina.html, wiki-dominoes.html)

- 223 : [x] **Cosmic Turtle**
  - JSON: [cosmic-turtle.json](../src/processed-games/cosmic-turtle.json)
  - URLs: https://www.pagat.com/domino/solitaire/cosmic_turtle.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-cosmic-turtle.html, wiki-dominoes.html)

- 224 : [x] **Costly Colours**
  - JSON: [costly-colours.json](../src/processed-games/costly-colours.json)
  - URLs: https://www.pagat.com/adders/costly.html | https://en.wikipedia.org/wiki/Cribbage
  - Local HTML: âœ“ (pagat-costly.html, wiki-cribbage-3.html, wiki-cribbage.html)

- 225 : [x] **Coteccio**
  - JSON: [coteccio.json](../src/processed-games/coteccio.json)
  - URLs: https://www.pagat.com/trappola/coteccio.html | https://en.wikipedia.org/wiki/Trappola
  - Local HTML: âœ“ (pagat-coteccio.html, wiki-trappola-2.html, wiki-trappola.html)

- 226 : [x] **Couillon**
  - JSON: [couillon.json](../src/processed-games/couillon.json)
  - URLs: https://www.pagat.com/couillon/couillon.html
  - Local HTML: âœ“ (pagat-couillon.html)

- 227 : [x] **Coup d'Etat â„¢**
  - JSON: [coup.json](../src/processed-games/coup.json)
  - URLs: https://www.pagat.com/com/coup_detat.html
  - Local HTML: âœ“ (pagat-coup-detat.html)

- 228 : [x] **Courchevel poker**
  - JSON: [courchevel.json](../src/processed-games/courchevel.json)
  - URLs: https://www.pagat.com/poker/variants/omaha.html#courchevel | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-omaha.html, wiki-poker.html)

- 229 : [x] **Court Piece | 7 Hands | Coat Pees | Rang | Rang Milanti | Rung | Seven Hands**
  - JSON: [court-piece.json](../src/processed-games/court-piece.json)
  - URLs: https://www.pagat.com/whist/rang.html | https://en.wikipedia.org/wiki/Whist | https://www.pagat.com/whist/rang.html#milanti
  - Local HTML: âœ“ (pagat-rang.html, wiki-whist-4.html, wiki-whist.html)

- 230 : [x] **Cowpie Poker | Pineapple Poker | Texas Hold'em Bonus | Texas Hold'em Poker**
  - JSON: [texas-hold-em.json](../src/processed-games/texas-hold-em.json)
  - URLs: https://www.pagat.com/poker/variants/texasholdem.html#cowpie | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/texasholdem.html#pineapple | https://www.pagat.com/poker/variants/texasholdem.html | https://en.wikipedia.org/wiki/Texas_hold_%27em | https://www.pagat.com/banking/holdem.html#bonus | https://www.wsop.com/poker-games/texas-holdem/ | https://forumserver.twoplustwo.com/
  - Local HTML: âœ“ (pagat-holdem.html, pagat-texasholdem.html, wiki-poker.html, wiki-texas-holdem.html)

- 231 : [x] **Crapette**
  - JSON: [crapette.json](../src/processed-games/crapette.json)
  - URLs: https://www.pagat.com/patience/crapette.html
  - Local HTML: âœ“ (pagat-crapette.html)

- 232 : [x] **Crash 13-card Brag | 13-card Brag | Brag 13 card | Crackers | Thirteen-card Brag**
  - JSON: [crash.json](../src/processed-games/crash.json)
  - URLs: https://www.pagat.com/partition/crash.html
  - Local HTML: âœ“ (pagat-crash.html)

- 233 : [x] **Crates**
  - JSON: [crates.json](../src/processed-games/crates.json)
  - URLs: https://www.pagat.com/eights/crates.html
  - Local HTML: âœ“ (pagat-crates.html)

- 234 : [x] **Crazy 4 Poker**
  - JSON: [crazy-4-poker.json](../src/processed-games/crazy-4-poker.json)
  - URLs: https://www.pagat.com/poker/variants/buyyourcard.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-buy-your-card.html, wiki-poker.html)

- 235 : [x] **Crazy Eights | Countdown Crazy Eights | Crazy Eights Countdown | Ochos Locos | Spoons Eights | Swedish Rummy**
  - JSON: [crazy-eights.json](../src/processed-games/crazy-eights.json)
  - URLs: https://www.pagat.com/eights/crazy8s.html#countdown | https://www.pagat.com/eights/crazy8s.html | https://www.pagat.com/eights/crazy8s.html#spoons
  - Local HTML: âœ“ (pagat-crazy-eights.html)

- 236 : [x] **Crazy Pineapple Poker | Crazy Pineapple Hi-Lo Poker**
  - JSON: [crazy-pineapple.json](../src/processed-games/crazy-pineapple.json)
  - URLs: https://www.pagat.com/poker/variants/texasholdem.html#crazyp | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/texasholdem.html#cphl
  - Local HTML: âœ“ (pagat-texasholdem.html, wiki-poker.html)

- 237 : [x] **Crazy Rummy | Ace to Ace | Beanie | Benny | Biddies | Dummy Rummy | Lamsees | Mexican Rummy | Treize Brasses**
  - JSON: [crazy-rummy.json](../src/processed-games/crazy-rummy.json)
  - URLs: https://www.pagat.com/rummy/crazy.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-crazy-rummy.html, wiki-rummy-4.html, wiki-rummy.html)

- 238 : [x] **Crazy Solo | Frog**
  - JSON: [crazy-solo.json](../src/processed-games/crazy-solo.json)
  - URLs: https://www.pagat.com/aceten/solo.html | https://en.wikipedia.org/wiki/Tressette | https://www.pagat.com/aceten/solo.html#frog
  - Local HTML: âœ“ (pagat-solo.html, wiki-tressette-2.html, wiki-tressette.html)

- 239 : [x] **Cribbage | Ribs | Table Top Cribbage**
  - JSON: [cribbage.json](../src/processed-games/cribbage.json)
  - URLs: https://www.pagat.com/adders/crib6.html | https://en.wikipedia.org/wiki/Cribbage | https://www.pagat.com/adders/crib6.html#ribs | https://www.pagat.com/adders/crib6.html#tabletop
  - Local HTML: âœ“ (pagat-crib6.html, wiki-cribbage-3.html, wiki-cribbage.html)

- 240 : [x] **Cribbage five-card**
  - JSON: [cribbage-five-card.json](../src/processed-games/cribbage-five-card.json)
  - URLs: https://www.pagat.com/adders/cribbage.html | https://en.wikipedia.org/wiki/Cribbage
  - Local HTML: âœ“ (pagat-adders-cribbage.html, wiki-cribbage-3.html, wiki-cribbage.html)

- 241 : [x] **Cribbage partnership**
  - JSON: [cribbage-partnership.json](../src/processed-games/cribbage-partnership.json)
  - URLs: https://www.pagat.com/adders/crib6.html#four | https://en.wikipedia.org/wiki/Cribbage
  - Local HTML: âœ“ (pagat-crib6.html, wiki-cribbage-3.html, wiki-cribbage.html)

- 242 : [x] **Cribbage six-card**
  - JSON: [cribbage-six-card.json](../src/processed-games/cribbage-six-card.json)
  - URLs: https://www.pagat.com/adders/crib6.html | https://en.wikipedia.org/wiki/Cribbage
  - Local HTML: âœ“ (pagat-crib6.html, wiki-cribbage-3.html, wiki-cribbage.html)

- 243 : [x] **Cricket**
  - JSON: [cricket.json](../src/processed-games/cricket.json)
  - URLs: https://www.pagat.com/patience/cricket.html | https://en.wikipedia.org/wiki/Patience_(game)
  - Local HTML: âœ“ (pagat-cricket.html, wiki-patience.html)

- 244 : [x] **Criss Cross Iron Cross Poker | Church Poker | Criss Cross Tic Tac Toe Poker | Elevator Poker | Iron Cross Poker | Tic Tac Toe Poker**
  - JSON: [iron-cross.json](../src/processed-games/iron-cross.json)
  - URLs: https://www.pagat.com/poker/variants/ironcross.html#cross | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/ironcross.html#tictactoe | https://www.pagat.com/poker/variants/ironcross.html#elevator | https://www.pagat.com/poker/variants/ironcross.html
  - Local HTML: âœ“ (pagat-ironcross.html, wiki-poker.html)

- 245 : [x] **Cuajo**
  - JSON: [cuajo.json](../src/processed-games/cuajo.json)
  - URLs: https://www.pagat.com/rummy/cuajo.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-cuajo.html, wiki-rummy-4.html, wiki-rummy.html)

- 246 : [x] **Cuarenta**
  - JSON: [cuarenta.json](../src/processed-games/cuarenta.json)
  - URLs: https://www.pagat.com/fishing/cuarenta.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-cuarenta.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 247 : [x] **Cuban Dominoes**
  - JSON: [cuban-dominoes.json](../src/processed-games/cuban-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/cuban.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-cuban.html, wiki-dominoes.html)

- 248 : [x] **Cucco | CÃ¶ch**
  - JSON: [cucco.json](../src/processed-games/cucco.json)
  - URLs: https://www.pagat.com/pointtrk/cucco.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-cucco.html, wiki-whist-4.html, wiki-whist.html)

- 249 : [x] **Cuckoo | Chase the Ace | Ranter Go Round | Screw Your Neighbor | StÃ¹, Lu**
  - JSON: [cuckoo.json](../src/processed-games/cuckoo.json)
  - URLs: https://www.pagat.com/cuckoo/cuckoo.html | https://en.wikipedia.org/wiki/Cuckoo_(card_game) | https://www.pagat.com/cuckoo/cucu.html
  - Local HTML: âœ“ (pagat-cuckoo.html, pagat-cucu.html, wiki-cuckoo.html)

- 250 : [x] **CucÃ¹**
  - JSON: [cuc.json](../src/processed-games/cuc.json)
  - URLs: https://www.pagat.com/cuckoo/cucu.html | https://en.wikipedia.org/wiki/Cuckoo_(card_game)
  - Local HTML: âœ“ (pagat-cucu.html, wiki-cuckoo.html)

- 251 : [x] **Cucumber | 21 Agurk | Agurk | Gurka | Kurkku | MÃ¤tÃ¤pesÃ¤ | OgÃ³rek Cucumber | Rassi**
  - JSON: [cucumber.json](../src/processed-games/cucumber.json)
  - URLs: https://www.pagat.com/last/cucumber.html | https://en.wikipedia.org/wiki/Last_Card | https://en.wikipedia.org/wiki/Cucumber_(card_game)
  - Local HTML: âœ“ (pagat-cucumber.html, wiki-cucumber-3.html, wiki-cucumber.html)

- 252 : [x] **Cut Throat Dominoes Jamaican | Dominoes Jamaican**
  - JSON: [jamaican-dominoes.json](../src/processed-games/jamaican-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/caribbean.html#cutthroat | https://en.wikipedia.org/wiki/Dominoes | https://www.pagat.com/domino/line/caribbean.html#partner
  - Local HTML: âœ“ (pagat-domino-caribbean.html, wiki-dominoes.html)

- 253 : [x] **Cuttle**
  - JSON: [cuttle.json](../src/processed-games/cuttle.json)
  - URLs: https://www.pagat.com/combat/cuttle.html
  - Local HTML: âœ“ (pagat-cuttle.html)

- 254 : [x] **Cyprus**
  - JSON: [cyprus.json](../src/processed-games/cyprus.json)
  - URLs: https://www.pagat.com/domino/star/cyprus.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-cyprus.html, wiki-dominoes.html)

### D

- 255 : [x] **Dai FugÅ | Dai Hinmin**
  - JSON: [daifugo.json](../src/processed-games/daifugo.json)
  - URLs: https://www.pagat.com/climbing/daifugo.html
  - Local HTML: âœ“ (pagat-daifugo.html)

- 256 : [x] **Dakota Poker | Roll Your Own Poker**
  - JSON: [rollyourown.json](../src/processed-games/rollyourown.json)
  - URLs: https://www.pagat.com/poker/variants/rollyourown.html#dakota | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/rollyourown.html
  - Local HTML: âœ“ (pagat-roll-your-own.html, wiki-poker.html)

- 257 : [x] **Dappen Black Forest Tapp Tarock**
  - JSON: [dappen-black-forest-tapp-tarock.json](../src/processed-games/dappen-black-forest-tapp-tarock.json)
  - URLs: https://www.pagat.com/tarot/dappen.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (pagat-dappen.html, wiki-tarot-2.html, wiki-tarot.html)

- 258 : [x] **Dealer's Choice Poker**
  - JSON: [dealers-choice.json](../src/processed-games/dealers-choice.json)
  - URLs: https://www.pagat.com/poker/variants/dealers_choice.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-dealers-choice.html, wiki-poker.html)

- 259 : [x] **Dehla Pakad**
  - JSON: [dehla-pakad.json](../src/processed-games/dehla-pakad.json)
  - URLs: https://www.pagat.com/pointtrk/dehlapakad.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-dehlapakad.html, wiki-whist-4.html, wiki-whist.html)

- 260 : [x] **Democracy**
  - JSON: [democracy.json](../src/processed-games/democracy.json)
  - URLs: https://www.pagat.com/misc/democracy.html
  - Local HTML: âœ“ (pagat-democracy.html)

- 261 : [x] **Derda**
  - JSON: [derda.json](../src/processed-games/derda.json)
  - URLs: https://www.pagat.com/jass/derda.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-derda.html, wiki-jass-3.html, wiki-jass.html)

- 262 : [x] **Deuce-To-Seven Lowball Poker**
  - JSON: [deuce-to-seven-lowball.json](../src/processed-games/deuce-to-seven-lowball.json)
  - URLs: https://www.pagat.com/poker/variants/lowball.html#kansas | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-lowball.html, wiki-poker.html)

- 263 : [x] **Deuces & Jacks & the Man with the Axe Poker**
  - JSON: [deuces-jacks-axe.json](../src/processed-games/deuces-jacks-axe.json)
  - URLs: https://www.pagat.com/poker/variants/7stud.html#axe | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-seven-card-stud.html, wiki-poker.html)

- 264 : [x] **Deux Cents**
  - JSON: [deux-cents.json](../src/processed-games/deux-cents.json)
  - URLs: https://www.pagat.com/kt5/200.html
  - Local HTML: âœ“ (pagat-kt5-two-hundred.html)

- 265 : [ ] **Diablo Poker**
  - JSON: [five-card-draw-diablo.json](../src/processed-games/five-card-draw-diablo.json)
  - URLs: https://www.pagat.com/poker/variants/5draw.html#diablo | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-five-card-draw.html, wiki-poker.html)

- 266 : [ ] **Differenzler Jass**
  - JSON: [differenzler.json](../src/processed-games/differenzler.json)
  - URLs: https://www.pagat.com/jass/differenzler.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-differenzler.html, wiki-jass-3.html, wiki-jass.html)

- 267 : [ ] **Diloti Î”Î·Î»Ï‰Ï„Î®**
  - JSON: [diloti.json](../src/processed-games/diloti.json)
  - URLs: https://www.pagat.com/fishing/diloti.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-diloti.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 268 : [ ] **Dingo**
  - JSON: [dingo.json](../src/processed-games/dingo.json)
  - URLs: https://www.pagat.com/misc/dingo.html
  - Local HTML: âœ“ (pagat-dingo.html)

- 269 : [ ] **Dobbm | Tappen Stubai**
  - JSON: [dobbm.json](../src/processed-games/dobbm.json)
  - URLs: https://www.pagat.com/tarot/dobbm.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 270 : [ ] **Domino Cribbage**
  - JSON: [domino-cribbage.json](../src/processed-games/domino-cribbage.json)
  - URLs: https://www.pagat.com/domino/adding/cribbage.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-cribbage.html, wiki-dominoes.html)

- 271 : [ ] **Domino Euchre | Euchre dominoes**
  - JSON: [domino-euchre.json](../src/processed-games/domino-euchre.json)
  - URLs: https://www.pagat.com/domino/trick/euchre.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-euchre.html, wiki-dominoes.html)

- 272 : [ ] **Domino Loo | Loo Dominoes**
  - JSON: [domino-loo.json](../src/processed-games/domino-loo.json)
  - URLs: https://www.pagat.com/domino/trick/loo.html | https://en.wikipedia.org/wiki/Dominoes | https://www.pagat.com/domino/line/loo.html
  - Local HTML: âœ“ (pagat-domino-loo.html, wiki-dominoes.html)

- 273 : [ ] **Domino Poker**
  - JSON: [domino-poker.json](../src/processed-games/domino-poker.json)
  - URLs: https://www.pagat.com/domino/misc/poker.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-poker.html, wiki-dominoes.html)

- 274 : [ ] **Domino Rounce | Rounce Dominoes**
  - JSON: [domino-rounce.json](../src/processed-games/domino-rounce.json)
  - URLs: https://www.pagat.com/domino/trick/loo.html#rounce | https://en.wikipedia.org/wiki/Dominoes | https://www.pagat.com/domino/line/rounce.html
  - Local HTML: âœ“ (pagat-domino-loo.html, wiki-dominoes.html)

- 275 : [ ] **Domino Twenty-One**
  - JSON: [domino-twenty-one.json](../src/processed-games/domino-twenty-one.json)
  - URLs: https://www.pagat.com/domino/adding/21.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-21.html, wiki-dominoes.html)

- 276 : [ ] **Dompe**
  - JSON: [dompe.json](../src/processed-games/dompe.json)
  - URLs: https://www.pagat.com/draw/knock-poker.html#dompe
  - Local HTML: âœ“ (pagat-knock-poker.html)

- 277 : [ ] **Don Irish | Irish Don**
  - JSON: [don-irish.json](../src/processed-games/don-irish.json)
  - URLs: https://www.pagat.com/allfours/don.html#irish | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (pagat-don.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 278 : [ ] **Don nine card | Big Don | Chase the Nine | Chaser | Fat | Phat**
  - JSON: [don-nine-card.json](../src/processed-games/don-nine-card.json)
  - URLs: https://www.pagat.com/allfours/don.html#nine | https://en.wikipedia.org/wiki/All_fours_(card_game) | https://www.pagat.com/allfours/don.html#phat
  - Local HTML: âœ“ (pagat-don.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 279 : [ ] **Donkey South Indian**
  - JSON: [donkey-south-indian.json](../src/processed-games/donkey-south-indian.json)
  - URLs: https://www.pagat.com/inflation/getaway.html#donkey | https://en.wikipedia.org/wiki/President_(card_game)
  - Local HTML: âœ“ (pagat-getaway.html, wiki-president-5.html, wiki-president.html)

- 280 : [ ] **Doppelkopf**
  - JSON: [doppelkopf.json](../src/processed-games/doppelkopf.json)
  - URLs: https://www.pagat.com/schafkopf/doko.html | https://en.wikipedia.org/wiki/Schafkopf
  - Local HTML: âœ“ (pagat-doko.html, pagat-schafk-doko.html, wiki-schafkopf-3.html, wiki-schafkopf.html)

- 281 : [ ] **Doscientos | 200 Dominoes**
  - JSON: [doscientos.json](../src/processed-games/doscientos.json)
  - URLs: https://www.pagat.com/domino/line/partnership.html#200 | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-partnership.html, wiki-dominoes.html)

- 282 : [ ] **Dou Dizhu æ–—åœ°ä¸» | Fight the Landlord**
  - JSON: [dou-dizhu.json](../src/processed-games/dou-dizhu.json)
  - URLs: https://www.pagat.com/climbing/doudizhu.html
  - Local HTML: âœ“ (pagat-doudizhu.html)

- 283 : [ ] **Double Bergen**
  - JSON: [double-bergen.json](../src/processed-games/double-bergen.json)
  - URLs: https://www.pagat.com/domino/cross/bergen2.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-bergen-2.html, wiki-dominoes.html)

- 284 : [ ] **Double BriÅ¡kula**
  - JSON: [double-bri-kula.json](../src/processed-games/double-bri-kula.json)
  - URLs: https://www.pagat.com/aceten/briscola.html#double | https://en.wikipedia.org/wiki/Tressette
  - Local HTML: âœ“ (pagat-briscola.html, wiki-tressette-2.html, wiki-tressette.html)

- 285 : [ ] **Double Draw Dominoes**
  - JSON: [double-draw-dominoes.json](../src/processed-games/double-draw-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/double_draw.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-double-draw.html, wiki-dominoes.html)

- 286 : [ ] **Double Draw Poker**
  - JSON: [double-draw.json](../src/processed-games/double-draw.json)
  - URLs: https://www.pagat.com/poker/variants/lowball.html#double | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-lowball.html, wiki-poker.html)

- 287 : [ ] **Double Sir**
  - JSON: [double-sir.json](../src/processed-games/double-sir.json)
  - URLs: https://www.pagat.com/whist/rang.html#double | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-rang.html, wiki-whist-4.html, wiki-whist.html)

- 288 : [ ] **Double Solitaire**
  - JSON: [double-klondike.json](../src/processed-games/double-klondike.json)
  - URLs: https://www.pagat.com/patience/double.html | https://en.wikipedia.org/wiki/Patience_(game)
  - Local HTML: âœ“ (pagat-patience-double.html, wiki-patience.html)

- 289 : [ ] **Double Yukon**
  - JSON: [double-yukon.json](../src/processed-games/double-yukon.json)
  - URLs: https://en.wikipedia.org/wiki/Yukon_(solitaire)
  - Local HTML: âœ“ (wiki-yukon-solitaire.html, wiki-yukon.html)

- 290 : [ ] **Double-Hand Dominoes | Twist'em Dominoes**
  - JSON: [twist-em.json](../src/processed-games/twist-em.json)
  - URLs: https://www.pagat.com/domino/partition/doublehand.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-doublehand.html, wiki-dominoes.html)

- 291 : [ ] **Down and Back**
  - JSON: [down-and-back.json](../src/processed-games/down-and-back.json)
  - URLs: https://www.pagat.com/draw/down_and_back.html
  - Local HTML: âœ“ (pagat-down-and-back.html)

- 292 : [ ] **Draw Dominoes**
  - JSON: [draw-dominoes.json](../src/processed-games/draw-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/draw.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-draw.html, pagat-domino-line-draw.html, wiki-dominoes.html)

- 293 : [ ] **Dreeg | NÃ¼rnberger Dreck**
  - JSON: [dreeg.json](../src/processed-games/dreeg.json)
  - URLs: https://www.pagat.com/marriage/dreeg.html | https://en.wikipedia.org/wiki/Bezique
  - Local HTML: âœ“ (pagat-dreeg.html, wiki-bezique-2.html, wiki-bezique.html)

- 294 : [ ] **Dreierles**
  - JSON: [dreierles.json](../src/processed-games/dreierles.json)
  - URLs: https://www.pagat.com/tarot/dreierles.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (pagat-dreierles.html, wiki-tarot-2.html, wiki-tarot.html)

- 295 : [ ] **Droggn Tarock**
  - JSON: [droggn-tarock.json](../src/processed-games/droggn-tarock.json)
  - URLs: https://www.pagat.com/tarot/stubtar.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (pagat-stubtar.html, wiki-tarot-2.html, wiki-tarot.html)

- 296 : [ ] **Dubbelkingen**
  - JSON: [dubbelkingen.json](../src/processed-games/dubbelkingen.json)
  - URLs: https://www.pagat.com/compendium/kingen.html#double
  - Local HTML: âœ“ (pagat-kingen.html)

- 297 : [ ] **DudÃ¡k**
  - JSON: [dudak.json](../src/processed-games/dudak.json)
  - URLs: https://www.pagat.com/beating/dudak.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-dudak.html, wiki-durak-3.html, wiki-durak.html)

- 298 : [ ] **Durak | Podkidnoy Durak**
  - JSON: [durak.json](../src/processed-games/durak.json)
  - URLs: https://www.pagat.com/beating/durak.html | https://en.wikipedia.org/wiki/Durak | https://www.pagat.com/beating/podkidnoy_durak.html
  - Local HTML: âœ“ (pagat-durak.html, pagat-podkidnoy-durak.html, wiki-durak-3.html, wiki-durak.html)

- 299 : [ ] **Durak Perevodnoy**
  - JSON: [durak-perevodnoy.json](../src/processed-games/durak-perevodnoy.json)
  - URLs: https://www.pagat.com/beating/perevodnoy_durak.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-perevodnoy-durak.html, wiki-durak-3.html, wiki-durak.html)

- 300 : [ ] **Durak Podkidnoy | DureÅ„**
  - JSON: [podkidnoy-durak.json](../src/processed-games/podkidnoy-durak.json)
  - URLs: https://www.pagat.com/beating/podkidnoy_durak.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-podkidnoy-durak.html, wiki-durak-3.html, wiki-durak.html)

- 301 : [ ] **Durak Prostoy | DureÅ„ PiÄ…tkowy**
  - JSON: [durak-prostoy.json](../src/processed-games/durak-prostoy.json)
  - URLs: https://www.pagat.com/beating/prostoy_durak.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-prostoy-durak.html, wiki-durak-3.html, wiki-durak.html)

- 302 : [ ] **Durak Severnyi**
  - JSON: [durak-severnyi.json](../src/processed-games/durak-severnyi.json)
  - URLs: https://www.pagat.com/beating/podkidnoy_durak.html#severnyi | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-podkidnoy-durak.html, wiki-durak-3.html, wiki-durak.html)

### E

- 303 : [x] **Earl of Coventry**
  - JSON: [earl-of-coventry.json](../src/processed-games/earl-of-coventry.json)
  - URLs: https://www.pagat.com/stops/snipsnapsnorum.html#equal | https://en.wikipedia.org/wiki/Michigan_(card_game)
  - Local HTML: âœ“ (pagat-snipsnapsnorum.html, wiki-michigan.html)

- 304 : [x] **Egyptian Ratscrew | Rat Screw | Ratslap**
  - JSON: [egyptian-ratscrew.json](../src/processed-games/egyptian-ratscrew.json)
  - URLs: https://www.pagat.com/war/egyptrat.html | https://en.wikipedia.org/wiki/Egyptian_Ratscrew | https://en.wikipedia.org/wiki/War_(card_game)
  - Local HTML: âœ“ (pagat-egyptrat.html, wiki-egyptian-ratscrew-2.html, wiki-egyptian-ratscrew.html, wiki-war-3.html, wiki-war.html)

- 305 : [x] **Eight Off**
  - JSON: [eight-off.json](../src/processed-games/eight-off.json)
  - URLs: https://en.wikipedia.org/wiki/Eight_Off
  - Local HTML: âœ“ (wiki-eight-off.html)

- 306 : [x] **Eighty Eight**
  - JSON: [eighty-eight.json](../src/processed-games/eighty-eight.json)
  - URLs: https://www.pagat.com/domino/trick/texas88.html
  - Local HTML: âœ“ (pagat-texas88.html)

- 307 : [x] **Eighty-Three**
  - JSON: [eighty-three.json](../src/processed-games/eighty-three.json)
  - URLs: https://www.pagat.com/allfours/pedro.html#83 | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (pagat-pedro.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 308 : [x] **Eleusis**
  - JSON: [eleusis.json](../src/processed-games/eleusis.json)
  - URLs: https://www.pagat.com/eights/eleusis.html | https://en.wikipedia.org/wiki/Eleusis_(card_game)
  - Local HTML: âœ“ (pagat-eleusis.html, wiki-eleusis-2.html, wiki-eleusis.html)

- 309 : [x] **ElÃ©wÃ©njewÃ©**
  - JSON: [elewenjewe.json](../src/processed-games/elewenjewe.json)
  - URLs: https://www.pagat.com/fishing/elewenjewe.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-elewenjewe.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 310 : [x] **Empat Satu 41**
  - JSON: [empat-satu-41.json](../src/processed-games/empat-satu-41.json)
  - URLs: https://www.pagat.com/draw/41.html
  - Local HTML: âœ“ (pagat-draw-forty-one.html)

- 311 : [x] **Encaje | Mus FrancÃ©s**
  - JSON: [encaje.json](../src/processed-games/encaje.json)
  - URLs: https://www.pagat.com/vying/encaje.html
  - Local HTML: âœ“ (pagat-encaje.html)

- 312 : [x] **English Stud Poker**
  - JSON: [english-stud.json](../src/processed-games/english-stud.json)
  - URLs: https://www.pagat.com/poker/variants/7stud.html#english | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-seven-card-stud.html, wiki-poker.html)

- 313 : [x] **Escoba**
  - JSON: [escoba-de-15.json](../src/processed-games/escoba-de-15.json)
  - URLs: https://www.pagat.com/fishing/escoba.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-escoba.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 314 : [x] **Espanjalainen paskahousu**
  - JSON: [poytapaska.json](../src/processed-games/poytapaska.json)
  - URLs: https://www.pagat.com/beating/paskahousu.html#table | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-paskahousu.html, wiki-durak-3.html, wiki-durak.html)

- 315 : [x] **Euchre**
  - JSON: [euchre.json](../src/processed-games/euchre.json)
  - URLs: https://www.pagat.com/euchre/euchre.html | https://en.wikipedia.org/wiki/Euchre
  - Local HTML: âœ“ (pagat-euchre.html, wiki-euchre-3.html, wiki-euchre.html)

### F

- 316 : [x] **Fan Tan | Domino cards | Parliament | Sevens**
  - JSON: [fan.json](../src/processed-games/fan.json) âœ“ VALIDATED
  - URLs: https://www.pagat.com/layout/sevens.html | https://en.wikipedia.org/wiki/Fan_tan
  - Local HTML: âœ“ (pagat-sevens.html)

- 317 : [x] **Fapfap | Agram | Sink-Sink**
  - JSON: [fapfap.json](../src/processed-games/fapfap.json) âœ“ VALIDATED
  - URLs: https://www.pagat.com/last/agram.html#fapfap | https://en.wikipedia.org/wiki/Last_Card
  - Local HTML: âœ“ (pagat-agram.html)

- 318 : [x] **Faro | Pharaon | Bucking the Tiger**
  - JSON: [faro.json](../src/processed-games/faro.json) âœ“ VALIDATED
  - URLs: https://www.pagat.com/banking/faro.html | https://www.britannica.com/topic/faro-card-game | https://en.wikipedia.org/wiki/Stuss
  - Local HTML: âœ“ (britannica-faro.html, pagat-faro.html, wiki-stuss.html)

- 319 : [x] **Fast Track**
  - JSON: [fast-track.json](../src/processed-games/fast-track.json) âœ“ VALIDATED
  - URLs: https://www.pagat.com/race/fast_track.html
  - Local HTML: âœ“ (pagat-fast-track.html)

- 320 : [x] **Ferbli | 41 | FÃ¤rbeln**
  - JSON: [ferbli.json](../src/processed-games/ferbli.json) âœ“ VALIDATED
  - URLs: https://www.pagat.com/vying/ferbli.html
  - Local HTML: âœ“ (pagat-ferbli.html)

- 321 : [x] **Fifty-Five | 55/110/220**
  - JSON: [fifty-five.json](../src/processed-games/fifty-five.json) âœ“ VALIDATED
  - URLs: https://www.pagat.com/spoil5/25.html#55-110-220 | https://en.wikipedia.org/wiki/Forty-fives
  - Local HTML: âœ“ (pagat-spoil-five-25.html, wiki-forty-fives-2.html, wiki-forty-fives-3.html, wiki-forty-fives.html)

- 322 : [ ] **Fifty-one Chinese**
  - JSON: [fifty-one-chinese.json](../src/processed-games/fifty-one-chinese.json)
  - URLs: https://www.pagat.com/commerce/51.html | https://en.wikipedia.org/wiki/Schwimmen
  - Local HTML: âœ“ (pagat-commerce-51-card.html, wiki-schwimmen.html)

- 323 : [ ] **Fifty-one Japanese**
  - JSON: [fifty-one-japanese.json](../src/processed-games/fifty-one-japanese.json)
  - URLs: https://www.pagat.com/commerce/51.html#japanese | https://en.wikipedia.org/wiki/Schwimmen
  - Local HTML: âœ“ (pagat-commerce-51-card.html, wiki-schwimmen.html)

- 324 : [ ] **Fifty-Six | 56**
  - JSON: [fifty-six.json](../src/processed-games/fifty-six.json)
  - URLs: https://www.pagat.com/jass/56.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-jass-56.html, wiki-jass-3.html, wiki-jass.html)

- 325 : [ ] **FilicÄƒu**
  - JSON: [filic-u.json](../src/processed-games/filic-u.json)
  - URLs: https://www.pagat.com/schafkopf/filicau.html | https://en.wikipedia.org/wiki/Schafkopf
  - Local HTML: âœ“ (pagat-filicau.html, pagat-schafk-filicau.html, wiki-schafkopf-3.html, wiki-schafkopf.html)

- 326 : [ ] **FilkÃ³**
  - JSON: [filk.json](../src/processed-games/filk.json)
  - URLs: https://www.pagat.com/schafkopf/filicau.html#filko | https://en.wikipedia.org/wiki/Schafkopf
  - Local HTML: âœ“ (pagat-filicau.html, pagat-schafk-filicau.html, wiki-schafkopf-3.html, wiki-schafkopf.html)

- 327 : [ ] **Fipsen**
  - JSON: [fipsen.json](../src/processed-games/fipsen.json)
  - URLs: https://www.pagat.com/trumps/fipsen.html
  - Local HTML: âœ“ (pagat-fipsen.html)

- 328 : [ ] **Fish Pitch**
  - JSON: [pitch-fish.json](../src/processed-games/pitch-fish.json)
  - URLs: https://www.pagat.com/allfours/pitch.html#fish | https://en.wikipedia.org/wiki/Pitch_(card_game)
  - Local HTML: âœ“ (pagat-pitch.html, wiki-pitch-5.html, wiki-pitch.html)

- 329 : [ ] **Five Card Draw Deuces Wild Poker | 5 Card Draw Deuces Wild Poker**
  - JSON: [five-card-draw-deuces-wild.json](../src/processed-games/five-card-draw-deuces-wild.json)
  - URLs: https://www.pagat.com/poker/variants/5draw.html#deuces | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-five-card-draw.html, wiki-poker.html)

- 330 : [ ] **Five Card Draw Poker | 5 Card Draw Poker | Draw Poker | Poker**
  - JSON: [five-card-draw.json](../src/processed-games/five-card-draw.json)
  - URLs: https://www.pagat.com/poker/variants/5draw.html | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/5draw.html#five
  - Local HTML: âœ“ (pagat-five-card-draw.html, wiki-poker.html)

- 331 : [ ] **Five Card Stud High-Low Poker | 5 Card Stud High-Low Poker**
  - JSON: [five-card-stud-high-low.json](../src/processed-games/five-card-stud-high-low.json)
  - URLs: https://www.pagat.com/poker/variants/5stud.html#hilo | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-five-card-stud.html, wiki-poker.html)

- 332 : [ ] **Five Card Stud Poker | 5 Card Stud Poker**
  - JSON: [five-card-stud.json](../src/processed-games/five-card-stud.json)
  - URLs: https://www.pagat.com/poker/variants/5stud.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-five-card-stud.html, wiki-poker.html)

- 333 : [ ] **Five Hundred**
  - JSON: [five-hundred.json](../src/processed-games/five-hundred.json)
  - URLs: https://www.pagat.com/euchre/500.html | https://en.wikipedia.org/wiki/500_(card_game)
  - Local HTML: âœ“ (pagat-euchre-500.html, wiki-500-card-game-alt.html, wiki-500-card-game.html, wiki-500-card.html, wiki-500.html)

- 334 : [ ] **Five Up Dominoes | 5 Up Dominoes**
  - JSON: [five-up-dominoes.json](../src/processed-games/five-up-dominoes.json)
  - URLs: https://www.pagat.com/domino/tree/five_up.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-five-up.html, wiki-dominoes.html)

- 335 : [ ] **Fives and Threes Dominoes | 5's and 3's Dominoes | Muggins Dominoes**
  - JSON: [fives-and-threes-dominoes.json](../src/processed-games/fives-and-threes-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/fives_and_threes.html | https://en.wikipedia.org/wiki/Dominoes | https://www.pagat.com/domino/line/muggins.html
  - Local HTML: âœ“ (pagat-fives-and-threes.html, pagat-muggins.html, wiki-dominoes.html)

- 336 : [ ] **Flower & Scorpion**
  - JSON: [flower-scorpion.json](../src/processed-games/flower-scorpion.json)
  - URLs: https://www.pagat.com/domino/line/flower.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-flower.html, wiki-dominoes.html)

- 337 : [ ] **Follow The Queen**
  - JSON: [follow-the-queen.json](../src/processed-games/follow-the-queen.json)
  - URLs: https://www.pagat.com/poker/variants/chicago.html#followqueen
  - Local HTML: âœ“ (pagat-chicago-poker.html)

- 338 : [ ] **Fool Mb**
  - JSON: [fool-mb.json](../src/processed-games/fool-mb.json)
  - URLs: https://boardgamegeek.com/boardgame/12439/fool
  - Local HTML: âœ“ (pagat-durak.html)

- 339 : [ ] **Football**
  - JSON: [football.json](../src/processed-games/football.json)
  - URLs: https://www.pagat.com/poker/variants/baseball.html
  - Local HTML: âœ“ (pagat-baseball-poker.html)

- 340 : [ ] **Fortress**
  - JSON: [fortress.json](../src/processed-games/fortress.json)
  - URLs: https://www.bicyclecards.com/how-to-play/fortress
  - Local HTML: âœ“ (wiki-fortress.html)

- 341 : [ ] **Forty Five**
  - JSON: [forty-five.json](../src/processed-games/forty-five.json)
  - URLs: https://www.pagat.com/spoil5/45.html
  - Local HTML: âœ“ (pagat-spoil-five-45.html)

- 342 : [ ] **Forty Thieves**
  - JSON: [forty-thieves.json](../src/processed-games/forty-thieves.json)
  - URLs: https://en.wikipedia.org/wiki/Forty_Thieves_(card_game)
  - Local HTML: âœ“ (wiki-forty-thieves.html)

- 343 : [ ] **Forty-One Exchange**
  - JSON: [forty-one-exchange.json](../src/processed-games/forty-one-exchange.json)
  - URLs: https://www.pagat.com/commerce/schwimmen.html#41 | https://en.wikipedia.org/wiki/Schwimmen
  - Local HTML: âœ“ (pagat-commerce-schwimmen.html, wiki-schwimmen.html)

- 344 : [ ] **Forty-One Syrian**
  - JSON: [forty-one-syrian.json](../src/processed-games/forty-one-syrian.json)
  - URLs: https://www.pagat.com/auctionwhist/41.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-forty-one.html, wiki-whist-4.html, wiki-whist.html)

- 345 : [ ] **Four Card Poker**
  - JSON: [four-card-poker.json](../src/processed-games/four-card-poker.json)
  - URLs: https://wizardofodds.com/games/four-card-poker/ | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 346 : [ ] **Four of a Kind**
  - JSON: [four-of-a-kind.json](../src/processed-games/four-of-a-kind.json)
  - URLs: https://www.pagat.com/vying/4ofakind.html
  - Local HTML: âœ“ (pagat-vying-four-of-a-kind.html)

- 347 : [ ] **Four-Two-Three Poker**
  - JSON: [4-2-3.json](../src/processed-games/4-2-3.json)
  - URLs: https://www.pagat.com/poker/variants/guts.html#423 | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-guts.html, wiki-poker.html)

- 348 : [ ] **Freeze Out Dominoes**
  - JSON: [freeze-out-dominoes.json](../src/processed-games/freeze-out-dominoes.json)
  - URLs: https://www.pagat.com/domino/misc/freeze_out.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-freeze-out.html, wiki-dominoes.html)

- 349 : [ ] **French Dominoes**
  - JSON: [french-dominoes.json](../src/processed-games/french-dominoes.json)
  - URLs: https://www.pagat.com/domino/cross/french.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-french.html, wiki-dominoes.html)

### G

- 350 : [x] **G N D Ng Y N**
  - JSON: [g-n-d-ng-y-n.json](../src/processed-games/g-n-d-ng-y-n.json)
  - URLs: https://www.pagat.com/climbing/gandengyan.html
  - Local HTML: âœ“ (pagat-gandengyan.html)

- 351 : [x] **Gaigel**
  - JSON: [gaigel.json](../src/processed-games/gaigel.json)
  - URLs: https://www.pagat.com/marriage/gaigel.html | https://en.wikipedia.org/wiki/Gaigel
  - Local HTML: âœ“ (pagat-marriage-gaigel.html, wiki-gaigel-2.html, wiki-gaigel.html)

- 352 : [x] **Gallinazo**
  - JSON: [gallinazo.json](../src/processed-games/gallinazo.json)
  - URLs: https://www.pagat.com/domino/line/gallinazo.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-gallinazo.html, wiki-dominoes.html)

- 353 : [x] **Gambari-Kan**
  - JSON: [gambari-kan.json](../src/processed-games/gambari-kan.json)
  - URLs: https://www.pagat.com/picture/kan.html#gambari
  - Local HTML: âœ“ (pagat-kan.html)

- 354 : [x] **Game to Lose**
  - JSON: [game-to-lose.json](../src/processed-games/game-to-lose.json)
  - URLs: https://www.pagat.com/allfours/game_to_lose.html | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (pagat-game-to-lose.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 355 : [x] **Game, Flip, Flop**
  - JSON: [game-flip-flop.json](../src/processed-games/game-flip-flop.json)
  - URLs: https://www.pagat.com/rummy/game_flip_flop.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-flip-flop.html, wiki-rummy-4.html, wiki-rummy.html)

- 356 : [x] **GÄn DÃ¨ng YÇŽn å¹²çžªçœ¼**
  - JSON: [gandengyan.json](../src/processed-games/gandengyan.json)
  - URLs: https://www.pagat.com/climbing/gandengyan.html
  - Local HTML: âœ“ (pagat-gandengyan.html)

- 357 : [x] **Gao Ji**
  - JSON: [gao-ji.json](../src/processed-games/gao-ji.json)
  - URLs: https://www.pagat.com/climbing/gouji.html
  - Local HTML: âœ“ (pagat-gouji.html)

- 358 : [x] **Gaple**
  - JSON: [gaple.json](../src/processed-games/gaple.json)
  - URLs: https://www.pagat.com/domino/line/gaple.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-gaple.html, wiki-dominoes.html)

- 359 : [x] **Gaps**
  - JSON: [gaps.json](../src/processed-games/gaps.json)
  - URLs: https://www.bvssolitaire.com/rules/gaps.htm
  - Local HTML: âœ“ (wiki-gaps.html)

- 360 : [x] **Garrafina**
  - JSON: [garrafina.json](../src/processed-games/garrafina.json)
  - URLs: https://www.pagat.com/domino/star/garrafina.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-garrafina.html, wiki-dominoes.html)

- 361 : [x] **GÃ©nÃ©rala**
  - JSON: [generala.json](../src/processed-games/generala.json)
  - URLs: https://www.pagat.com/inflation/generala.html | https://en.wikipedia.org/wiki/Generala
  - Local HTML: âœ“ (pagat-generala.html, wiki-generala.html)

- 362 : [x] **German Solo**
  - JSON: [german-solo.json](../src/processed-games/german-solo.json)
  - URLs: https://www.pagat.com/lhombre/solo.html | https://en.wikipedia.org/wiki/Ombre
  - Local HTML: âœ“ (pagat-lhombre-solo.html, wiki-ombre-2.html, wiki-ombre.html)

- 363 : [x] **German Whist**
  - JSON: [german-whist.json](../src/processed-games/german-whist.json)
  - URLs: https://www.pagat.com/whist/german_whist.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-german-whist.html, wiki-whist-4.html, wiki-whist.html)

- 364 : [x] **Getaway | Bhabhi**
  - JSON: [getaway.json](../src/processed-games/getaway.json)
  - URLs: https://www.pagat.com/inflation/getaway.html | https://en.wikipedia.org/wiki/President_(card_game)
  - Local HTML: âœ“ (pagat-getaway.html, wiki-president-5.html, wiki-president.html)

- 365 : [x] **GhÃ¢rat**
  - JSON: [gh-rat.json](../src/processed-games/gh-rat.json)
  - URLs: https://www.pagat.com/fishing/gharat.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-gharat.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 366 : [x] **Giltspiel**
  - JSON: [giltspiel.json](../src/processed-games/giltspiel.json)
  - URLs: https://www.pagat.com/trumps/giltspiel.html
  - Local HTML: âœ“ (pagat-giltspiel.html)

- 367 : [x] **Gin Rummy**
  - JSON: [gin-rummy.json](../src/processed-games/gin-rummy.json)
  - URLs: https://www.pagat.com/rummy/ginrummy.html | https://en.wikipedia.org/wiki/Gin_rummy
  - Local HTML: âœ“ (pagat-ginrummy.html, wiki-gin-rummy-2.html, wiki-gin-rummy.html)

- 368 : [x] **Ging | Seven Cards**
  - JSON: [ging.json](../src/processed-games/ging.json)
  - URLs: https://www.pagat.com/showdown/ging.html
  - Local HTML: âœ“ (pagat-ging.html)

- 369 : [x] **Giog çˆµ**
  - JSON: [giog.json](../src/processed-games/giog.json)
  - URLs: https://www.pagat.com/multitrk/giog.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-giog.html, wiki-whist-4.html, wiki-whist.html)

- 370 : [x] **Gleek**
  - JSON: [gleek.json](../src/processed-games/gleek.json)
  - URLs: https://www.pagat.com/pointtrk/gleek.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-gleek.html, wiki-whist-4.html, wiki-whist.html)

- 371 : [x] **Gnav**
  - JSON: [gnav.json](../src/processed-games/gnav.json)
  - URLs: https://www.pagat.com/cuckoo/gnav.html | https://en.wikipedia.org/wiki/Cuckoo_(card_game)
  - Local HTML: âœ“ (pagat-gnav.html, wiki-cuckoo.html)

- 372 : [x] **Go Fish | Fish**
  - JSON: [go-fish.json](../src/processed-games/go-fish.json)
  - URLs: https://www.pagat.com/quartet/gofish.html | https://en.wikipedia.org/wiki/Go_Fish
  - Local HTML: âœ“ (pagat-gofish.html, wiki-go-fish-2.html, wiki-go-fish.html)

- 373 : [x] **Go Stop**
  - JSON: [go-stop.json](../src/processed-games/go-stop.json)
  - URLs: https://www.pagat.com/fishing/gostop.html | https://en.wikipedia.org/wiki/Go-Stop
  - Local HTML: âœ“ (pagat-gostop.html, wiki-go-stop-2.html, wiki-go-stop.html)

- 374 : [x] **Goita**
  - JSON: [goita.json](../src/processed-games/goita.json)
  - URLs: https://www.pagat.com/climbing/goita.html
  - Local HTML: âœ“ (pagat-goita.html)

- 375 : [x] **Golden Ten**
  - JSON: [golden-ten.json](../src/processed-games/golden-ten.json)
  - URLs: https://www.pagat.com/reverse/golden10.html | https://en.wikipedia.org/wiki/Hearts_(card_game)
  - Local HTML: âœ“ (pagat-golden-ten.html, wiki-hearts-3.html, wiki-hearts.html)

- 376 : [x] **Golf**
  - JSON: [golf.json](../src/processed-games/golf.json)
  - URLs: https://www.pagat.com/draw/golf.html
  - Local HTML: âœ“ (pagat-golf.html)

- 377 : [x] **Golf Eight Card**
  - JSON: [golf-eight-card.json](../src/processed-games/golf-eight-card.json)
  - URLs: https://www.pagat.com/draw/golf.html#eight
  - Local HTML: âœ“ (pagat-golf.html)

- 378 : [x] **Golf Four Card | Polish Poker Four Card | Turtle**
  - JSON: [golf-four-card.json](../src/processed-games/golf-four-card.json)
  - URLs: https://www.pagat.com/draw/golf.html#four | https://www.pagat.com/draw/golf.html
  - Local HTML: âœ“ (pagat-golf.html)

- 379 : [x] **Golf Nine Card | Crazy Nines**
  - JSON: [golf-nine-card.json](../src/processed-games/golf-nine-card.json)
  - URLs: https://www.pagat.com/draw/golf.html#nine | http://9cardgolf.com/family-rules.html
  - Local HTML: âœ“ (pagat-golf.html)

- 380 : [x] **Golf Six Card | Hara Kiri | Polish Poker Six Card**
  - JSON: [golf-six-card.json](../src/processed-games/golf-six-card.json)
  - URLs: https://www.pagat.com/draw/golf.html#six | https://www.pagat.com/draw/golf.html
  - Local HTML: âœ“ (pagat-golf.html)

- 381 : [x] **Gong Zhu æ‹±çŒª | Chase the Pig**
  - JSON: [gong-zhu.json](../src/processed-games/gong-zhu.json)
  - URLs: https://www.pagat.com/reverse/gongzhu.html | https://en.wikipedia.org/wiki/Gongzhu
  - Local HTML: âœ“ (pagat-gongzhu.html, wiki-gongzhu.html)

- 382 : [x] **Gonin-Kan**
  - JSON: [gonin-kan.json](../src/processed-games/gonin-kan.json)
  - URLs: https://www.pagat.com/picture/kan.html#gonin
  - Local HTML: âœ“ (pagat-kan.html)

- 383 : [x] **GOPS | Goofenspiel**
  - JSON: [gops.json](../src/processed-games/gops.json)
  - URLs: https://www.pagat.com/misc/gops.html
  - Local HTML: âœ“ (pagat-game-of-pure-strategy.html)

- 384 : [x] **GÃ²u JÃ­ å¤Ÿçº§**
  - JSON: [gouji.json](../src/processed-games/gouji.json)
  - URLs: https://www.pagat.com/climbing/gouji.html
  - Local HTML: âœ“ (pagat-gouji.html)

- 385 : [x] **Gu N D N**
  - JSON: [gu-n-d-n.json](../src/processed-games/gu-n-d-n.json)
  - URLs: https://www.pagat.com/climbing/guan_dan.html
  - Local HTML: âœ“ (pagat-guan-dan.html)

- 386 : [x] **Guadalupe**
  - JSON: [guadalupe.json](../src/processed-games/guadalupe.json)
  - URLs: https://www.pagat.com/rummy/carousel.html
  - Local HTML: âœ“ (pagat-carousel.html)

- 387 : [x] **GuÃ n DÃ n æŽ¼è›‹**
  - JSON: [guan-dan.json](../src/processed-games/guan-dan.json)
  - URLs: https://www.pagat.com/climbing/guan_dan.html | https://en.wikipedia.org/wiki/Guandan
  - Local HTML: âœ“ (pagat-guan-dan.html, wiki-guandan-2.html, wiki-guandan.html)

- 388 : [x] **GuiÃ±ote**
  - JSON: [tute-guinote.json](../src/processed-games/tute-guinote.json)
  - URLs: https://www.pagat.com/marriage/tute.html#guinote | https://en.wikipedia.org/wiki/Bezique
  - Local HTML: âœ“ (pagat-tute.html, wiki-bezique-2.html, wiki-bezique.html)

- 389 : [x] **Guo Wu Guan éŽäº”é—œ**
  - JSON: [guo-wu-guan.json](../src/processed-games/guo-wu-guan.json)
  - URLs: https://www.pagat.com/domino/solitaire/guowuguan.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-guowuguan.html, wiki-dominoes.html)

- 390 : [x] **Guts | 4-2-2 Poker | 4-2-3 Poker | Four-Two-Two Poker**
  - JSON: [guts.json](../src/processed-games/guts.json)
  - URLs: https://www.pagat.com/poker/variants/guts.html#422 | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/guts.html | https://en.wikipedia.org/wiki/Guts_(card_game) | https://www.pagat.com/poker/variants/guts.html#423 | https://wizardofodds.com/games/guts/
  - Local HTML: âœ“ (pagat-guts.html, wiki-guts-2.html, wiki-guts.html, wiki-poker.html)

### H

- 391 : [x] **Hachi-Hachi | 88 Japanese**
  - JSON: [hachi-hachi.json](../src/processed-games/hachi-hachi.json)
  - URLs: https://www.pagat.com/fishing/88.html | https://en.wikipedia.org/wiki/Scopa | https://fudawiki.org/en/hanafuda/games/hachi-hachi
  - Local HTML: âœ“ (pagat-fishing-88.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 392 : [x] **Haitian Dominoes | Dominoes Haitian**
  - JSON: [haitian-dominoes.json](../src/processed-games/haitian-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/caribbean.html#haiti | https://en.wikipedia.org/wiki/Dominoes | https://www.pagat.com/domino/line/caribbean.html#haitian
  - Local HTML: âœ“ (pagat-domino-caribbean.html, wiki-dominoes.html)

- 393 : [x] **Hanafuda**
  - JSON: [hanafuda.json](../src/processed-games/hanafuda.json)
  - URLs: https://en.wikipedia.org/wiki/Hanafuda | https://fudawiki.org/en/hanafuda
  - Local HTML: âœ“ (wiki-hanafuda.html)

- 394 : [ ] **Hand and Foot | Hand and Foot Bain**
  - JSON: [hand-and-foot.json](../src/processed-games/hand-and-foot.json)
  - URLs: https://www.pagat.com/rummy/handandfoot.html | https://en.wikipedia.org/wiki/Hand_and_Foot | https://www.pagat.com/rummy/handandfoot.html#bain
  - Local HTML: âœ“ (wiki-hand-and-foot.html)

- 395 : [x] **Handjass | Butzer Jass | Sackjass | SchlÃ¤ger Jass**
  - JSON: [handjass.json](../src/processed-games/handjass.json)
  - URLs: https://www.pagat.com/jass/handjass.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-handjass.html, wiki-jass-3.html, wiki-jass.html)

- 396 : [ ] **Happy Families | Jeu de Sept Familles**
  - JSON: [happy-families.json](../src/processed-games/happy-families.json)
  - URLs: https://www.pagat.com/quartet/happy.html | https://en.wikipedia.org/wiki/Happy_Families
  - Local HTML: âœ“ (wiki-happy-families.html)

- 397 : [x] **Have a Heart Poker**
  - JSON: [have-a-heart-poker.json](../src/processed-games/have-a-heart-poker.json)
  - URLs: https://www.pagat.com/reverse/hearts.html#haveaheart | https://en.wikipedia.org/wiki/Hearts_(card_game)
  - Local HTML: âœ“ (pagat-hearts.html, wiki-hearts-3.html, wiki-hearts.html)

- 398 : [ ] **Hazari**
  - JSON: [hazari.json](../src/processed-games/hazari.json)
  - URLs: https://www.pagat.com/whist/hazari.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 399 : [ ] **Hearts | Moon | Rickety Kate**
  - JSON: [hearts.json](../src/processed-games/hearts.json)
  - URLs: https://www.pagat.com/reverse/hearts.html | https://en.wikipedia.org/wiki/Hearts_(card_game) | https://www.pagat.com/reverse/hearts.html#moon
  - Local HTML: âœ“ (pagat-hearts.html, wiki-hearts-3.html, wiki-hearts.html)

- 400 : [ ] **Hidden Rung**
  - JSON: [hidden-rung.json](../src/processed-games/hidden-rung.json)
  - URLs: https://www.pagat.com/rummy/hidden_rung.html | https://en.wikipedia.org/wiki/Rummy | https://www.pagat.com/whist/courtpiece.html#hidden | https://en.wikipedia.org/wiki/Court_piece
  - Local HTML: âœ“ (wiki-court-piece.html, wiki-hokm.html, wiki-rummy-4.html, wiki-rummy.html)

- 401 : [x] **High Card Flush**
  - JSON: [high-card-flush.json](../src/processed-games/high-card-flush.json)
  - URLs: https://wizardofodds.com/games/high-card-flush/
  - Local HTML: âœ“ (wizardofodds-high-card-flush.html)

- 402 : [x] **High Card Pool**
  - JSON: [high-card-pool.json](../src/processed-games/high-card-pool.json)
  - URLs: https://www.pagat.com/poker/variants/indian.html#highcard | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-indian-poker.html, wiki-poker.html)

- 403 : [x] **High Low Split**
  - JSON: [high-low-split.json](../src/processed-games/high-low-split.json)
  - URLs: https://www.pagat.com/poker/variants/omaha.html
  - Local HTML: âœ“ (pagat-omaha.html)

- 404 : [x] **Hindersche**
  - JSON: [hindersche.json](../src/processed-games/hindersche.json)
  - URLs: https://www.pagat.com/jass/hindersche.html | https://en.wikipedia.org/wiki/Jass | https://en.wikipedia.org/wiki/Hindersche
  - Local HTML: âœ“ (wiki-hindersche.html, wiki-jass-3.html, wiki-jass.html)

- 405 : [x] **Hockey**
  - JSON: [hockey.json](../src/processed-games/hockey.json)
  - URLs: https://www.pagat.com/domino/line/hockey.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 406 : [x] **Hokm**
  - JSON: [hokm.json](../src/processed-games/hokm.json)
  - URLs: https://www.pagat.com/whist/hokm.html | https://en.wikipedia.org/wiki/Hokm
  - Local HTML: âœ“ (pagat-hokm.html, wiki-hokm.html)

- 407 : [x] **Hol S Der Geier**
  - JSON: [hol-s-der-geier.json](../src/processed-games/hol-s-der-geier.json)
  - URLs: https://en.wikipedia.org/wiki/What_the_Heck%3F
  - Local HTML: âœ“ (wiki-hols-der-geier.html, wiki-what-the-heck.html)

- 408 : [x] **Hola**
  - JSON: [hola.json](../src/processed-games/hola.json)
  - URLs: https://www.pagat.com/fishing/hola.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 409 : [x] **Hollywood Garbage | Garbage | Junk Poker**
  - JSON: [hollywood-garbage.json](../src/processed-games/hollywood-garbage.json)
  - URLs: https://www.pagat.com/compendium/garbage.html
  - Local HTML: âœ“ (pagat-garbage.html)

- 410 : [x] **Hollywood Gin**
  - JSON: [hollywood-gin.json](../src/processed-games/hollywood-gin.json)
  - URLs: https://www.pagat.com/rummy/ginrummy.html#hollywood
  - Local HTML: âœ“ (pagat-ginrummy.html)

- 411 : [x] **Honest John | Stormy Castle**
  - JSON: [honest-john.json](../src/processed-games/honest-john.json)
  - URLs: https://www.pagat.com/draw/honest_john.html
  - Local HTML: âœ“ (pagat-honest-john.html)

- 412 : [x] **Hoola**
  - JSON: [hoola.json](../src/processed-games/hoola.json)
  - URLs: https://www.pagat.com/fishing/hola.html#hoola | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 413 : [x] **HornafjarÃ°armanni**
  - JSON: [hornafjar-armanni.json](../src/processed-games/hornafjar-armanni.json)
  - URLs: https://www.pagat.com/beating/hornafjardarmanni.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 414 : [x] **Horse Race Dominoes**
  - JSON: [dominoes.json](../src/processed-games/dominoes.json)
  - URLs: https://www.pagat.com/domino/race/horse_race.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 415 : [x] **Hosa Aba**
  - JSON: [hosa-aba.json](../src/processed-games/hosa-aba.json)
  - URLs: https://www.pagat.com/fishing/hosa_aba.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 416 : [x] **Hose**
  - JSON: [hose.json](../src/processed-games/hose.json)
  - URLs: https://www.pagat.com/poker/variants/horse.html#hose
  - Local HTML: âœ“ (pagat-horse-poker.html)

- 417 : [x] **HoÅŸkin | Nezere | PinÃ®kÃªr | XoÅŸkÃ®n**
  - JSON: [xoskin.json](../src/processed-games/xoskin.json)
  - URLs: https://www.pagat.com/fishing/xoshkin.html | https://en.wikipedia.org/wiki/Scopa | https://en.wikipedia.org/wiki/Trick-taking_game
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 418 : [x] **Hou Zi Ba Pi**
  - JSON: [hou-zi-ba-pi.json](../src/processed-games/hou-zi-ba-pi.json)
  - URLs: https://en.wikipedia.org/wiki/Big_two
  - Local HTML: âœ“ (wiki-big-two.html)

- 419 : [x] **House Of Cards**
  - JSON: [house-of-cards.json](../src/processed-games/house-of-cards.json)
  - URLs: https://www.scribd.com/document/House-of-Cards-Game
  - Local HTML: âœ“ (scribd-house-of-cards.html)

- 420 : [x] **Hoyle**
  - JSON: [hoyle.json](../src/processed-games/hoyle.json)
  - URLs: https://www.pagat.com/whist/whist.html
  - Local HTML: âœ“ (pagat-whist.html)

- 421 : [x] **Humbug**
  - JSON: [humbug.json](../src/processed-games/humbug.json)
  - URLs: https://www.pagat.com/adders/crib6.html#humbug | https://en.wikipedia.org/wiki/Cribbage
  - Local HTML: âœ“ (pagat-crib6.html, wiki-cribbage-3.html, wiki-cribbage.html)

- 422 : [x] **Hundred and Ten**
  - JSON: [hundred-and-ten.json](../src/processed-games/hundred-and-ten.json)
  - URLs: https://www.pagat.com/spoil5/25.html#110 | https://en.wikipedia.org/wiki/Forty-fives
  - Local HTML: âœ“ (pagat-spoil-five-25.html, wiki-forty-fives-2.html, wiki-forty-fives-3.html, wiki-forty-fives.html)

- 423 : [x] **Hungarian DominÃ³ block game | Hungarian Dominoes West European**
  - JSON: [hungarian-domin-block-game.json](../src/processed-games/hungarian-domin-block-game.json)
  - URLs: https://www.pagat.com/domino/line/hungarian_block.html | https://en.wikipedia.org/wiki/Dominoes | https://www.pagat.com/domino/cross/hungarian.html
  - Local HTML: âœ“ (wiki-dominoes.html)

- 424 : [x] **Hungarian DominÃ³ draw game**
  - JSON: [hungarian-domin-draw-game.json](../src/processed-games/hungarian-domin-draw-game.json)
  - URLs: https://www.pagat.com/domino/line/hungarian_draw.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 425 : [x] **Hungarian Tarokk**
  - JSON: [hungarian-tarokk.json](../src/processed-games/hungarian-tarokk.json)
  - URLs: https://www.pagat.com/tarot/hungarian.html | https://en.wikipedia.org/wiki/Tarot | https://en.wikipedia.org/wiki/Hungarian_Tarock
  - Local HTML: âœ“ (wiki-hungarian-tarock.html, wiki-tarot-2.html, wiki-tarot.html)

- 426 : [x] **Hunter**
  - JSON: [hunter.json](../src/processed-games/hunter.json)
  - URLs: https://www.pagat.com/unknown/hunter.html
  - Local HTML: âœ“ (pagat-young-hunter.html)

- 427 : [x] **HuÅjiÃ n ç«ç®­ | SÄn jiÄ xÄ­ ä¸‰å®¶å–œ | ZhÄ“ng ShÃ ngyÃ³u äº‰ä¸Šæ¸¸**
  - JSON: [zheng-shangyou.json](../src/processed-games/zheng-shangyou.json)
  - URLs: https://www.pagat.com/climbing/zhengshangyou.html | https://en.wikipedia.org/wiki/Chinese_poker
  - Local HTML: âœ“ (wiki-chinese-poker.html)

- 428 : [x] **Hurrikan**
  - JSON: [hurrikan.json](../src/processed-games/hurrikan.json)
  - URLs: https://www.pagat.com/reverse/hurrikan.html | https://en.wikipedia.org/wiki/Hearts_(card_game)
  - Local HTML: âœ“ (wiki-hearts-3.html, wiki-hearts.html)

- 429 : [x] **HÃºszashÃ­vÃ¡sos Tarokk**
  - JSON: [huszashivasos-tarokk.json](../src/processed-games/huszashivasos-tarokk.json)
  - URLs: https://www.pagat.com/tarot/huszas.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 430 : [x] **Huutopussi**
  - JSON: [huutopussi.json](../src/processed-games/huutopussi.json)
  - URLs: https://www.pagat.com/reverse/huutopussi.html | https://en.wikipedia.org/wiki/Huutopussi
  - Local HTML: âœ“ (wiki-huutopussi.html)

- 431 : [x] **Hwatu**
  - JSON: [hwatu.json](../src/processed-games/hwatu.json)
  - URLs: https://www.pagat.com/fishing/gostop.html
  - Local HTML: âœ“ (pagat-gostop.html)

- 432 : [x] **Hyakunin Isshu**
  - JSON: [hyakunin-isshu.json](../src/processed-games/hyakunin-isshu.json)
  - URLs: https://en.wikipedia.org/wiki/Ogura_Hyakunin_Isshu
  - Local HTML: âœ“ (wiki-ogura-hyakunin-isshu.html)

### I

- 433 : [x] **Idiots**
  - JSON: [idiots.json](../src/processed-games/idiots.json)
  - URLs: https://en.wikipedia.org/wiki/Shithead_(card_game)
  - Local HTML: âœ“ (wiki-shithead-2.html, wiki-shithead.html)

- 434 : [x] **Illustrated Tarokk Hungarian | Tarokk Illustrated Hungarian**
  - JSON: [illustrated-tarokk-hungarian.json](../src/processed-games/illustrated-tarokk-hungarian.json)
  - URLs: https://www.pagat.com/tarot/illusztr.html | https://en.wikipedia.org/wiki/Tarot | https://www.pagat.com/tarot/illustrated.html
  - Local HTML: âœ“ (pagat-illusztr.html, wiki-tarot-2.html, wiki-tarot.html)

- 435 : [x] **In Between | Acey Deucey | Between the Sheets | Red Dog In Between | Yablon**
  - JSON: [in-between.json](../src/processed-games/in-between.json)
  - URLs: https://www.pagat.com/banking/in-between.html | https://en.wikipedia.org/wiki/Acey_Deucey_(card_game) | https://www.pagat.com/banking/in-between.html#reddog
  - Local HTML: âœ“ (pagat-in-between.html, wiki-acey-deucey.html)

- 436 : [x] **Indian Poker | Blind Man's Buff Poker**
  - JSON: [indian-poker.json](../src/processed-games/indian-poker.json)
  - URLs: https://www.pagat.com/poker/variants/indian.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-indian-poker.html, wiki-poker.html)

- 437 : [x] **Indian Rummy | Rummy Indian**
  - JSON: [indian-rummy.json](../src/processed-games/indian-rummy.json)
  - URLs: https://www.pagat.com/rummy/indian.html | https://en.wikipedia.org/wiki/Rummy | https://www.pagat.com/rummy/indian_rummy.html
  - Local HTML: âœ“ (pagat-indian-rummy.html, wiki-rummy-4.html, wiki-rummy.html)

- 438 : [x] **Indonesian Baccarat**
  - JSON: [indonesian-baccarat.json](../src/processed-games/indonesian-baccarat.json)
  - URLs: https://en.wikipedia.org/wiki/Baccarat
  - Local HTML: âœ“ (wiki-baccarat-alt.html, wiki-baccarat.html)

- 439 : [x] **Indonesian Poker**
  - JSON: [indonesian-poker.json](../src/processed-games/indonesian-poker.json)
  - URLs: https://www.pagat.com/layout/chinese.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 440 : [x] **Ino Shika Cho**
  - JSON: [ino-shika-cho.json](../src/processed-games/ino-shika-cho.json)
  - URLs: https://en.wikipedia.org/wiki/Koi-Koi
  - Local HTML: âœ“ (wiki-koi-koi.html)

- 441 : [x] **Irish Don**
  - JSON: [irish-don.json](../src/processed-games/irish-don.json)
  - URLs: https://www.pagat.com/allfours/don.html
  - Local HTML: âœ“ (pagat-don.html)

- 442 : [x] **Irish Poker**
  - JSON: [irish-poker.json](../src/processed-games/irish-poker.json)
  - URLs: https://www.pagat.com/national/ireland.html | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/irish.html
  - Local HTML: âœ“ (pagat-ireland.html, wiki-poker.html)

- 443 : [x] **Italian Dominoes**
  - JSON: [italian-dominoes.json](../src/processed-games/italian-dominoes.json)
  - URLs: https://www.pagat.com/domino/adding/italian.html | https://en.wikipedia.org/wiki/Dominoes | https://www.pagat.com/domino/cross/italian.html
  - Local HTML: âœ“ (pagat-domino-italian.html, wiki-dominoes.html)

- 444 : [x] **Italian Poker | Poker all'italiana**
  - JSON: [italian-poker.json](../src/processed-games/italian-poker.json)
  - URLs: https://www.pagat.com/poker/variants/italian.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-italian-poker.html, wiki-poker.html)

### J

- 445 : [x] **J M P O**
  - JSON: [j-m-p-o.json](../src/processed-games/j-m-p-o.json)
  - URLs: https://www.pagat.com/race/horse_race.html#chinese
  - Local HTML: âœ“ (pagat-horse-race.html)

- 446 : [x] **Jacks Back (5 Card Draw) Poker**
  - JSON: [five-card-draw-jacks-back.json](../src/processed-games/five-card-draw-jacks-back.json)
  - URLs: https://www.pagat.com/poker/variants/5draw.html#jacksback | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-five-card-draw.html, wiki-poker.html)

- 447 : [x] **Jacks or Better (5 Card Draw) Poker**
  - JSON: [five-card-draw-jacks-or-better.json](../src/processed-games/five-card-draw-jacks-or-better.json)
  - URLs: https://www.pagat.com/poker/variants/5draw.html#jacksob | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-five-card-draw.html, wiki-poker.html)

- 448 : [x] **James Bond**
  - JSON: [james-bond.json](../src/processed-games/james-bond.json)
  - URLs: https://www.pagat.com/banking/james_bond.html | https://en.wikipedia.org/wiki/James_Bond_(card_game)
  - Local HTML: âœ“ (wiki-james-bond-2.html, wiki-james-bond.html)

- 449 : [x] **Jeu de Carte Sipa | Sipa Togo**
  - JSON: [jeu-de-carte-sipa.json](../src/processed-games/jeu-de-carte-sipa.json)
  - URLs: https://www.pagat.com/fishing/sipa.html | https://en.wikipedia.org/wiki/Scopa | https://www.pagat.com/fishing/sipa.html#togo
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 450 : [x] **Jhyap**
  - JSON: [jhyap.json](../src/processed-games/jhyap.json)
  - URLs: https://www.pagat.com/draw/yaniv.html
  - Local HTML: âœ“ (pagat-yaniv.html)

- 451 : [x] **Jhyap Yaniv**
  - JSON: [jhyap-yaniv.json](../src/processed-games/jhyap-yaniv.json)
  - URLs: https://www.pagat.com/draw/yaniv.html
  - Local HTML: âœ“ (pagat-yaniv.html)

- 452 : [x] **Jie Long æŽ¥é¾™ - dominoes**
  - JSON: [jielong.json](../src/processed-games/jielong.json)
  - URLs: https://www.pagat.com/domino/line/jielong.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 453 : [x] **Jjak-mat-chu-gi ì§ë§žì¶”ê¸° | Tjak-Ma-Tchi-Ki**
  - JSON: [jjak-mat-chu-gi.json](../src/processed-games/jjak-mat-chu-gi.json)
  - URLs: https://www.pagat.com/quartet/pelmanism.html#jjak | https://en.wikipedia.org/wiki/Happy_Families
  - Local HTML: âœ“ (wiki-happy-families.html)

- 454 : [x] **Jo-Jotte**
  - JSON: [jo-jotte.json](../src/processed-games/jo-jotte.json)
  - URLs: https://www.pagat.com/marriage/jojotte.html | https://en.wikipedia.org/wiki/Bezique | https://en.wikipedia.org/wiki/Klaberjass
  - Local HTML: âœ“ (wiki-bezique-2.html, wiki-bezique.html, wiki-clobyosh.html, wiki-klaberjass.html)

- 455 : [x] **Joffre**
  - JSON: [joffre.json](../src/processed-games/joffre.json)
  - URLs: https://www.pagat.com/auctionwhist/joffre.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 456 : [x] **Joker**
  - JSON: [joker.json](../src/processed-games/joker.json)
  - URLs: https://www.pagat.com/draw/joker.html
  - Local HTML: âœ“ (pagat-joker-karo.html, pagat-joker.html, pagat-pegs-and-jokers.html)

- 457 : [x] **Joker Karo | Leng**
  - JSON: [joker-karo.json](../src/processed-games/joker-karo.json)
  - URLs: https://www.pagat.com/showdown/joker_karo.html
  - Local HTML: âœ“ (pagat-joker-karo.html, scribd-house-of-cards.html)

- 458 : [x] **JÅ« mÇŽ pÄo è»Šé¦¬åŒ…**
  - JSON: [ju-ma-pao.json](../src/processed-games/ju-ma-pao.json)
  - URLs: https://www.pagat.com/race/horse_race.html#chinese
  - Local HTML: âœ“ (pagat-horse-race.html)

- 459 : [x] **Jukha**
  - JSON: [jukha.json](../src/processed-games/jukha.json)
  - URLs: https://www.pagat.com/jass/jukha.html
  - Local HTML: âœ“ (pagat-jukha.html)

- 460 : [x] **Juse**
  - JSON: [juse.json](../src/processed-games/juse.json)
  - URLs: https://www.pagat.com/jass/juse.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

### K

- 461 : [x] **K'ap Shap | K'Ã­m Shap | Shap Tsai**
  - JSON: [k-ap-shap.json](../src/processed-games/k-ap-shap.json)
  - URLs: https://www.pagat.com/domino/draw/kapshap.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 462 : [x] **Kaiser | Kaiserjass Nidwalden | Kaiserspiel | Rois, Les | Three-Spot | Troika**
  - JSON: [kaiser.json](../src/processed-games/kaiser.json)
  - URLs: https://www.pagat.com/jass/kaiser.html | https://en.wikipedia.org/wiki/Jass | https://www.pagat.com/jass/kaiserjass.html
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 463 : [x] **Kakeya Toranpu | Etori classic | Etori Kakeya Toranpu**
  - JSON: [kakeya-toranpu.json](../src/processed-games/kakeya-toranpu.json)
  - URLs: https://www.pagat.com/picture/etori.html#etori | https://www.pagat.com/picture/etori.html
  - Local HTML: âœ“ (pagat-etori.html)

- 464 : [x] **Kalooki Caribbean**
  - JSON: [kalooki-caribbean.json](../src/processed-games/kalooki-caribbean.json)
  - URLs: https://www.pagat.com/rummy/kalooki.html#caribbean | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 465 : [x] **Kalookie British**
  - JSON: [kalookie-british.json](../src/processed-games/kalookie-british.json)
  - URLs: https://www.pagat.com/rummy/kalooki.html#british | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 466 : [x] **Kalter Schlag**
  - JSON: [kalter-schlag.json](../src/processed-games/kalter-schlag.json)
  - URLs: https://www.pagat.com/ramsch/kalter_schlag.html
  - Local HTML: âœ“ (pagat-schlag.html)

- 467 : [x] **Kaluki European**
  - JSON: [kaluki-european.json](../src/processed-games/kaluki-european.json)
  - URLs: https://www.pagat.com/rummy/kaluki.html
  - Local HTML: âœ“ (pagat-kaluki.html)

- 468 : [x] **Kaluki European / North American**
  - JSON: [kaluki-european-north-american.json](../src/processed-games/kaluki-european-north-american.json)
  - URLs: https://www.pagat.com/rummy/kalooki.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 469 : [x] **Kaluki South Africa**
  - JSON: [kaluki-south-africa.json](../src/processed-games/kaluki-south-africa.json)
  - URLs: https://www.pagat.com/rummy/kalooki.html#southafrica | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 470 : [x] **Kani**
  - JSON: [kani.json](../src/processed-games/kani.json)
  - URLs: https://www.pagat.com/fishing/kani.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 471 : [x] **Kansas City Lowball Poker | Billy Baxter Lowball Poker**
  - JSON: [kansas-city-lowball.json](../src/processed-games/kansas-city-lowball.json)
  - URLs: https://www.pagat.com/poker/variants/lowball.html#kansas | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-lowball.html, wiki-poker.html)

- 472 : [x] **Kap Shap**
  - JSON: [kap-shap.json](../src/processed-games/kap-shap.json)
  - URLs: https://www.pagat.com/tile/domino/kap_shap.html
  - Local HTML: âœ“ (pagat-kaptaishap.html)

- 473 : [x] **Kapaga**
  - JSON: [kapaga.json](../src/processed-games/kapaga.json)
  - URLs: https://www.pagat.com/fishing/kapaga.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 474 : [x] **Karnoffel**
  - JSON: [karnoffel.json](../src/processed-games/karnoffel.json)
  - URLs: https://www.pagat.com/history/karnoffel.html
  - Local HTML: âœ“ (wiki-karnffel.html, wiki-karnoeffel.html)

- 475 : [ ] **KarnÃ¶ffel**
  - JSON: [karn-ffel.json](../src/processed-games/karn-ffel.json)
  - URLs: https://www.pagat.com/karnoeffel/karnoeffel.html | https://en.wikipedia.org/wiki/Karn%C3%B6ffel
  - Local HTML: âœ“ (pagat-karnoeffel.html, wiki-karnffel.html, wiki-karnoeffel.html)

- 476 : [x] **Kasino**
  - JSON: [kasino.json](../src/processed-games/kasino.json)
  - URLs: https://www.pagat.com/fishing/casino.html | https://en.wikipedia.org/wiki/Casino_(card_game)
  - Local HTML: âœ“ (pagat-casino.html, wiki-casino.html)

- 477 : [x] **Kasino Finnish | Casino Finnish**
  - JSON: [kasino-finnish.json](../src/processed-games/kasino-finnish.json)
  - URLs: https://www.pagat.com/fishing/nordic_casino.html#finland | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-nordic-casino.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 478 : [x] **Kasino Swedish | Casino Swedish**
  - JSON: [kasino-swedish.json](../src/processed-games/kasino-swedish.json)
  - URLs: https://www.pagat.com/fishing/nordic_casino.html#sweden | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-nordic-casino.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 479 : [x] **Katti**
  - JSON: [katti.json](../src/processed-games/katti.json)
  - URLs: https://www.pagat.com/fishing/katti.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 480 : [x] **Kemps**
  - JSON: [kemps.json](../src/processed-games/kemps.json)
  - URLs: https://www.pagat.com/quartet/kemps.html | https://en.wikipedia.org/wiki/Happy_Families
  - Local HTML: âœ“ (wiki-happy-families.html)

- 481 : [x] **Kentucky Rook Â®**
  - JSON: [kentucky-rook.json](../src/processed-games/kentucky-rook.json)
  - URLs: https://www.pagat.com/kt5/rook.html#kentucky | https://en.wikipedia.org/wiki/Rook_(card_game)
  - Local HTML: âœ“ (pagat-rook.html, wiki-rook.html)

- 482 : [x] **Kierki**
  - JSON: [kierki.json](../src/processed-games/kierki.json)
  - URLs: https://www.pagat.com/reverse/kierki.html | https://en.wikipedia.org/wiki/Hearts_(card_game)
  - Local HTML: âœ“ (wiki-hearts-3.html, wiki-hearts.html)

- 483 : [x] **King**
  - JSON: [king.json](../src/processed-games/king.json)
  - URLs: https://www.pagat.com/draw/king.html
  - Local HTML: âœ“ (pagat-banking-index.html, pagat-compendium-king.html, pagat-kingen.html, pagat-kings-corners.html, wiki-3-2-5.html, wiki-aces-and-kings.html, wiki-king.html, wiki-legends-of-the-three-kingdoms.html, wiki-ninety-nine-2.html, wiki-pyramid-drinking.html, wiki-rage-2.html, wiki-the-king-of-hearts-has-five-sons.html)

- 484 : [x] **King Pedro | King Pede**
  - JSON: [king-pedro.json](../src/processed-games/king-pedro.json)
  - URLs: https://www.pagat.com/allfours/pedro.html#king | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (pagat-pedro.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 485 : [x] **Kingen**
  - JSON: [kingen.json](../src/processed-games/kingen.json)
  - URLs: https://www.pagat.com/compendium/kingen.html
  - Local HTML: âœ“ (pagat-kingen.html)

- 486 : [x] **Kings Corners**
  - JSON: [kings-corners.json](../src/processed-games/kings-corners.json)
  - URLs: https://www.pagat.com/rummy/kings_corners.html | https://en.wikipedia.org/wiki/Rummy | https://www.pagat.com/patience/kingscorners.html
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 487 : [x] **Kl Ber**
  - JSON: [kl-ber.json](../src/processed-games/kl-ber.json)
  - URLs: https://www.pagat.com/jass/klaber.html
  - Local HTML: âœ“ (pagat-klaber.html)

- 488 : [x] **Klabberjass | KlÃ¡ber | Klob**
  - JSON: [klaberjass.json](../src/processed-games/klaberjass.json)
  - URLs: https://www.pagat.com/jass/clabber.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-clabber.html, wiki-jass-3.html, wiki-jass.html)

- 489 : [x] **Klaber**
  - JSON: [klaber.json](../src/processed-games/klaber.json)
  - URLs: https://www.pagat.com/jass/klaberjass.html#hungary
  - Local HTML: âœ“ (pagat-klaber.html, wiki-clobyosh.html)

- 490 : [x] **Klaverjassen**
  - JSON: [klaverjassen.json](../src/processed-games/klaverjassen.json)
  - URLs: https://www.pagat.com/jass/klaverjas.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 491 : [ ] **Kleurenwiezen | Whist Ã  la Couleur**
  - JSON: [kleurenwiezen.json](../src/processed-games/kleurenwiezen.json)
  - URLs: https://www.pagat.com/quotawhist/kleurenwiezen.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 492 : [x] **Kloepper**
  - JSON: [kloepper.json](../src/processed-games/kloepper.json)
  - URLs: https://www.pagat.com/jass/kloepper.html | https://en.wikipedia.org/wiki/Jass | https://www.pagat.com/stops/slap.html
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 493 : [x] **Kluft**
  - JSON: [kluft.json](../src/processed-games/kluft.json)
  - URLs: https://www.pagat.com/jass/kluft.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 494 : [x] **Knaves**
  - JSON: [knaves.json](../src/processed-games/knaves.json)
  - URLs: https://www.pagat.com/stops/knaves.html | https://en.wikipedia.org/wiki/Michigan_(card_game)
  - Local HTML: âœ“ (wiki-michigan.html)

- 495 : [x] **Knock Poker | Rap Poker**
  - JSON: [knock-poker.json](../src/processed-games/knock-poker.json)
  - URLs: https://www.pagat.com/poker/variants/knock.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 496 : [x] **Knock Rummy | Poker Rum**
  - JSON: [knockrummy.json](../src/processed-games/knockrummy.json)
  - URLs: https://www.pagat.com/rummy/knock_rummy.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 497 : [x] **Knock-Out Whist | Rat | Scrounge | Trumps**
  - JSON: [knock-out-whist.json](../src/processed-games/knock-out-whist.json)
  - URLs: https://www.pagat.com/whist/knockout.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 498 : [x] **Knorri | HÃ¶rri**
  - JSON: [knorri.json](../src/processed-games/knorri.json)
  - URLs: https://www.pagat.com/karnoeffel/knorri.html | https://en.wikipedia.org/wiki/Karn%C3%B6ffel
  - Local HTML: âœ“ (wiki-karnffel.html, wiki-karnoeffel.html)

- 499 : [x] **Knuffeln**
  - JSON: [knuffeln.json](../src/processed-games/knuffeln.json)
  - URLs: https://www.pagat.com/history/karnoffel.html#knuffeln
  - Local HTML: âœ“ (pagat-knueffeln.html)

- 500 : [x] **KnÃ¼ffeln**
  - JSON: [kn-ffeln.json](../src/processed-games/kn-ffeln.json)
  - URLs: https://www.pagat.com/schafkopf/knueffeln.html | https://en.wikipedia.org/wiki/Schafkopf
  - Local HTML: âœ“ (wiki-schafkopf-3.html, wiki-schafkopf.html)

- 501 : [ ] **Koi Koi**
  - JSON: [koi-koi.json](../src/processed-games/koi-koi.json)
  - URLs: https://www.nintendo.co.jp/n09/hanafuda_en/index.html
  - Local HTML: âœ“ (wiki-koi-koi.html)

- 502 : [ ] **Koira | Dog**
  - JSON: [koira.json](../src/processed-games/koira.json)
  - URLs: https://www.pagat.com/beating/skitgubbe.html#koira | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-skitgubbe.html, wiki-durak-3.html, wiki-durak.html)

- 503 : [ ] **KÃ¶nigrufen Graden**
  - JSON: [k-nigrufen-graden.json](../src/processed-games/k-nigrufen-graden.json)
  - URLs: https://www.pagat.com/tarot/koenigrufen.html#graden | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 504 : [ ] **KÃ¶nigrufen Lungau Tarock**
  - JSON: [k-nigrufen-lungau-tarock.json](../src/processed-games/k-nigrufen-lungau-tarock.json)
  - URLs: https://www.pagat.com/tarot/koenigrufen.html#lungau | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 505 : [ ] **KÃ¶nigrufen RuÃŸbach**
  - JSON: [k-nigrufen-ru-bach.json](../src/processed-games/k-nigrufen-ru-bach.json)
  - URLs: https://www.pagat.com/tarot/koenigrufen.html#russbach | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 506 : [ ] **KÃ¶nigrufen Tarock**
  - JSON: [k-nigrufen-tarock.json](../src/processed-games/k-nigrufen-tarock.json)
  - URLs: https://www.pagat.com/tarot/koenigrufen.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 507 : [ ] **Konijnen**
  - JSON: [konijnen.json](../src/processed-games/konijnen.json)
  - URLs: https://norskespilleautomater.io/kortspill/kanin
  - Local HTML: âœ“ (norskespilleautomater-konijnen.html)

- 508 : [ ] **Kontra**
  - JSON: [kontra.json](../src/processed-games/kontra.json)
  - URLs: https://www.pagat.com/ranking/kontra.html
  - Local HTML: âœ“ (pagat-ristikontra.html, wiki-ristikontra.html)

- 509 : [ ] **Kontra Finnish**
  - JSON: [kontra-finniish.json](../src/processed-games/kontra-finniish.json)
  - URLs: https://www.pagat.com/sedma/ristikontra.html | https://en.wikipedia.org/wiki/Jass | https://www.pagat.com/jass/kontra.html
  - Local HTML: âœ“ (pagat-ristikontra.html, wiki-jass-3.html, wiki-jass.html)

- 510 : [ ] **Kontsina ÎšÎ¿Î½Ï„ÏƒÎ¯Î½Î±**
  - JSON: [kontsina.json](../src/processed-games/kontsina.json)
  - URLs: https://www.pagat.com/fishing/kontsina.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-kontsina.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 511 : [ ] **Kop**
  - JSON: [kop.json](../src/processed-games/kop.json)
  - URLs: https://www.pagat.com/schafkopf/kop.html | https://en.wikipedia.org/wiki/Schafkopf
  - Local HTML: âœ“ (pagat-kop.html, wiki-schafkopf-3.html, wiki-schafkopf.html)

- 512 : [ ] **Koutbo6**
  - JSON: [koutbo6.json](../src/processed-games/koutbo6.json)
  - URLs: https://catsatcards.com/Games/Kout_Bo.html
  - Local HTML: âœ“ (catsatcards-kout-bo.html)

- 513 : [ ] **Kozel**
  - JSON: [kozel.json](../src/processed-games/kozel.json)
  - URLs: https://www.pagat.com/beating/kozel.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 514 : [ ] **Kraken**
  - JSON: [kraken.json](../src/processed-games/kraken.json)
  - URLs: https://www.pagat.com/domino/line/kraken.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 515 : [ ] **Kritisch-Watten**
  - JSON: [kritisch-watten.json](../src/processed-games/kritisch-watten.json)
  - URLs: https://www.pagat.com/trumps/watten.html#kritisch
  - Local HTML: âœ“ (pagat-watten.html)

- 516 : [ ] **Kruisjassen**
  - JSON: [kruisjassen.json](../src/processed-games/kruisjassen.json)
  - URLs: https://www.pagat.com/jass/kruisjassen.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-kruisjassen.html, wiki-jass-3.html, wiki-jass.html)

- 517 : [ ] **Krypkasino**
  - JSON: [krypkasino.json](../src/processed-games/krypkasino.json)
  - URLs: https://www.pagat.com/fishing/nordic_casino.html#kryp | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-nordic-casino.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 518 : [ ] **Krypkille**
  - JSON: [krypkille.json](../src/processed-games/krypkille.json)
  - URLs: https://www.pagat.com/fishing/nordic_casino.html#krypkille | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-nordic-casino.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 519 : [ ] **Kryt'-navalivat'**
  - JSON: [kryt-navalivat.json](../src/processed-games/kryt-navalivat.json)
  - URLs: https://www.pagat.com/beating/kryt_navalivat.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 520 : [ ] **Kujong**
  - JSON: [kujong.json](../src/processed-games/kujong.json)
  - URLs: https://www.pagat.com/fishing/kujong.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 521 : [ ] **Kung och Adel**
  - JSON: [kung-och-adel.json](../src/processed-games/kung-och-adel.json)
  - URLs: https://www.pagat.com/climbing/king_and_serf.html | https://www.pagat.com/quotawhist/kung-och-adel.html
  - Local HTML: âœ“ (pagat-kung-och-adel.html)

- 522 : [ ] **Kvitlech | Quitlok**
  - JSON: [kvitlech.json](../src/processed-games/kvitlech.json)
  - URLs: https://www.pagat.com/showdown/kvitlech.html | https://en.wikipedia.org/wiki/Kvitlech
  - Local HTML: âœ“ (pagat-quitlok.html)

- 523 : [ ] **Kwajongen**
  - JSON: [kwajongen.json](../src/processed-games/kwajongen.json)
  - URLs: https://www.pagat.com/last/kwajongen.html | https://en.wikipedia.org/wiki/Last_Card | https://en.wikipedia.org/wiki/Last_card
  - Local HTML: âœ“ (wiki-last-card.html)

### L

- 524 : [ ] **L'Hombre**
  - JSON: [l-hombre.json](../src/processed-games/l-hombre.json)
  - URLs: https://www.pagat.com/lhombre/lhombre.html | https://en.wikipedia.org/wiki/Ombre
  - Local HTML: âœ“ (pagat-lhombre.html, wiki-ombre-2.html, wiki-ombre.html)

- 525 : [ ] **La Belle Lucie**
  - JSON: [la-belle-lucie.json](../src/processed-games/la-belle-lucie.json)
  - URLs: https://en.wikipedia.org/wiki/La_Belle_Lucie
  - Local HTML: âœ“ (wiki-la-belle-lucie.html)

- 526 : [ ] **Lady Jane**
  - JSON: [lady-jane.json](../src/processed-games/lady-jane.json)
  - URLs: https://onpixelgames.com/en/misc/solitaire-rules/lady-jane/
  - Local HTML: âœ“ (onpixelgames-lady-jane.html)

- 527 : [ ] **Lame Brain Pete Poker**
  - JSON: [indian-poker-lame-brain-pete.json](../src/processed-games/indian-poker-lame-brain-pete.json)
  - URLs: https://www.pagat.com/poker/variants/indian.html#lamebrain | https://en.wikipedia.org/wiki/Poker | https://gamerules.com/rules/lame-brain-pete/
  - Local HTML: âœ“ (pagat-indian-poker.html, wiki-poker.html)

- 528 : [ ] **Lansquenet**
  - JSON: [lansquenet.json](../src/processed-games/lansquenet.json)
  - URLs: https://www.pagat.com/banking/lansquenet.html
  - Local HTML: âœ“ (pagat-lansquenet.html)

- 529 : [ ] **Last One**
  - JSON: [last-one.json](../src/processed-games/last-one.json)
  - URLs: https://www.pagat.com/last/last_one.html | https://en.wikipedia.org/wiki/Last_Card
  - Local HTML: âœ“ (pagat-last-one.html)

- 530 : [ ] **Laugavatnsmanni**
  - JSON: [laugavatnsmanni.json](../src/processed-games/laugavatnsmanni.json)
  - URLs: https://www.pagat.com/beating/laugavatnsmanni.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 531 : [ ] **Laugh and Lie Down**
  - JSON: [laugh-and-lie-down.json](../src/processed-games/laugh-and-lie-down.json)
  - URLs: https://www.pagat.com/stops/laugh_lie_down.html | https://en.wikipedia.org/wiki/Michigan_(card_game)
  - Local HTML: âœ“ (wiki-michigan.html)

- 532 : [ ] **Laus**
  - JSON: [laus.json](../src/processed-games/laus.json)
  - URLs: https://www.pagat.com/beating/laus.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 533 : [ ] **Let It Ride**
  - JSON: [let-it-ride.json](../src/processed-games/let-it-ride.json)
  - URLs: https://www.pagat.com/banking/let_it_ride.html
  - Local HTML: âœ“ (pagat-let-it-ride.html, wiki-let-it-ride-2.html, wiki-let-it-ride.html)

- 534 : [ ] **Leyden**
  - JSON: [leyden.json](../src/processed-games/leyden.json)
  - URLs: https://www.pagat.com/whist/leyden.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 535 : [ ] **Literature | Fish**
  - JSON: [literature.json](../src/processed-games/literature.json)
  - URLs: https://www.pagat.com/quartet/literature.html | https://en.wikipedia.org/wiki/Happy_Families
  - Local HTML: âœ“ (pagat-literature.html, wiki-happy-families.html)

- 536 : [ ] **Loba Argentina | Loba de Mas | Loba de Menos**
  - JSON: [loba.json](../src/processed-games/loba.json)
  - URLs: https://www.pagat.com/rummy/loba.html#argentina | https://en.wikipedia.org/wiki/Rummy | https://www.pagat.com/rummy/loba.html#mas | https://www.pagat.com/rummy/loba.html#menos
  - Local HTML: âœ“ (pagat-loba.html, wiki-rummy-4.html, wiki-rummy.html)

- 537 : [ ] **Logic**
  - JSON: [logic.json](../src/processed-games/logic.json)
  - URLs: https://www.pagat.com/eights/logic.html
  - Local HTML: âœ“ (pagat-logic.html, wiki-luck-logic.html)

- 538 : [ ] **London Lowball (7-card Stud) Poker**
  - JSON: [london-lowball.json](../src/processed-games/london-lowball.json)
  - URLs: https://www.pagat.com/poker/variants/7stud.html#london | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-seven-card-stud.html, wiki-poker.html)

- 539 : [ ] **Longana**
  - JSON: [longana.json](../src/processed-games/longana.json)
  - URLs: https://www.pagat.com/domino/line/longana.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 540 : [ ] **Looking for Friends | ZhÄƒo PÃ©ngyou æ‰¾æœ‹å‹**
  - JSON: [zhao-pengyou.json](../src/processed-games/zhao-pengyou.json)
  - URLs: https://www.pagat.com/climbing/zhaopengyou.html | https://en.wikipedia.org/wiki/Dou_Dizhu
  - Local HTML: âœ“ (pagat-pengyou.html)

- 541 : [ ] **Lora Serbian, Croatian**
  - JSON: [lora.json](../src/processed-games/lora.json)
  - URLs: https://www.pagat.com/jass/lora.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 542 : [ ] **LÃ³rum Hungarian**
  - JSON: [lorum-hungarian.json](../src/processed-games/lorum-hungarian.json)
  - URLs: https://www.pagat.com/whist/lorum.html#hungarian | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 543 : [ ] **LÃ³rum Slovak**
  - JSON: [lorum-slovak.json](../src/processed-games/lorum-slovak.json)
  - URLs: https://www.pagat.com/whist/lorum.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 544 : [ ] **Losing Loadum**
  - JSON: [losing-loadum.json](../src/processed-games/losing-loadum.json)
  - URLs: https://www.pagat.com/adders/loadum.html#losing | https://en.wikipedia.org/wiki/Cribbage
  - Local HTML: âœ“ (wiki-cribbage-3.html, wiki-cribbage.html)

- 545 : [ ] **Lost Heir**
  - JSON: [lost-heir.json](../src/processed-games/lost-heir.json)
  - URLs: https://www.pagat.com/patience/lost_heir.html | https://en.wikipedia.org/wiki/Patience_(game)
  - Local HTML: âœ“ (wiki-patience.html)

- 546 : [ ] **Low Hole Poker | Late Show Poker**
  - JSON: [low-hole.json](../src/processed-games/low-hole.json)
  - URLs: https://www.pagat.com/poker/variants/7stud.html#lowhole | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-seven-card-stud.html, wiki-poker.html)

- 547 : [ ] **Lowball (5 Card Stud) Poker**
  - JSON: [five-card-stud-lowball.json](../src/processed-games/five-card-stud-lowball.json)
  - URLs: https://www.pagat.com/poker/variants/5stud.html#lowball | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/lowball.html
  - Local HTML: âœ“ (pagat-five-card-stud.html, pagat-lowball.html, wiki-poker.html)

- 548 : [ ] **Luk Fu å…­è™Ž**
  - JSON: [luk-fu.json](../src/processed-games/luk-fu.json)
  - URLs: https://www.pagat.com/domino/partition/lukfu.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 549 : [ ] **Lupfen**
  - JSON: [lupfen.json](../src/processed-games/lupfen.json)
  - URLs: https://www.pagat.com/jass/lupfen.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

### M

- 550 : [x] **Machiavelli**
  - JSON: [machiavelli.json](../src/processed-games/machiavelli.json)
  - URLs: https://www.pagat.com/rummy/machiavelli.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 551 : [x] **Madrasso | Magrasso | Mandrasso**
  - JSON: [madrasso.json](../src/processed-games/madrasso.json)
  - URLs: https://www.pagat.com/fishing/madrasso.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 552 : [x] **Magarac**
  - JSON: [magarac.json](../src/processed-games/magarac.json)
  - URLs: https://www.pagat.com/jass/magarac.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 553 : [x] **Mah Jong éº»å°†**
  - JSON: [mah-jong.json](../src/processed-games/mah-jong.json)
  - URLs: https://www.pagat.com/tile/mahjong/ | https://en.wikipedia.org/wiki/Mahjong
  - Local HTML: âœ“ (wiki-mahjong.html)

- 554 : [x] **Mahjong Riichi**
  - JSON: [mahjong-riichi.json](../src/processed-games/mahjong-riichi.json)
  - URLs: https://riichi.wiki/
  - Local HTML: âœ“ (riichi-wiki.html)

- 555 : [x] **Main Merah**
  - JSON: [main-merah.json](../src/processed-games/main-merah.json)
  - URLs: https://www.pagat.com/fishing/main_merah.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 556 : [x] **Mak Var**
  - JSON: [mak-var.json](../src/processed-games/mak-var.json)
  - URLs: https://en.wikipedia.org/wiki/Macau_(card_game)
  - Local HTML: âœ“ (wiki-macau.html)

- 557 : [x] **Malilla | Manilla**
  - JSON: [malilla.json](../src/processed-games/malilla.json)
  - URLs: https://www.pagat.com/manille/malilla.html | https://en.wikipedia.org/wiki/Manille
  - Local HTML: âœ“ (pagat-malilla.html, wiki-manille-2.html, wiki-manille.html)

- 558 : [x] **Maltese Cross**
  - JSON: [maltese-cross.json](../src/processed-games/maltese-cross.json)
  - URLs: https://www.pagat.com/patience/maltese_cross.html | https://en.wikipedia.org/wiki/Patience_(game)
  - Local HTML: âœ“ (wiki-patience.html)

- 559 : [x] **Mambassa**
  - JSON: [mambassa.json](../src/processed-games/mambassa.json)
  - URLs: https://www.pagat.com/fishing/mambassa.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 560 : [x] **Maniglia**
  - JSON: [maniglia.json](../src/processed-games/maniglia.json)
  - URLs: https://www.pagat.com/fishing/maniglia.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 561 : [x] **Manillen**
  - JSON: [manillen.json](../src/processed-games/manillen.json)
  - URLs: https://www.pagat.com/manille/manillen.html | https://en.wikipedia.org/wiki/Manille
  - Local HTML: âœ“ (pagat-manillen.html, wiki-manille-2.html, wiki-manille.html)

- 562 : [x] **Manni**
  - JSON: [manni.json](../src/processed-games/manni.json)
  - URLs: https://www.pagat.com/jass/manni.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 563 : [x] **Mao**
  - JSON: [mao.json](../src/processed-games/mao.json)
  - URLs: https://www.pagat.com/eights/mao.html
  - Local HTML: âœ“ (pagat-mao.html)

- 564 : [x] **Mariaccio**
  - JSON: [mariaccio.json](../src/processed-games/mariaccio.json)
  - URLs: https://www.pagat.com/fishing/mariaccio.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 565 : [x] **Mariagenspiel**
  - JSON: [mariagenspiel.json](../src/processed-games/mariagenspiel.json)
  - URLs: https://en.wikipedia.org/wiki/Mariage_(card_game)
  - Local HTML: âœ“ (wiki-mariage.html)

- 566 : [x] **Marianna**
  - JSON: [marianna.json](../src/processed-games/marianna.json)
  - URLs: https://www.pagat.com/marriage/marianna.html | https://en.wikipedia.org/wiki/Bezique
  - Local HTML: âœ“ (pagat-marianna.html, wiki-bezique-2.html, wiki-bezique.html)

- 567 : [x] **MariÃ¡Å¡**
  - JSON: [marias.json](../src/processed-games/marias.json)
  - URLs: https://www.pagat.com/whist/marias.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 568 : [x] **Mariglia**
  - JSON: [mariglia.json](../src/processed-games/mariglia.json)
  - URLs: https://www.pagat.com/fishing/mariglia.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 569 : [x] **Marjapussi**
  - JSON: [marjapussi.json](../src/processed-games/marjapussi.json)
  - URLs: https://www.pagat.com/reverse/marjapussi.html | https://en.wikipedia.org/wiki/Hearts_(card_game)
  - Local HTML: âœ“ (wiki-hearts-3.html, wiki-hearts.html)

- 570 : [x] **Marjolet**
  - JSON: [marjolet.json](../src/processed-games/marjolet.json)
  - URLs: https://www.pagat.com/marriage/marjolet.html | https://en.wikipedia.org/wiki/Bezique
  - Local HTML: âœ“ (pagat-marjolet.html, wiki-bezique-2.html, wiki-bezique.html)

- 571 : [x] **Marquise**
  - JSON: [marquise.json](../src/processed-games/marquise.json)
  - URLs: https://en.wikipedia.org/wiki/Pyramid_(card_game)
  - Local HTML: âœ“ (wiki-pyramid-card.html)

- 572 : [x] **Marriage Nepali**
  - JSON: [marriage-nepali.json](../src/processed-games/marriage-nepali.json)
  - URLs: https://www.pagat.com/rummy/marriage.html
  - Local HTML: âœ“ (pagat-rummy-marriage.html)

- 573 : [x] **Marriage Rummy**
  - JSON: [marriage-rummy.json](../src/processed-games/marriage-rummy.json)
  - URLs: https://www.pagat.com/rummy/marriage_rummy.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 574 : [x] **Matador**
  - JSON: [matador.json](../src/processed-games/matador.json)
  - URLs: https://www.pagat.com/exact/matador.html | https://en.wikipedia.org/wiki/Oh_hell
  - Local HTML: âœ“ (wiki-oh-hell-3.html, wiki-oh-hell.html)

- 575 : [x] **Matador Condition**
  - JSON: [matador-condition.json](../src/processed-games/matador-condition.json)
  - URLs: https://ispa-world.org/
  - Local HTML: âœ“ (ispa-matador.html)

- 576 : [x] **Match Pot Poker**
  - JSON: [match-pot.json](../src/processed-games/match-pot.json)
  - URLs: https://www.pagat.com/poker/variants/match_pot.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 577 : [x] **Mate**
  - JSON: [mate.json](../src/processed-games/mate.json)
  - URLs: https://www.pagat.com/fishing/mate.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 578 : [x] **Matgo Hwatu**
  - JSON: [matgo-hwatu.json](../src/processed-games/matgo-hwatu.json)
  - URLs: https://namu.wiki/w/%EA%B3%A0%EC%8A%A4%ED%86%B1
  - Local HTML: âœ“ (namu-matgo.html)

- 579 : [x] **Mattazza**
  - JSON: [mattazza.json](../src/processed-games/mattazza.json)
  - URLs: https://www.pagat.com/fishing/mattazza.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 580 : [x] **Mattis**
  - JSON: [mattis.json](../src/processed-games/mattis.json)
  - URLs: https://www.pagat.com/jass/mattis.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 581 : [x] **Mauscheln**
  - JSON: [mauscheln.json](../src/processed-games/mauscheln.json)
  - URLs: https://de.wikipedia.org/wiki/Mauscheln
  - Local HTML: âœ“ (wiki-mauscheln.html)

- 582 : [ ] **Maw**
  - JSON: [maw.json](../src/processed-games/maw.json)
  - URLs: https://www.pagat.com/beating/maw.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 583 : [ ] **Mediatore**
  - JSON: [mediatore.json](../src/processed-games/mediatore.json)
  - URLs: https://www.pagat.com/fishing/mediatore.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 584 : [ ] **Meksiko**
  - JSON: [meksiko.json](../src/processed-games/meksiko.json)
  - URLs: https://www.pagat.com/beating/meksiko.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 585 : [ ] **Mendikot**
  - JSON: [mendikot.json](../src/processed-games/mendikot.json)
  - URLs: https://www.pagat.com/jass/mendikot.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 586 : [ ] **MÃ«nsch**
  - JSON: [m-nsch.json](../src/processed-games/m-nsch.json)
  - URLs: https://www.pagat.com/jass/mensch.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 587 : [ ] **Mensch Lux**
  - JSON: [mensch-lux.json](../src/processed-games/mensch-lux.json)
  - URLs: https://www.pagat.com/lhombre/mensch.html
  - Local HTML: âœ“ (pagat-mensch.html)

- 588 : [ ] **Mexican Stud Poker | Mexican Sweat Poker**
  - JSON: [mexican-stud.json](../src/processed-games/mexican-stud.json)
  - URLs: https://www.pagat.com/poker/variants/7stud.html#mexican | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/7stud.html#sweat
  - Local HTML: âœ“ (pagat-seven-card-stud.html, wiki-poker.html)

- 589 : [ ] **Mexican Train**
  - JSON: [mexican-train.json](../src/processed-games/mexican-train.json)
  - URLs: https://www.pagat.com/domino/tree/mexican_train.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 590 : [ ] **Mighty**
  - JSON: [mighty.json](../src/processed-games/mighty.json)
  - URLs: https://www.pagat.com/draw/mighty.html
  - Local HTML: âœ“ (pagat-mighty.html)

- 591 : [ ] **Mille**
  - JSON: [mille-bornes.json](../src/processed-games/mille-bornes.json)
  - URLs: https://www.pagat.com/marriage/mille.html | https://en.wikipedia.org/wiki/Bezique
  - Local HTML: âœ“ (wiki-bezique-2.html, wiki-bezique.html)

- 592 : [ ] **Millone Tarocchi Bolognesi | Ottocento | Quattro Scartate Tarocchi Bolognesi | Tarocchi Bolognesi Ottocento | Tarocchino**
  - JSON: [tarocchi-bolognesi.json](../src/processed-games/tarocchi-bolognesi.json)
  - URLs: https://www.pagat.com/tarot/tarocchi_bolognesi.html#millone | https://en.wikipedia.org/wiki/Tarot | https://www.pagat.com/tarot/tarocchi_bolognesi.html | https://www.pagat.com/tarot/tarocchi_bolognesi.html#quattro
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 593 : [ ] **Milo**
  - JSON: [milo.json](../src/processed-games/milo.json)
  - URLs: https://www.pagat.com/fishing/milo.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 594 : [ ] **Minchiate | Gallerini | Germini**
  - JSON: [minchiate.json](../src/processed-games/minchiate.json)
  - URLs: https://www.pagat.com/tarot/minchiate.html | https://en.wikipedia.org/wiki/Minchiate
  - Local HTML: âœ“ (pagat-minchiate.html, wiki-minchiate-2.html, wiki-minchiate.html)

- 595 : [ ] **Minette**
  - JSON: [minette.json](../src/processed-games/minette.json)
  - URLs: https://en.wikipedia.org/wiki/Mariage_(card_game)
  - Local HTML: âœ“ (wiki-mariage.html)

- 596 : [ ] **Minibridge**
  - JSON: [minibridge.json](../src/processed-games/minibridge.json)
  - URLs: https://www.pagat.com/auctionwhist/minibridge.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 597 : [ ] **Minimisere**
  - JSON: [minimisere.json](../src/processed-games/minimisere.json)
  - URLs: https://www.parlettgames.uk/oricards/minimis.html
  - Local HTML: âœ“ (parlett-minimis.html)

- 598 : [ ] **Minobasco Shokoba**
  - JSON: [minobasco-shokoba.json](../src/processed-games/minobasco-shokoba.json)
  - URLs: https://www.pagat.com/fishing/scopa.html
  - Local HTML: âœ“ (pagat-scopa.html)

- 599 : [ ] **Mississippi Mud Poker**
  - JSON: [mississippi-mud.json](../src/processed-games/mississippi-mud.json)
  - URLs: https://www.pagat.com/poker/variants/7stud.html#mississippi | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-seven-card-stud.html, wiki-poker.html)

- 600 : [ ] **Mitaines | Mitts**
  - JSON: [mitaines.json](../src/processed-games/mitaines.json)
  - URLs: https://www.pagat.com/jass/mitaines.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 601 : [ ] **Mitigatti Nice: 1930 | Tarocche: Mitigatti Nice 1930**
  - JSON: [mitigatti.json](../src/processed-games/mitigatti.json)
  - URLs: https://www.pagat.com/fishing/mitigatti.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 602 : [ ] **Mittlere Jass**
  - JSON: [mittlere-jass.json](../src/processed-games/mittlere-jass.json)
  - URLs: https://www.pagat.com/jass/mittlere.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-mittlere.html, wiki-jass-3.html, wiki-jass.html)

- 603 : [ ] **Mizerka**
  - JSON: [mizerka.json](../src/processed-games/mizerka.json)
  - URLs: https://www.pagat.com/beating/mizerka.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 604 : [ ] **Mizerka Polish**
  - JSON: [mizerka-polish.json](../src/processed-games/mizerka-polish.json)
  - URLs: https://www.pagat.com/quotawhist/mizerka.html
  - Local HTML: âœ“ (pagat-mizerka.html)

- 605 : [ ] **Molotow Jass**
  - JSON: [molotow-jass.json](../src/processed-games/molotow-jass.json)
  - URLs: https://www.pagat.com/jass/molotow.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 606 : [ ] **Money**
  - JSON: [money.json](../src/processed-games/money.json)
  - URLs: https://www.pagat.com/war/money.html | https://en.wikipedia.org/wiki/War_(card_game)
  - Local HTML: âœ“ (pagat-war-money.html, wiki-war-3.html, wiki-war.html)

- 607 : [ ] **Mort La Morte**
  - JSON: [mort-la-morte.json](../src/processed-games/mort-la-morte.json)
  - URLs: https://www.pagat.com/invented/la_morte.html
  - Local HTML: âœ“ (pagat-la-morte.html)

- 608 : [ ] **Mpourloto | Bourloto**
  - JSON: [mpourloto.json](../src/processed-games/mpourloto.json)
  - URLs: https://www.pagat.com/jass/mpourloto.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-mpourloto.html, wiki-jass-3.html, wiki-jass.html)

- 609 : [ ] **Mulle**
  - JSON: [mulle.json](../src/processed-games/mulle.json)
  - URLs: https://www.pagat.com/beating/mulle.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 610 : [ ] **Mura**
  - JSON: [mura.json](../src/processed-games/mura.json)
  - URLs: https://www.pagat.com/fishing/mura.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 611 : [ ] **Mus**
  - JSON: [mus.json](../src/processed-games/mus.json)
  - URLs: https://www.pagat.com/vying/mus.html
  - Local HTML: âœ“ (pagat-mus.html)

- 612 : [ ] **Mustamaija**
  - JSON: [mustamaija.json](../src/processed-games/mustamaija.json)
  - URLs: https://www.pagat.com/beating/mustamaija.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-mustamaija.html, wiki-durak-3.html, wiki-durak.html)

- 613 : [ ] **Myllymatti**
  - JSON: [myllymatti.json](../src/processed-games/myllymatti.json)
  - URLs: https://www.pagat.com/beating/myllymatti.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

### N

- 614 : [x] **Nap | Napoleon British**
  - JSON: [nap.json](../src/processed-games/nap.json)
  - URLs: https://www.pagat.com/nap/nap.html | https://en.wikipedia.org/wiki/Nap_(card_game)
  - Local HTML: âœ“ (wiki-nap.html)

- 615 : [x] **Nap Napoleon**
  - JSON: [nap-napoleon.json](../src/processed-games/nap-napoleon.json)
  - URLs: https://www.pagat.com/vying/nap.html
  - Local HTML: âœ“ (pagat-napoleon.html, wiki-forty-thieves.html, wiki-nap.html, wiki-napoleon-at-st-helena.html, wiki-napoleon.html)

- 616 : [x] **Napalm | Whipsaw**
  - JSON: [napalm.json](../src/processed-games/napalm.json)
  - URLs: https://www.pagat.com/rummy/napalm.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 617 : [x] **Napoleon Japanese**
  - JSON: [dai-fugo.json](../src/processed-games/dai-fugo.json)
  - URLs: https://www.pagat.com/climbing/daifugo.html#napoleon
  - Local HTML: âœ“ (pagat-daifugo.html)

- 618 : [x] **Navajo Tens | NeeznÃ¡Ã¡ Dah YÃ­jihÃ­**
  - JSON: [navajo-tens.json](../src/processed-games/navajo-tens.json)
  - URLs: https://www.pagat.com/fishing/navajo_tens.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 619 : [x] **Neezn Dah Y Jih**
  - JSON: [neezn-dah-y-jih.json](../src/processed-games/neezn-dah-y-jih.json)
  - URLs: https://www.pagat.com/rummy/conquian.html#navajo
  - Local HTML: âœ“ (pagat-conquian.html)

- 620 : [x] **Neighbor Games | Screw Your Neighbor**
  - JSON: [neighbor-games.json](../src/processed-games/neighbor-games.json)
  - URLs: https://www.pagat.com/compendium/neighbor.html
  - Local HTML: âœ“ (pagat-neighbor.html)

- 621 : [x] **Neuf | 9 | ChÃ´meur | Nines**
  - JSON: [neuf.json](../src/processed-games/neuf.json)
  - URLs: https://www.pagat.com/quotawhist/neuf.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-neuf.html, pagat-whist-neuf.html, wiki-whist-4.html, wiki-whist.html)

- 622 : [x] **Nickels Rummy**
  - JSON: [nickels-rummy.json](../src/processed-games/nickels-rummy.json)
  - URLs: https://www.funboardgames.org/nickels-rules/ | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 623 : [x] **Niju Kyu 29**
  - JSON: [niju-kyu-29.json](../src/processed-games/niju-kyu-29.json)
  - URLs: https://en.wikipedia.org/wiki/Ninety-nine_(addition_card_game)
  - Local HTML: âœ“ (wiki-ninety-nine-add.html, wiki-ninety-nine.html)

- 624 : [x] **Nine Card Don | Long Don | Welsh Don**
  - JSON: [nine-card-don.json](../src/processed-games/nine-card-don.json)
  - URLs: https://www.pagat.com/allfours/don.html#nine | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (pagat-don.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 625 : [x] **Nine Five Two**
  - JSON: [nine-five-two.json](../src/processed-games/nine-five-two.json)
  - URLs: https://www.pagat.com/allfours/952.html | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (wiki-all-fours-2.html, wiki-all-fours.html)

- 626 : [x] **Niu Niu Ox**
  - JSON: [niu-niu-ox.json](../src/processed-games/niu-niu-ox.json)
  - URLs: https://wizardofodds.com/games/niu-niu/
  - Local HTML: âœ“ (wiki-girl-genius-the-works.html)

- 627 : [x] **NLK**
  - JSON: [nlk.json](../src/processed-games/nlk.json)
  - URLs: https://www.pagat.com/jass/nlk.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 628 : [x] **Nlk Czech**
  - JSON: [nlk-czech.json](../src/processed-games/nlk-czech.json)
  - URLs: https://www.pagat.com/beating/nlk.html
  - Local HTML: âœ“ (pagat-nlk-beating.html)

- 629 : [x] **No Peek Poker**
  - JSON: [indian-poker-no-peek.json](../src/processed-games/indian-poker-no-peek.json)
  - URLs: https://www.pagat.com/poker/variants/indian.html#nopeek | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-indian-poker.html, wiki-poker.html)

- 630 : [x] **Nobble | Bonk | Jig | Motor | Pop | Snip Snap Snorum | Tuppenny Ha'penny Bump**
  - JSON: [nobble.json](../src/processed-games/nobble.json)
  - URLs: https://www.pagat.com/stops/snipsnapsnorum.html#nobble | https://en.wikipedia.org/wiki/Michigan_(card_game) | https://www.pagat.com/stops/snipsnapsnorum.html | https://en.wikipedia.org/wiki/Snap_(card_game)
  - Local HTML: âœ“ (pagat-snipsnapsnorum.html, wiki-michigan.html, wiki-snap-3.html, wiki-snap.html)

- 631 : [x] **Noddy | Nod**
  - JSON: [noddy.json](../src/processed-games/noddy.json)
  - URLs: https://www.pagat.com/pointtrk/noddy.html#nod | https://en.wikipedia.org/wiki/Whist | https://www.pagat.com/pointtrk/noddy.html | https://en.wikipedia.org/wiki/Noddy_(card_game)
  - Local HTML: âœ“ (wiki-noddy-2.html, wiki-noddy.html, wiki-whist-4.html, wiki-whist.html)

- 632 : [x] **Nomination Whist**
  - JSON: [nomination-whist.json](../src/processed-games/nomination-whist.json)
  - URLs: https://www.pagat.com/whist/nomination.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-nomination.html, wiki-whist-4.html, wiki-whist.html)

- 633 : [x] **Noms | Nommie**
  - JSON: [noms.json](../src/processed-games/noms.json)
  - URLs: https://www.pagat.com/beating/noms.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 634 : [x] **Nos**
  - JSON: [nos.json](../src/processed-games/nos.json)
  - URLs: https://www.pagat.com/jass/nos.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

### O

- 635 : [x] **OFCP | Open Face Chinese Poker | Pineapple OFCP**
  - JSON: [ofcp-poker.json](../src/processed-games/ofcp-poker.json)
  - URLs: https://www.pagat.com/partition/openface.html | https://www.pagat.com/partition/openface.html#pineapple
  - Local HTML: âœ“ (pagat-openface.html)

- 636 : [x] **Oh Hell! | Ascenseur | Blackout | Blob | Bust | Elevator | German Bridge | Judgement | Kachuful | Oh Pshaw! | Oh Shit! | Tien op en neer | Up and Down the River**
  - JSON: [oh-hell.json](../src/processed-games/oh-hell.json)
  - URLs: https://www.pagat.com/exact/ohhell.html | https://en.wikipedia.org/wiki/Oh_hell | https://en.wikipedia.org/wiki/Oh_Hell
  - Local HTML: âœ“ (pagat-oh-hell.html, wiki-oh-hell-3.html, wiki-oh-hell.html)

- 637 : [x] **Okey | Okey 101**
  - JSON: [okey.json](../src/processed-games/okey.json)
  - URLs: https://www.pagat.com/domino/line/okey.html | https://en.wikipedia.org/wiki/Okey | https://www.pagat.com/domino/line/okey.html#101
  - Local HTML: âœ“ (wiki-okey.html)

- 638 : [x] **Okey Turkish**
  - JSON: [okey-turkish.json](../src/processed-games/okey-turkish.json)
  - URLs: https://www.pagat.com/rummy/okey.html | https://www.pagat.com/rummy/okey101.html
  - Local HTML: âœ“ (pagat-okey-101.html, pagat-okey.html)

- 639 : [x] **Oklahoma 10-point Pitch**
  - JSON: [pitch-oklahoma.json](../src/processed-games/pitch-oklahoma.json)
  - URLs: https://www.pagat.com/allfours/pitch.html#oklahoma | https://en.wikipedia.org/wiki/Pitch_(card_game)
  - Local HTML: âœ“ (pagat-pitch.html, wiki-pitch-5.html, wiki-pitch.html)

- 640 : [x] **Old Maid | Black Peter | Ekae à¸­à¸µà¹à¸à¹ˆ | Pouilleux, Le | Schwarzer Peter | Vieux GarÃ§on**
  - JSON: [old-maid.json](../src/processed-games/old-maid.json)
  - URLs: https://www.pagat.com/passing/oldmaid.html | https://en.wikipedia.org/wiki/Old_maid_(card_game)
  - Local HTML: âœ“ (pagat-old-maid.html, wiki-old-maid-2.html, wiki-old-maid-3.html, wiki-old-maid.html)

- 641 : [x] **Omaha Poker | Omaha Hi-Lo Eight or Better Poker | Omaha High Poker | Omaha/8 Poker**
  - JSON: [omaha.json](../src/processed-games/omaha.json)
  - URLs: https://www.pagat.com/poker/variants/omaha.html | https://en.wikipedia.org/wiki/Omaha_hold_%27em | https://www.pagat.com/poker/variants/omaha.html#eight | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-omaha.html, wiki-omaha-holdem.html, wiki-poker.html)

- 642 : [x] **Omben | Minuman**
  - JSON: [omben.json](../src/processed-games/omben.json)
  - URLs: https://www.pagat.com/fishing/omben.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 643 : [x] **Omi**
  - JSON: [omi.json](../src/processed-games/omi.json)
  - URLs: https://www.pagat.com/fishing/omi.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 644 : [x] **One Arm Joe | One-Armed Pete**
  - JSON: [indian-poker-one-arm-joe.json](../src/processed-games/indian-poker-one-arm-joe.json)
  - URLs: https://www.pagat.com/poker/variants/indian.html#onearm | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-indian-poker.html, wiki-poker.html)

- 645 : [x] **One Hundred adding game | 100 adding game**
  - JSON: [one-hundred-adding-game.json](../src/processed-games/one-hundred-adding-game.json)
  - URLs: https://www.pagat.com/adders/hundred.html | https://en.wikipedia.org/wiki/Cribbage
  - Local HTML: âœ“ (wiki-cribbage-3.html, wiki-cribbage.html)

- 646 : [x] **One-Eyed Jack | Jack Foolery | Jack Off**
  - JSON: [one-eyed-jack.json](../src/processed-games/one-eyed-jack.json)
  - URLs: https://www.pagat.com/poker/variants/oneeyedjack.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 647 : [x] **Open Rummy**
  - JSON: [open-rummy.json](../src/processed-games/open-rummy.json)
  - URLs: https://www.pagat.com/rummy/open_rummy.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

### P

- 648 : [ ] **P'yanitsa Drunkard**
  - JSON: [pyanitsa-drunkard.json](../src/processed-games/pyanitsa-drunkard.json)
  - URLs: https://www.pagat.com/beating/pyanitsa.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 649 : [ ] **Paco**
  - JSON: [paco.json](../src/processed-games/paco.json)
  - URLs: https://www.pagat.com/fishing/paco.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 650 : [ ] **Page One**
  - JSON: [page-one.json](../src/processed-games/page-one.json)
  - URLs: https://www.pagat.com/draw/page_one.html
  - Local HTML: âœ“ (pagat-page-one.html)

- 651 : [ ] **Page One Japanese**
  - JSON: [page-one-japanese.json](../src/processed-games/page-one-japanese.json)
  - URLs: https://www.pagat.com/inflation/page_one.html
  - Local HTML: âœ“ (pagat-page-one.html)

- 652 : [ ] **Pai Gow Poker**
  - JSON: [pai-gow-poker.json](../src/processed-games/pai-gow-poker.json)
  - URLs: https://www.pagat.com/banking/paigow_poker.html | https://en.wikipedia.org/wiki/Pai_gow_poker
  - Local HTML: âœ“ (wiki-pai-gow-poker.html)

- 653 : [ ] **Pai Gow ç‰Œä¹**
  - JSON: [pai-gow.json](../src/processed-games/pai-gow.json)
  - URLs: https://www.pagat.com/domino/partition/paigow.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-paigow.html, wiki-dominoes.html)

- 654 : [ ] **PÃ¢i HÃ´ng à¹„à¸žà¹ˆà¸«à¹‰à¸­à¸‡**
  - JSON: [pai-hong.json](../src/processed-games/pai-hong.json)
  - URLs: https://www.pagat.com/fishing/pai_hong.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 655 : [ ] **Paiute**
  - JSON: [paiute.json](../src/processed-games/paiute.json)
  - URLs: https://www.pagat.com/rummy/paiute.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 656 : [ ] **Palace Shedding**
  - JSON: [palace-shedding.json](../src/processed-games/palace-shedding.json)
  - URLs: https://www.pagat.com/beating/shithead.html
  - Local HTML: âœ“ (pagat-shithead.html)

- 657 : [ ] **Palatinusz Tarokk Hungarian**
  - JSON: [palatinusz-tarokk-hungarian.json](../src/processed-games/palatinusz-tarokk-hungarian.json)
  - URLs: https://www.pagat.com/tarot/palatinusz.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 658 : [ ] **Pan Polish | Pan Panguingue**
  - JSON: [pan-polish.json](../src/processed-games/pan-polish.json)
  - URLs: https://www.pagat.com/rummy/pan.html | https://en.wikipedia.org/wiki/Rummy | https://www.pagat.com/rummy/pan.html#panguingue
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 659 : [ ] **Pandoeren**
  - JSON: [pandoeren.json](../src/processed-games/pandoeren.json)
  - URLs: https://www.pagat.com/jass/pandoeren.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 660 : [ ] **Panguingue**
  - JSON: [panguingue.json](../src/processed-games/panguingue.json)
  - URLs: https://www.pagat.com/rummy/pan.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 661 : [ ] **Panjpar**
  - JSON: [panjpar.json](../src/processed-games/panjpar.json)
  - URLs: https://www.pagat.com/fishing/panjpar.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 662 : [ ] **Papillon Fishing**
  - JSON: [papillon-fishing.json](../src/processed-games/papillon-fishing.json)
  - URLs: https://en.wikipedia.org/wiki/Papillon_(card_game)
  - Local HTML: âœ“ (wiki-papillon.html)

- 663 : [ ] **Partner Dominoes Jamaican**
  - JSON: [partner-dominoes-jamaican.json](../src/processed-games/partner-dominoes-jamaican.json)
  - URLs: https://www.pagat.com/domino/line/partnership.html#jamaican | https://en.wikipedia.org/wiki/Dominoes | https://www.pagat.com/domino/line/caribbean.html
  - Local HTML: âœ“ (pagat-domino-caribbean.html, pagat-partnership.html, wiki-dominoes.html)

- 664 : [ ] **Partnership Dominoes Latin | Dominoes Latin Partnership**
  - JSON: [partnership-dominoes.json](../src/processed-games/partnership-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/partnership.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-partnership.html, wiki-dominoes.html)

- 665 : [ ] **Pas Seul**
  - JSON: [pas-seul.json](../src/processed-games/pas-seul.json)
  - URLs: https://www.acecardgames.com/pas-seul/ | https://www.pagat.com/patience/pas_seul.html
  - Local HTML: âœ“ (acecardgames-pas-seul.html)

- 666 : [ ] **Paskahousu | PÃ¶ytÃ¤paska | Ruotsalainen paskahousu**
  - JSON: [paskahousu.json](../src/processed-games/paskahousu.json)
  - URLs: https://www.pagat.com/beating/paskahousu.html | https://en.wikipedia.org/wiki/Durak | https://www.pagat.com/beating/paskahousu.html#table | https://www.pagat.com/beating/paskahousu.html#ruotsalainen
  - Local HTML: âœ“ (pagat-paskahousu.html, wiki-durak-3.html, wiki-durak.html)

- 667 : [ ] **Paskievics Tarokk**
  - JSON: [paskievics-tarokk.json](../src/processed-games/paskievics-tarokk.json)
  - URLs: https://www.pagat.com/tarot/paskievics.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 668 : [ ] **Pass The Trash Poker | Do Ya Poker | Trash**
  - JSON: [pass-the-trash.json](../src/processed-games/pass-the-trash.json)
  - URLs: https://www.pagat.com/poker/variants/passthetrash.html#do_ya | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/passthetrash.html | https://www.pagat.com/poker/variants/passthetrash.html#trash
  - Local HTML: âœ“ (pagat-pass-the-trash.html, wiki-poker.html)

- 669 : [ ] **Passing Dominoes**
  - JSON: [passing-dominoes.json](../src/processed-games/passing-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/passing.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-passing.html, wiki-dominoes.html)

- 670 : [ ] **Paston**
  - JSON: [paston.json](../src/processed-games/paston.json)
  - URLs: https://www.pagat.com/fishing/paston.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 671 : [ ] **Paston Armenian Trick**
  - JSON: [paston-armenian-trick.json](../src/processed-games/paston-armenian-trick.json)
  - URLs: https://www.pagat.com/trick/paston.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 672 : [ ] **Paublillo**
  - JSON: [paublillo.json](../src/processed-games/paublillo.json)
  - URLs: https://www.pagat.com/fishing/paublillo.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 673 : [ ] **Pawnee 10-point Call Partner Pitch**
  - JSON: [pitch-pawnee.json](../src/processed-games/pitch-pawnee.json)
  - URLs: https://www.pagat.com/allfours/pitch.html#pawnee | https://en.wikipedia.org/wiki/Pitch_(card_game)
  - Local HTML: âœ“ (pagat-pitch.html, wiki-pitch-5.html, wiki-pitch.html)

- 674 : [ ] **Pedro | Pidro**
  - JSON: [pedro.json](../src/processed-games/pedro.json)
  - URLs: https://www.pagat.com/allfours/pedro.html | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (pagat-pedro.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 675 : [ ] **Pedro Sancho | Nine-Five**
  - JSON: [pedro-sancho.json](../src/processed-games/pedro-sancho.json)
  - URLs: https://www.pagat.com/allfours/pedro.html#sancho | https://en.wikipedia.org/wiki/All_fours_(card_game)
  - Local HTML: âœ“ (pagat-pedro.html, wiki-all-fours-2.html, wiki-all-fours.html)

- 676 : [ ] **Peeso Horns**
  - JSON: [peeso-horns.json](../src/processed-games/peeso-horns.json)
  - URLs: https://en.wikipedia.org/wiki/6_nimmt!
  - Local HTML: âœ“ (wiki-6-nimmt.html)

- 677 : [ ] **Pegs and Jokers | Jokers and Marbles | Jokers and Pegs | Marbles and Jokers**
  - JSON: [pegs-and-jokers.json](../src/processed-games/pegs-and-jokers.json)
  - URLs: https://www.pagat.com/race/pegsandjokers.html
  - Local HTML: âœ“ (pagat-pegs-and-jokers.html)

- 678 : [ ] **Pegs And Jokers Hybrid**
  - JSON: [pegs-and-jokers-hybrid.json](../src/processed-games/pegs-and-jokers-hybrid.json)
  - URLs: https://www.pagat.com/race/pegsjokers.html
  - Local HTML: âœ“ (pagat-pegs-and-jokers.html)

- 679 : [ ] **Pelmanism | Memory | Shinkei-suijaku**
  - JSON: [pelmanism.json](../src/processed-games/pelmanism.json)
  - URLs: https://www.pagat.com/misc/pelmanism.html
  - Local HTML: âœ“ (pagat-pelmanism.html)

- 680 : [ ] **Penneech**
  - JSON: [penneech.json](../src/processed-games/penneech.json)
  - URLs: https://www.pagat.com/fishing/penneech.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 681 : [ ] **Pennies from Heaven**
  - JSON: [pennies-from-heaven.json](../src/processed-games/pennies-from-heaven.json)
  - URLs: https://www.pagat.com/rummy/pennies.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-pennies.html, wiki-rummy-4.html, wiki-rummy.html)

- 682 : [ ] **Pepper**
  - JSON: [pepper.json](../src/processed-games/pepper.json)
  - URLs: https://www.pagat.com/rams/pepper.html | https://en.wikipedia.org/wiki/Rams_(card_game)
  - Local HTML: âœ“ (wiki-rams-4.html, wiki-rams.html)

- 683 : [ ] **Perevodnoy Durak**
  - JSON: [perevodnoy-durak.json](../src/processed-games/perevodnoy-durak.json)
  - URLs: https://www.pagat.com/beating/perevodnoy_durak.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-perevodnoy-durak.html, wiki-durak-3.html, wiki-durak.html)

- 684 : [ ] **Perlaggen**
  - JSON: [perlaggen.json](../src/processed-games/perlaggen.json)
  - URLs: https://www.pagat.com/tarot/perlaggen.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 685 : [ ] **Perudo Bluff**
  - JSON: [perudo-bluff.json](../src/processed-games/perudo-bluff.json)
  - URLs: https://en.wikipedia.org/wiki/Liar%27s_dice
  - Local HTML: âœ“ (wiki-liars-dice.html)

- 686 : [ ] **Petit Paquet Gambling**
  - JSON: [petit-paquet-gambling.json](../src/processed-games/petit-paquet-gambling.json)
  - URLs: https://en.wikipedia.org/wiki/Little_Lots
  - Local HTML: âœ“ (wiki-little-lots.html)

- 687 : [ ] **Petrangola | 31**
  - JSON: [petrangola.json](../src/processed-games/petrangola.json)
  - URLs: https://www.pagat.com/fishing/petrangola.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 688 : [ ] **Petteia Greek**
  - JSON: [petteia-greek.json](../src/processed-games/petteia-greek.json)
  - URLs: https://en.wikipedia.org/wiki/Petteia
  - Local HTML: âœ“ (wiki-petteia.html)

- 689 : [ ] **Pick a Partner Poker**
  - JSON: [pick-a-partner.json](../src/processed-games/pick-a-partner.json)
  - URLs: https://www.pagat.com/poker/variants/pickapartner.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 690 : [ ] **Piedicavallo Tarocchi | Tarocchi Piedicavallo**
  - JSON: [piedicavallo-tarocchi.json](../src/processed-games/piedicavallo-tarocchi.json)
  - URLs: https://www.pagat.com/tarot/piedicavallo.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (pagat-piedicavallo.html, wiki-tarot-2.html, wiki-tarot.html)

- 691 : [ ] **Pig | Donkey Australia | Popa Prostul | Spoons Pig**
  - JSON: [pig.json](../src/processed-games/pig.json)
  - URLs: https://www.pagat.com/passing/pig.html | https://www.pagat.com/passing/pig.html#spoons
  - Local HTML: âœ“ (pagat-passing-pig.html)

- 692 : [ ] **Pilotta**
  - JSON: [pilotta.json](../src/processed-games/pilotta.json)
  - URLs: https://www.pagat.com/fishing/pilotta.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 693 : [ ] **Pinochle | Domino Pinochle | Pinochle Domino**
  - JSON: [pinochle.json](../src/processed-games/pinochle.json)
  - URLs: https://www.pagat.com/domino/trick/pinochle.html | https://en.wikipedia.org/wiki/Pinochle | https://www.pagat.com/marriage/pinochle.html
  - Local HTML: âœ“ (pagat-domino-pinochle.html, wiki-pinochle-2.html, wiki-pinochle.html)

- 694 : [ ] **Pinochle Double Deck**
  - JSON: [pinochle-double-deck.json](../src/processed-games/pinochle-double-deck.json)
  - URLs: https://www.pagat.com/marriage/pinochle.html#double | https://en.wikipedia.org/wiki/Pinochle
  - Local HTML: âœ“ (wiki-pinochle-2.html, wiki-pinochle.html)

- 695 : [ ] **Pinochle Single Deck Partnership**
  - JSON: [pinochle-single-deck-partnership.json](../src/processed-games/pinochle-single-deck-partnership.json)
  - URLs: https://www.pagat.com/marriage/pinochle.html#partnership | https://en.wikipedia.org/wiki/Pinochle
  - Local HTML: âœ“ (wiki-pinochle-2.html, wiki-pinochle.html)

- 696 : [ ] **Pinochle Three Player | Pinochle 3-player Auction**
  - JSON: [pinochle-three-player.json](../src/processed-games/pinochle-three-player.json)
  - URLs: https://www.pagat.com/marriage/pinochle.html#three | https://en.wikipedia.org/wiki/Pinochle
  - Local HTML: âœ“ (wiki-pinochle-2.html, wiki-pinochle.html)

- 697 : [ ] **Pinochle Two Player**
  - JSON: [pinochle-two-player.json](../src/processed-games/pinochle-two-player.json)
  - URLs: https://www.pagat.com/marriage/pinochle.html#two | https://en.wikipedia.org/wiki/Pinochle
  - Local HTML: âœ“ (wiki-pinochle-2.html, wiki-pinochle.html)

- 698 : [ ] **Pip-Pip!**
  - JSON: [pip-pip.json](../src/processed-games/pip-pip.json)
  - URLs: https://www.pagat.com/race/pip_pip.html
  - Local HTML: âœ“ (pagat-pip-pip.html)

- 699 : [ ] **Piquet**
  - JSON: [piquet.json](../src/processed-games/piquet.json)
  - URLs: https://www.pagat.com/pointtrk/piquet.html | https://en.wikipedia.org/wiki/Piquet
  - Local HTML: âœ“ (wiki-piquet-2.html, wiki-piquet.html)

- 700 : [ ] **Piquet Classic**
  - JSON: [piquet-classic.json](../src/processed-games/piquet-classic.json)
  - URLs: https://www.pagat.com/notrump/piquet.html
  - Local HTML: âœ“ (pagat-piquet.html)

- 701 : [ ] **Pirate Bridge**
  - JSON: [pirate-bridge.json](../src/processed-games/pirate-bridge.json)
  - URLs: https://archive.org/details/piratebridgelate00fost | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 702 : [ ] **Pishe Pasha**
  - JSON: [pishe-pasha.json](../src/processed-games/pishe-pasha.json)
  - URLs: https://www.pagat.com/fishing/pishe_pasha.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 703 : [ ] **PiÅŸti**
  - JSON: [pisti-turkish.json](../src/processed-games/pisti-turkish.json)
  - URLs: https://www.pagat.com/fishing/pisti.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 704 : [ ] **Pitch | High-Low-Jack | Setback**
  - JSON: [pitch.json](../src/processed-games/pitch.json)
  - URLs: https://www.pagat.com/allfours/pitch.html | https://en.wikipedia.org/wiki/Pitch_(card_game)
  - Local HTML: âœ“ (pagat-pitch.html, wiki-pitch-5.html, wiki-pitch.html)

- 705 : [ ] **Pitch with Fives**
  - JSON: [pitch-with-fives.json](../src/processed-games/pitch-with-fives.json)
  - URLs: https://www.pagat.com/allfours/pitch.html#fives | https://en.wikipedia.org/wiki/Pitch_(card_game)
  - Local HTML: âœ“ (pagat-pitch.html, wiki-pitch-5.html, wiki-pitch.html)

- 706 : [ ] **Pitty Pat**
  - JSON: [pitty-pat.json](../src/processed-games/pitty-pat.json)
  - URLs: https://www.pagat.com/rummy/pitty_pat.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 707 : [ ] **Pizzichino**
  - JSON: [pizzichino.json](../src/processed-games/pizzichino.json)
  - URLs: https://www.pagat.com/tressette/spizzichino.html
  - Local HTML: âœ“ (pagat-spizzichino.html)

- 708 : [ ] **Plait Solitaire**
  - JSON: [plait-solitaire.json](../src/processed-games/plait-solitaire.json)
  - URLs: https://www.bvssolitaire.com/rules/plait.asp
  - Local HTML: âœ“ (bvssolitaire-plait.html)

- 709 : [ ] **Plus-Minus Jass**
  - JSON: [plus-minus-jass.json](../src/processed-games/plus-minus-jass.json)
  - URLs: https://www.pagat.com/jass/plusminus.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 710 : [ ] **Poch | Pochspiel | Poque**
  - JSON: [poch.json](../src/processed-games/poch.json)
  - URLs: https://www.pagat.com/stops/poch.html | https://en.wikipedia.org/wiki/Michigan_(card_game) | https://en.wikipedia.org/wiki/Belle%2C_Flux_et_Trente-et-Un
  - Local HTML: âœ“ (pagat-poch.html, wiki-belle-flux-et-trente-et-un.html, wiki-michigan.html)

- 711 : [ ] **Podrida**
  - JSON: [podrida.json](../src/processed-games/podrida.json)
  - URLs: https://www.pagat.com/rams/podrida.html | https://en.wikipedia.org/wiki/Rams_(card_game)
  - Local HTML: âœ“ (wiki-rams-4.html, wiki-rams.html)

- 712 : [ ] **Poker Bull**
  - JSON: [indian-poker-bull.json](../src/processed-games/indian-poker-bull.json)
  - URLs: https://www.pagat.com/poker/variants/indian.html#bull | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-indian-poker.html, wiki-poker.html)

- 713 : [ ] **Poker Menteur**
  - JSON: [mentiroso.json](../src/processed-games/mentiroso.json)
  - URLs: https://www.pagat.com/poker/variants/menteur.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 714 : [ ] **Pokerize**
  - JSON: [pokerize.json](../src/processed-games/pokerize.json)
  - URLs: https://www.pagat.com/rummy/pokerize.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 715 : [ ] **Polignac**
  - JSON: [polignac.json](../src/processed-games/polignac.json)
  - URLs: https://www.pagat.com/beating/polignac.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 716 : [ ] **Polignac French**
  - JSON: [polignac-french.json](../src/processed-games/polignac-french.json)
  - URLs: https://en.wikipedia.org/wiki/Polignac_(card_game)
  - Local HTML: âœ“ (wiki-polignac.html)

- 717 : [ ] **Polish Bank Gambling**
  - JSON: [polish-bank-gambling.json](../src/processed-games/polish-bank-gambling.json)
  - URLs: https://en.wikipedia.org/wiki/Bank_(card_game)
  - Local HTML: âœ“ (wiki-bank.html)

- 718 : [ ] **Polish Red Dog | Polski Pachuck | Stitch**
  - JSON: [polish-red-dog.json](../src/processed-games/polish-red-dog.json)
  - URLs: https://www.pagat.com/banking/red_dog.html#polish | https://www.pagat.com/banking/reddog.html#polish-red-dog
  - Local HTML: âœ“ (pagat-reddog.html)

- 719 : [ ] **Pollack**
  - JSON: [pollack.json](../src/processed-games/pollack.json)
  - URLs: https://www.pagat.com/jass/pollack.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 720 : [ ] **Pontoon | Shoot Pontoon**
  - JSON: [pontoon.json](../src/processed-games/pontoon.json)
  - URLs: https://www.pagat.com/banking/pontoon.html | https://www.pagat.com/banking/pontoon.html#shoot
  - Local HTML: âœ“ (pagat-pontoon.html)

- 721 : [ ] **Pope Joan**
  - JSON: [pope-joan.json](../src/processed-games/pope-joan.json)
  - URLs: https://www.pagat.com/stops/pope_joan.html | https://en.wikipedia.org/wiki/Michigan_(card_game)
  - Local HTML: âœ“ (pagat-pope-joan.html, wiki-michigan.html)

- 722 : [ ] **Porrazo | Parosso**
  - JSON: [porrazo.json](../src/processed-games/porrazo.json)
  - URLs: https://www.pagat.com/fishing/porrazo.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-porrazo.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 723 : [ ] **Prefa**
  - JSON: [prefa.json](../src/processed-games/prefa.json)
  - URLs: https://www.pagat.com/preference/prefa.html | https://en.wikipedia.org/wiki/Pr%C3%A9f%C3%A9rence
  - Local HTML: âœ“ (pagat-prefa.html, wiki-preference.html, wiki-prfrence.html)

- 724 : [ ] **Preferans Russian | Preferans Croatian/Serbian/Slovenian**
  - JSON: [preferans-russian.json](../src/processed-games/preferans-russian.json)
  - URLs: https://www.pagat.com/preference/preferans.html#croatian | https://en.wikipedia.org/wiki/Pr%C3%A9f%C3%A9rence | https://www.pagat.com/preference/preferans.html
  - Local HTML: âœ“ (wiki-preference.html, wiki-prfrence.html)

- 725 : [ ] **Preferans Russian Classic**
  - JSON: [preferans-russian-classic.json](../src/processed-games/preferans-russian-classic.json)
  - URLs: https://en.wikipedia.org/wiki/Preferans
  - Local HTML: âœ“ (wiki-preferans.html)

- 726 : [ ] **PreferÃ¡nsz Donauschwaben**
  - JSON: [prefer-nsz-donauschwaben.json](../src/processed-games/prefer-nsz-donauschwaben.json)
  - URLs: https://www.pagat.com/preference/donauschwaben.html | https://en.wikipedia.org/wiki/Pr%C3%A9f%C3%A9rence
  - Local HTML: âœ“ (wiki-preference.html, wiki-prfrence.html)

- 727 : [ ] **Preference | Preference Austrian**
  - JSON: [preference.json](../src/processed-games/preference.json)
  - URLs: https://www.pagat.com/preference/preference.html | https://en.wikipedia.org/wiki/Pr%C3%A9f%C3%A9rence | https://www.pagat.com/preference/preference.html#austrian
  - Local HTML: âœ“ (wiki-preference.html, wiki-prfrence.html)

- 728 : [ ] **President | Asshole | Bum | Butthead | Capitalism | Emperors and Scum | HÅ±bÃ©res | Klootzakken | Landlord | Rich Man Poor Man | Root Beer | Scum | Sluitspieren | Trouduc | Warlords and Scumbags**
  - JSON: [president.json](../src/processed-games/president.json)
  - URLs: https://www.pagat.com/climbing/president.html | https://en.wikipedia.org/wiki/President_(card_game)
  - Local HTML: âœ“ (pagat-climbing-president.html, wiki-president-5.html, wiki-president.html)

- 729 : [ ] **Price is Right, The Poker**
  - JSON: [price-is-right.json](../src/processed-games/price-is-right.json)
  - URLs: https://www.pagat.com/poker/variants/priceisright.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 730 : [ ] **Primero**
  - JSON: [primero.json](../src/processed-games/primero.json)
  - URLs: https://www.pagat.com/vying/primero.html
  - Local HTML: âœ“ (pagat-primero.html)

- 731 : [ ] **Primiera Historical**
  - JSON: [primiera-historical.json](../src/processed-games/primiera-historical.json)
  - URLs: https://www.pagat.com/vying/primero.html
  - Local HTML: âœ“ (pagat-primero.html)

- 732 : [ ] **Prostoy Durak**
  - JSON: [prostoy-durak.json](../src/processed-games/prostoy-durak.json)
  - URLs: https://www.pagat.com/beating/prostoy_durak.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-prostoy-durak.html, wiki-durak-3.html, wiki-durak.html)

- 733 : [ ] **Proter**
  - JSON: [proter.json](../src/processed-games/proter.json)
  - URLs: https://www.pagat.com/jass/proter.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 734 : [ ] **Psycho Poker**
  - JSON: [psycho-poker.json](../src/processed-games/psycho-poker.json)
  - URLs: https://www.pagat.com/poker/variants/psycho.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 735 : [ ] **PÃºkk**
  - JSON: [pukk-icelandic-poch.json](../src/processed-games/pukk-icelandic-poch.json)
  - URLs: https://www.pagat.com/beating/pukk.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 736 : [ ] **Pulle Dominoes**
  - JSON: [pulle.json](../src/processed-games/pulle.json)
  - URLs: https://www.pagat.com/domino/line/pulle.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 737 : [ ] **Punto Banco**
  - JSON: [baccarat.json](../src/processed-games/baccarat.json)
  - URLs: https://www.pagat.com/banking/baccarat.html
  - Local HTML: âœ“ (pagat-baccarat.html)

- 738 : [ ] **Push Poker**
  - JSON: [push-poker.json](../src/processed-games/push-poker.json)
  - URLs: https://www.pagat.com/poker/variants/push.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 739 : [ ] **Put**
  - JSON: [put.json](../src/processed-games/put.json)
  - URLs: https://www.pagat.com/put/put.html | https://en.wikipedia.org/wiki/Aluette
  - Local HTML: âœ“ (pagat-put.html, wiki-aluette-2.html, wiki-aluette.html)

- 740 : [ ] **Pyramid Poker**
  - JSON: [pyramid.json](../src/processed-games/pyramid.json)
  - URLs: https://www.pagat.com/poker/variants/pyramid.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 741 : [ ] **Pyramide French Drinking**
  - JSON: [pyramide-french-drinking.json](../src/processed-games/pyramide-french-drinking.json)
  - URLs: https://en.wikipedia.org/wiki/Pyramid_(drinking_game)
  - Local HTML: âœ“ (wiki-pyramid-drinking.html)

### Q

- 742 : [x] **QiuQiu | 99 dominoes | Kiu Kiu**
  - JSON: [qiuqiu.json](../src/processed-games/qiuqiu.json)
  - URLs: https://www.pagat.com/vying/qiugiu.html | https://en.wikipedia.org/wiki/Qiqi
  - Local HTML: âœ“ (wiki-qiqi.html)

- 743 : [x] **Quadrille**
  - JSON: [quadrille.json](../src/processed-games/quadrille.json)
  - URLs: https://www.pagat.com/lhombre/quadrille.html | https://en.wikipedia.org/wiki/Ombre | https://davidparlett.co.uk/histocs/quadrill.html | https://en.wikipedia.org/wiki/Quadrille_(card_game)
  - Local HTML: âœ“ (pagat-quadrille.html, wiki-ombre-2.html, wiki-ombre.html, wiki-quadrille-2.html, wiki-quadrille.html)

- 744 : [x] **Quan Dui Chinese Money**
  - JSON: [quan-dui-chinese-money.json](../src/processed-games/quan-dui-chinese-money.json)
  - URLs: https://www.pagat.com/rummy/quan_dui.html
  - Local HTML: âœ“ (pagat-quan-dui.html)

- 745 : [x] **Quan Dui å…¨å°**
  - JSON: [quan-dui.json](../src/processed-games/quan-dui.json)
  - URLs: https://www.pagat.com/vying/quandui.html
  - Local HTML: âœ“ (pagat-quan-dui.html)

- 746 : [x] **Quartett**
  - JSON: [quartett.json](../src/processed-games/quartett.json)
  - URLs: https://www.pagat.com/quartet/quartett.html | https://en.wikipedia.org/wiki/Happy_Families | https://en.wikipedia.org/wiki/Happy_families
  - Local HTML: âœ“ (wiki-happy-families-3.html, wiki-happy-families.html)

- 747 : [x] **Quatre Sept | Politaine | Poule**
  - JSON: [quatre-sept.json](../src/processed-games/quatre-sept.json)
  - URLs: https://www.pagat.com/quotawhist/quatre_sept.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 748 : [x] **Quatre Valets French Penalty**
  - JSON: [quatre-valets-french-penalty.json](../src/processed-games/quatre-valets-french-penalty.json)
  - URLs: https://en.wikipedia.org/wiki/Polignac_(card_game)
  - Local HTML: âœ“ (wiki-polignac.html)

- 749 : [x] **Quebec Rummy Contract**
  - JSON: [quebec-rummy-contract.json](../src/processed-games/quebec-rummy-contract.json)
  - URLs: https://fr.wikipedia.org/wiki/Rami | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 750 : [x] **Queens Slipper 500**
  - JSON: [queens-slipper-500.json](../src/processed-games/queens-slipper-500.json)
  - URLs: https://www.pagat.com/euchre/500.html
  - Local HTML: âœ“ (pagat-euchre-500.html)

- 751 : [x] **Quinientos | 500 Dominoes**
  - JSON: [quinientos.json](../src/processed-games/quinientos.json)
  - URLs: https://www.pagat.com/rummy/quinientos.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

### R

- 752 : [x] **Racehorse Pitch**
  - JSON: [pitch-racehorse.json](../src/processed-games/pitch-racehorse.json)
  - URLs: https://www.pagat.com/allfours/pitch.html#racehorse | https://en.wikipedia.org/wiki/Pitch_(card_game)
  - Local HTML: âœ“ (pagat-pitch.html, wiki-pitch-5.html, wiki-pitch.html)

- 753 : [x] **Racing Demon | Nerts | Peanuts | Pounce | Scrooge | Squeal**
  - JSON: [racing-demon.json](../src/processed-games/racing-demon.json)
  - URLs: https://www.pagat.com/patience/racing_demon.html | https://en.wikipedia.org/wiki/Racing_Demon
  - Local HTML: âœ“ (wiki-racing-demon.html)

- 754 : [x] **Rainbow Shedding Collect**
  - JSON: [rainbow-shedding-collect.json](../src/processed-games/rainbow-shedding-collect.json)
  - URLs: https://rainbowthecardgame.com/
  - Local HTML: âœ“ (rainbowthecardgame.html)

- 755 : [x] **Ramchi**
  - JSON: [ramchi.json](../src/processed-games/ramchi.json)
  - URLs: https://www.pagat.com/fishing/ramchi.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 756 : [x] **Ramino Pokerato | Ramino Pokerato carioca | Ramino Pokerato con Jolly immaginario | Ramino Pokerato con rilancio**
  - JSON: [ramino.json](../src/processed-games/ramino.json)
  - URLs: https://www.pagat.com/rummy/ramino.html | https://en.wikipedia.org/wiki/Rummy | https://www.pagat.com/rummy/ramino.html#carioca
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 757 : [x] **Ramsli**
  - JSON: [ramsli.json](../src/processed-games/ramsli.json)
  - URLs: https://www.pagat.com/jass/ramsli.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 758 : [x] **Rang Milanti Bengali Matching**
  - JSON: [rang-milanti-bengali-matching.json](../src/processed-games/rang-milanti-bengali-matching.json)
  - URLs: https://www.pagat.com/war/rang-milanti.html
  - Local HTML: âœ“ (pagat-rang-milanti.html)

- 759 : [x] **Rangoon**
  - JSON: [rangoon.json](../src/processed-games/rangoon.json)
  - URLs: https://www.pagat.com/rummy/rangoon.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 760 : [x] **Raub**
  - JSON: [raub.json](../src/processed-games/raub.json)
  - URLs: https://www.pagat.com/jass/raub.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 761 : [x] **RÄƒzboi**
  - JSON: [razboi-romanian-war.json](../src/processed-games/razboi-romanian-war.json)
  - URLs: https://www.pagat.com/war/razboi.html | https://en.wikipedia.org/wiki/War_(card_game)
  - Local HTML: âœ“ (wiki-war-3.html, wiki-war.html)

- 762 : [x] **Razz**
  - JSON: [razz.json](../src/processed-games/razz.json)
  - URLs: https://www.pagat.com/poker/variants/7stud.html#razz | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-seven-card-stud.html, wiki-poker.html)

- 763 : [x] **Red Dog High Card Pool**
  - JSON: [indian-poker-red-dog-high-card.json](../src/processed-games/indian-poker-red-dog-high-card.json)
  - URLs: https://www.pagat.com/poker/variants/indian.html#highcard | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-indian-poker.html, wiki-poker.html)

- 764 : [x] **Remi Indonesia**
  - JSON: [remi-indonesia.json](../src/processed-games/remi-indonesia.json)
  - URLs: https://www.pagat.com/rummy/remi_indonesia.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 765 : [x] **Reversis**
  - JSON: [reversis.json](../src/processed-games/reversis.json)
  - URLs: https://www.pagat.com/reverse/reversis.html | https://en.wikipedia.org/wiki/Hearts_(card_game) | https://www.parlettgames.uk/histocs/reversis.html
  - Local HTML: âœ“ (pagat-reversis.html, wiki-hearts-3.html, wiki-hearts.html)

- 766 : [x] **Rikken**
  - JSON: [rikken.json](../src/processed-games/rikken.json)
  - URLs: https://www.pagat.com/whist/rikken.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 767 : [x] **Ristiklappi | Lappi**
  - JSON: [ristiklappi.json](../src/processed-games/ristiklappi.json)
  - URLs: https://www.pagat.com/beating/ristiklappi.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 768 : [x] **Ristikontra**
  - JSON: [ristikontra.json](../src/processed-games/ristikontra.json)
  - URLs: https://www.pagat.com/beating/ristikontra.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 769 : [x] **RÄ±fkÄ±**
  - JSON: [rifki-turkish-penalty-king.json](../src/processed-games/rifki-turkish-penalty-king.json)
  - URLs: https://www.pagat.com/fishing/rifki.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 770 : [x] **Ronda**
  - JSON: [ronda.json](../src/processed-games/ronda.json)
  - URLs: https://www.pagat.com/fishing/ronda.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-ronda.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 771 : [x] **Rook Â® | Rook Sluff | Toonerville Rook**
  - JSON: [rook.json](../src/processed-games/rook.json)
  - URLs: https://www.pagat.com/kt5/rook.html | https://en.wikipedia.org/wiki/Rook_(card_game) | https://www.pagat.com/kt5/rook.html#sluff | https://www.pagat.com/kt5/rook.html#toonerville
  - Local HTML: âœ“ (pagat-rook.html, wiki-rook.html)

- 772 : [x] **Round the World Poker**
  - JSON: [round-the-world.json](../src/processed-games/round-the-world.json)
  - URLs: https://www.pagat.com/poker/variants/roundtheworld.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 773 : [x] **Royal Casino**
  - JSON: [royal-casino.json](../src/processed-games/royal-casino.json)
  - URLs: https://www.pagat.com/fishing/royal_casino.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-royal-casino.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 774 : [x] **Rubamazzo**
  - JSON: [rubamazzo.json](../src/processed-games/rubamazzo.json)
  - URLs: https://www.pagat.com/fishing/rubamazzo.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 775 : [x] **Ruff and Honours**
  - JSON: [ruff-and-honours.json](../src/processed-games/ruff-and-honours.json)
  - URLs: https://www.pagat.com/whist/ruff.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-ruff.html, wiki-whist-4.html, wiki-whist.html)

- 776 : [x] **Rufmariasch**
  - JSON: [rufmariasch.json](../src/processed-games/rufmariasch.json)
  - URLs: https://www.pagat.com/jass/rufmariasch.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 777 : [x] **Rummikub Â® | Rummikub Â® American | Rummikub Â® Internationsl | Rummikub Â® Sabra**
  - JSON: [rummikub.json](../src/processed-games/rummikub.json)
  - URLs: https://www.pagat.com/rummy/rummikub.html | https://en.wikipedia.org/wiki/Rummikub | https://www.pagat.com/rummy/rummikub.html#american | https://www.pagat.com/rummy/rummikub.html#sabra
  - Local HTML: âœ“ (pagat-rummikub.html, wiki-rummikub.html)

- 778 : [x] **Rummy basic | Paplu**
  - JSON: [rummy.json](../src/processed-games/rummy.json)
  - URLs: https://www.pagat.com/rummy/rummy.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-rummy-game.html, wiki-rummy-4.html, wiki-rummy.html)

- 779 : [x] **Russeln**
  - JSON: [russeln.json](../src/processed-games/russeln.json)
  - URLs: https://www.pagat.com/jass/russeln.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 780 : [x] **RÃºssi**
  - JSON: [russi-icelandic-layout-whist.json](../src/processed-games/russi-icelandic-layout-whist.json)
  - URLs: https://www.pagat.com/beating/russi.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 781 : [x] **Russian Bank | Crapette | CrapÃ´ | SchikanÃ¶s-Patience | Stop | Streitpatience | Tonj | Touch | Zank-Patience**
  - JSON: [russian-bank.json](../src/processed-games/russian-bank.json)
  - URLs: https://www.pagat.com/patience/crapette.html | https://en.wikipedia.org/wiki/Patience_(game)
  - Local HTML: âœ“ (pagat-crapette.html, wiki-patience.html)

- 782 : [x] **Russian Poker**
  - JSON: [russian-poker.json](../src/processed-games/russian-poker.json)
  - URLs: https://www.pagat.com/poker/variants/russian.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

### S

- 783 : [x] **Saat-Aath | 7-8**
  - JSON: [saat-aath.json](../src/processed-games/saat-aath.json)
  - URLs: https://www.pagat.com/fishing/saat_aath.html | https://en.wikipedia.org/wiki/Scopa | https://www.catsatcards.com/Games/ThreeTwoFive.html | https://card-games.wonderhowto.com/how-to/play-card-game-seven-eight-0122398/
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 784 : [x] **Sam Sip à¸œà¸ªà¸¡à¸ªà¸´à¸š | Mixing Tens**
  - JSON: [sam-sip.json](../src/processed-games/sam-sip.json)
  - URLs: https://www.pagat.com/fishing/samsip.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 785 : [x] **Samba | Samba-Canasta | Straat-Canasta**
  - JSON: [samba.json](../src/processed-games/samba.json)
  - URLs: https://www.pagat.com/rummy/samba.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-samba.html, wiki-rummy-4.html, wiki-rummy.html)

- 786 : [x] **San Francisco Poker**
  - JSON: [san-francisco-poker.json](../src/processed-games/san-francisco-poker.json)
  - URLs: https://www.pagat.com/poker/variants/7stud.html#sanfrancisco | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-seven-card-stud.html, wiki-poker.html)

- 787 : [x] **Sanaht Ø³ÙŽÙ†ÙŽØ­ÙŽØª | Shlla'at Ø´ÙŽÙ„ÙŽÙ‘Ø¹ÙŽØª**
  - JSON: [shlla-at.json](../src/processed-games/shlla-at.json)
  - URLs: https://www.pagat.com/fishing/shllaat.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-shllaat.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 788 : [x] **Sancagna**
  - JSON: [sancagna.json](../src/processed-games/sancagna.json)
  - URLs: https://www.pagat.com/fishing/sancagna.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 789 : [x] **Sang Krip**
  - JSON: [sang-krip.json](../src/processed-games/sang-krip.json)
  - URLs: https://www.pagat.com/fishing/sang_krip.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 790 : [x] **Sap Ng Wu åäº”æ¹– | 15 Wu | Shi Wu Hu åäº”æ¹–**
  - JSON: [sap-ng-wu.json](../src/processed-games/sap-ng-wu.json)
  - URLs: https://www.pagat.com/fishing/sapngwu.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 791 : [x] **Sasaki ì‚¬ì‚¬ë¼ | 44A**
  - JSON: [sasaki.json](../src/processed-games/sasaki.json)
  - URLs: https://www.pagat.com/fishing/sasaki.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 792 : [x] **Saskop | Lambapea**
  - JSON: [saskop.json](../src/processed-games/saskop.json)
  - URLs: https://www.pagat.com/jass/saskop.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 793 : [x] **Saskop Estonian Schafkopf Variant**
  - JSON: [saskop-estonian-schafkopf-variant.json](../src/processed-games/saskop-estonian-schafkopf-variant.json)
  - URLs: https://www.pagat.com/schafk/saskop.html
  - Local HTML: âœ“ (pagat-saskop.html)

- 794 : [x] **Satat**
  - JSON: [satat.json](../src/processed-games/satat.json)
  - URLs: https://www.pagat.com/fishing/satat.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 795 : [x] **Scala Quaranta**
  - JSON: [scala-quaranta.json](../src/processed-games/scala-quaranta.json)
  - URLs: https://www.pagat.com/fishing/scala_quaranta.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 796 : [x] **Scat | 31 | Blitz | Cabbage | Cadillac | Hand | Ride the Bus | Thirty-One**
  - JSON: [scat.json](../src/processed-games/scat.json)
  - URLs: https://www.pagat.com/draw/scat.html | https://www.pagat.com/draw/scat.html#hand
  - Local HTML: âœ“ (pagat-scat.html)

- 797 : [x] **Schafkopf Bavarian**
  - JSON: [schafkopf.json](../src/processed-games/schafkopf.json)
  - URLs: https://www.pagat.com/schafkopf/schafkopf.html | https://en.wikipedia.org/wiki/Schafkopf
  - Local HTML: âœ“ (wiki-schafkopf-3.html, wiki-schafkopf.html)

- 798 : [x] **Schafkopf Deutscher**
  - JSON: [schafkopf-bavarian-sheepshead.json](../src/processed-games/schafkopf-bavarian-sheepshead.json)
  - URLs: https://www.pagat.com/schafkopf/deutscher.html | https://en.wikipedia.org/wiki/Schafkopf
  - Local HTML: âœ“ (wiki-schafkopf-3.html, wiki-schafkopf.html)

- 799 : [x] **Schembil**
  - JSON: [schembil.json](../src/processed-games/schembil.json)
  - URLs: https://www.pagat.com/fishing/schembil.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 800 : [x] **Schieberamsch | Ramsch**
  - JSON: [schieberamsch.json](../src/processed-games/schieberamsch.json)
  - URLs: https://www.pagat.com/jass/schieberamsch.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 801 : [x] **SchrÃ¶Ã¶men | SiwweschrÃ¶Ã¶m | Tuppen**
  - JSON: [siwweschr-m.json](../src/processed-games/siwweschr-m.json)
  - URLs: https://www.pagat.com/last/toepen.html#eifel | https://en.wikipedia.org/wiki/Last_Card
  - Local HTML: âœ“ (pagat-toepen.html)

- 802 : [x] **Schwimmen | 31 | 41 Exchange | Hosen 'runter | Knack | Schnautz | Thirty-One**
  - JSON: [schwimmen.json](../src/processed-games/schwimmen.json)
  - URLs: https://www.pagat.com/commerce/schwimmen.html | https://en.wikipedia.org/wiki/Schwimmen | https://www.pagat.com/commerce/schwimmen.html#41
  - Local HTML: âœ“ (pagat-commerce-schwimmen.html, wiki-schwimmen.html)

- 803 : [x] **Scopa**
  - JSON: [scopa.json](../src/processed-games/scopa.json)
  - URLs: https://www.pagat.com/fishing/scopa.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-scopa.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 804 : [x] **Scopa Bazzica**
  - JSON: [scopa-bazzica.json](../src/processed-games/scopa-bazzica.json)
  - URLs: https://www.pagat.com/fishing/scopa.html#bazzica | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-scopa.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 805 : [x] **Scopa con le Scalette**
  - JSON: [scopa-scalette.json](../src/processed-games/scopa-scalette.json)
  - URLs: https://www.pagat.com/fishing/scopa.html#scalette | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-scopa.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 806 : [x] **Scopa Corse**
  - JSON: [scopa-corse.json](../src/processed-games/scopa-corse.json)
  - URLs: https://www.pagat.com/fishing/scopa.html#corse | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-scopa.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 807 : [x] **Scopa d'Assi**
  - JSON: [scopa-d-assi.json](../src/processed-games/scopa-d-assi.json)
  - URLs: https://www.pagat.com/fishing/scopa.html#assi | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-scopa.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 808 : [x] **Scopa di Quindici**
  - JSON: [scopa-di-quindici.json](../src/processed-games/scopa-di-quindici.json)
  - URLs: https://www.pagat.com/fishing/scopa.html#quindici | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-scopa.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 809 : [x] **Scopone**
  - JSON: [scopone.json](../src/processed-games/scopone.json)
  - URLs: https://www.pagat.com/fishing/scopone.html | https://en.wikipedia.org/wiki/Scopone
  - Local HTML: âœ“ (pagat-scopone.html, wiki-scopone.html)

- 810 : [x] **Sebastopol**
  - JSON: [sebastopol.json](../src/processed-games/sebastopol.json)
  - URLs: https://www.pagat.com/domino/tree/sebastopol.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 811 : [x] **Second Hand High Poker**
  - JSON: [second-hand-high.json](../src/processed-games/second-hand-high.json)
  - URLs: https://www.pagat.com/poker/variants/7stud.html#second | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-seven-card-stud.html, wiki-poker.html)

- 812 : [x] **Sedma | Sedma osmovÃ¡**
  - JSON: [sedma.json](../src/processed-games/sedma.json)
  - URLs: https://www.pagat.com/beating/sedma.html | https://en.wikipedia.org/wiki/Durak | https://www.pagat.com/beating/sedma.html#osmova
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 813 : [x] **Sedma Dominoes**
  - JSON: [sedma-dominoes.json](../src/processed-games/sedma-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/sedma.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 814 : [x] **Sedmice | Å uster**
  - JSON: [sedmice.json](../src/processed-games/sedmice.json)
  - URLs: https://www.pagat.com/beating/sedmice.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 815 : [x] **Seep | Sip | Sweep**
  - JSON: [seep.json](../src/processed-games/seep.json)
  - URLs: https://www.pagat.com/fishing/seep.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-seep.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 816 : [x] **Selection / Rejection Poker | Want it? Want it? Got it! Poker**
  - JSON: [selection-rejection.json](../src/processed-games/selection-rejection.json)
  - URLs: https://www.pagat.com/poker/variants/selection.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 817 : [x] **Seotda**
  - JSON: [seotda.json](../src/processed-games/seotda.json)
  - URLs: https://www.fismelab.org/seotdala-seotda/
  - Local HTML: âœ“ (fismelab-seotda.html)

- 818 : [x] **Sequence Poker**
  - JSON: [sequence-poker.json](../src/processed-games/sequence-poker.json)
  - URLs: https://www.pagat.com/poker/variants/sequence.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 819 : [x] **Sergeant Major | 3-5-8 | Three Five Eight**
  - JSON: [sergeant-major.json](../src/processed-games/sergeant-major.json)
  - URLs: https://www.pagat.com/whist/sergeant_major.html | https://en.wikipedia.org/wiki/Whist | https://en.wikipedia.org/wiki/Sergeant_major_(card_game)
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 820 : [x] **Sette e Mezzo | 7Â½ | Sete e Meio | Seven and a Half | Siete y Media**
  - JSON: [sette-e-mezzo.json](../src/processed-games/sette-e-mezzo.json)
  - URLs: https://www.pagat.com/banking/sevenhalf.html
  - Local HTML: âœ“ (pagat-sette-e-mezzo.html, wiki-sette-e-mezzo.html)

- 821 : [x] **Seven Bridge | 7 Bridge | Mah Jan Bridge | Seven Rummy**
  - JSON: [seven-bridge.json](../src/processed-games/seven-bridge.json)
  - URLs: https://www.pagat.com/auctionwhist/seven_bridge.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 822 : [x] **Seven Card Stud Poker | 7 Card Stud Poker | Stud Poker**
  - JSON: [seven-card-stud.json](../src/processed-games/seven-card-stud.json)
  - URLs: https://www.pagat.com/poker/variants/7stud.html | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/stud.html
  - Local HTML: âœ“ (pagat-seven-card-stud.html, pagat-stud.html, wiki-poker.html)

- 823 : [x] **Seven Rocks**
  - JSON: [seven-rocks.json](../src/processed-games/seven-rocks.json)
  - URLs: https://www.pagat.com/domino/line/seven_rocks.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 824 : [x] **Seven Twenty-Seven | 7-27**
  - JSON: [seven-twenty-seven.json](../src/processed-games/seven-twenty-seven.json)
  - URLs: https://www.pagat.com/showdown/727.html | https://www.pagat.com/poker/rules/ | https://web.archive.org/web/20130512064644/gamereport.com/poker/nonpoker.html
  - Local HTML: âœ“ (pagat-7-27.html)

- 825 : [x] **Seven-Toed Pete Race Horse | 7-Toed Pete Race Horse**
  - JSON: [seven-toed-pete-race-horse.json](../src/processed-games/seven-toed-pete-race-horse.json)
  - URLs: https://www.pagat.com/domino/race/seven_toed_pete.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 826 : [x] **Sevens Dominoes**
  - JSON: [sevens-dominoes.json](../src/processed-games/sevens-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/sevens.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 827 : [x] **Shanghai**
  - JSON: [shanghai-rummy.json](../src/processed-games/shanghai-rummy.json)
  - URLs: https://www.pagat.com/rummy/shanghai.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 828 : [x] **Sheepshead**
  - JSON: [sheepshead.json](../src/processed-games/sheepshead.json)
  - URLs: https://www.pagat.com/schafkopf/sheepshead.html | https://en.wikipedia.org/wiki/Schafkopf | https://en.wikipedia.org/wiki/Sheepshead_(card_game)
  - Local HTML: âœ“ (wiki-schafkopf-3.html, wiki-schafkopf.html, wiki-sheepshead-2.html)

- 829 : [x] **Sheng Ji**
  - JSON: [sheng-ji.json](../src/processed-games/sheng-ji.json)
  - URLs: https://en.wikipedia.org/wiki/Sheng_ji
  - Local HTML: âœ“ (wiki-tractor-2.html, wiki-tractor.html)

- 830 : [x] **Shichi Narabe**
  - JSON: [shichi-narabe.json](../src/processed-games/shichi-narabe.json)
  - URLs: https://www.pagat.com/layout/shichi_narabe.html
  - Local HTML: âœ“ (pagat-shichinarabe.html)

- 831 : [x] **Shithead | 10-2 Slide | Karma | Palace | Smeghead | Snitch'ems | Ten-Two Slide**
  - JSON: [shithead.json](../src/processed-games/shithead.json)
  - URLs: https://www.pagat.com/compendium/shithead.html | https://en.wikipedia.org/wiki/Shithead_(card_game) | https://www.pagat.com/compendium/shithead.html#snitchems
  - Local HTML: âœ“ (wiki-shithead-2.html, wiki-shithead.html)

- 832 : [x] **Shoot**
  - JSON: [shoot.json](../src/processed-games/shoot.json)
  - URLs: https://www.pagat.com/banking/shoot.html | https://www.pagat.com/banking/reddog.html#shoot
  - Local HTML: âœ“ (pagat-reddog.html)

- 833 : [x] **SÃ¬ SÃ¨ PÃ¡i å››è‰²ç‰Œ | Tá»© Sáº¯c**
  - JSON: [si-se-pai.json](../src/processed-games/si-se-pai.json)
  - URLs: https://www.pagat.com/tricktaking/sise_pai.html
  - Local HTML: âœ“ (pagat-bonanza.html, pagat-domino-paigow.html, pagat-paigowp.html, pagat-paiute.html, pagat-si-se-pai.html, wiki-pai-gow-poker.html, wiki-pai-gow.html)

- 834 : [x] **Sidi Barrani Jass**
  - JSON: [sidi-barrani.json](../src/processed-games/sidi-barrani.json)
  - URLs: https://www.pagat.com/jass/sidi_barrani.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-sidi-barrani.html, wiki-jass-3.html, wiki-jass.html)

- 835 : [x] **Simultaneous Solitaire**
  - JSON: [simultaneous-solitaire.json](../src/processed-games/simultaneous-solitaire.json)
  - URLs: https://www.pagat.com/patience/simultaneous.html | https://en.wikipedia.org/wiki/Patience_(game)
  - Local HTML: âœ“ (wiki-patience.html)

- 836 : [x] **Sink-Sink**
  - JSON: [sink-sink.json](../src/processed-games/sink-sink.json)
  - URLs: https://www.pagat.com/fishing/sink_sink.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 837 : [x] **Siwweschr M Eifel Poker**
  - JSON: [siwweschr-m-eifel-poker.json](../src/processed-games/siwweschr-m-eifel-poker.json)
  - URLs: https://www.pagat.com/last/toepen.html#eifel | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-toepen.html, wiki-poker.html)

- 838 : [x] **Six-Bid Solo | 6-Bid Solo | Solo German | Solo Six-Bid**
  - JSON: [solo.json](../src/processed-games/solo.json)
  - URLs: https://www.pagat.com/lhombre/solo.html#sixbid | https://en.wikipedia.org/wiki/Ombre | https://www.pagat.com/lhombre/solo.html
  - Local HTML: âœ“ (pagat-lhombre-solo.html, wiki-ombre-2.html, wiki-ombre.html)

- 839 : [x] **Sixty-Three**
  - JSON: [sixty-three.json](../src/processed-games/sixty-three.json)
  - URLs: https://www.pagat.com/jass/63.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 840 : [x] **Sjavs**
  - JSON: [sjavs.json](../src/processed-games/sjavs.json)
  - URLs: https://www.pagat.com/beating/sjavs.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 841 : [x] **Skat**
  - JSON: [skat.json](../src/processed-games/skat.json)
  - URLs: https://www.pagat.com/skat/skat.html | https://en.wikipedia.org/wiki/Skat_(card_game)
  - Local HTML: âœ“ (wiki-skat.html)

- 842 : [x] **Skin**
  - JSON: [skin.json](../src/processed-games/skin.json)
  - URLs: https://www.pagat.com/beating/skin.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 843 : [x] **Skitgubbe | Mas | MjÃ¶lnarmatte**
  - JSON: [skitgubbe.json](../src/processed-games/skitgubbe.json)
  - URLs: https://www.pagat.com/beating/skitgubbe.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-skitgubbe.html, wiki-durak-3.html, wiki-durak.html)

- 844 : [x] **Skruuvi**
  - JSON: [skruuvi.json](../src/processed-games/skruuvi.json)
  - URLs: https://www.pagat.com/beating/skruuvi.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 845 : [x] **Slabberjan**
  - JSON: [slabberjan.json](../src/processed-games/slabberjan.json)
  - URLs: https://www.pagat.com/jass/slabberjan.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 846 : [x] **Slapjack**
  - JSON: [slapjack.json](../src/processed-games/slapjack.json)
  - URLs: https://www.pagat.com/war/slapjack.html | https://en.wikipedia.org/wiki/War_(card_game) | https://en.wikipedia.org/wiki/Slapjack
  - Local HTML: âœ“ (pagat-slapjack.html, wiki-slapjack.html, wiki-war-3.html, wiki-war.html)

- 847 : [x] **Slippery Sam | Six-spot Red Dog**
  - JSON: [slippery-sam.json](../src/processed-games/slippery-sam.json)
  - URLs: https://www.pagat.com/banking/red_dog.html#slippery | https://www.pagat.com/banking/reddog.html#slippery-sam
  - Local HTML: âœ“ (pagat-reddog.html)

- 848 : [x] **Slosh**
  - JSON: [slosh.json](../src/processed-games/slosh.json)
  - URLs: https://www.pagat.com/beating/slosh.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 849 : [x] **Smear | Schmier**
  - JSON: [smear.json](../src/processed-games/smear.json)
  - URLs: https://www.pagat.com/auctionwhist/smear.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 850 : [x] **Snap | Irish Snap**
  - JSON: [snap.json](../src/processed-games/snap.json)
  - URLs: https://www.pagat.com/war/snap.html#irish | https://en.wikipedia.org/wiki/Snap_(card_game) | https://www.pagat.com/war/snap.html
  - Local HTML: âœ“ (pagat-snap.html, wiki-snap-3.html, wiki-snap.html)

- 851 : [x] **Sniff**
  - JSON: [sniff.json](../src/processed-games/sniff.json)
  - URLs: https://www.pagat.com/draw/sniff.html
  - Local HTML: âœ“ (pagat-sniff.html)

- 852 : [x] **Snoozer**
  - JSON: [dom-pedro.json](../src/processed-games/dom-pedro.json)
  - URLs: https://www.pagat.com/kt5/rook.html#dom | https://en.wikipedia.org/wiki/Tractor_(card_game)
  - Local HTML: âœ“ (pagat-rook.html, wiki-tractor.html)

- 853 : [x] **Soko**
  - JSON: [soko.json](../src/processed-games/soko.json)
  - URLs: https://www.pagat.com/poker/variants/5stud.html#soko
  - Local HTML: âœ“ (pagat-five-card-stud.html)

- 854 : [x] **Solo Crazy**
  - JSON: [solo-crazy.json](../src/processed-games/solo-crazy.json)
  - URLs: https://www.pagat.com/aceten/solo.html | https://en.wikipedia.org/wiki/Tressette
  - Local HTML: âœ“ (pagat-solo.html, wiki-tressette-2.html, wiki-tressette.html)

- 855 : [x] **Solo German**
  - JSON: [solo-german.json](../src/processed-games/solo-german.json)
  - URLs: https://www.pagat.com/ombre/gsolorules.html
  - Local HTML: âœ“ (pagat-lhombre-solo.html, wiki-german-solo.html)

- 856 : [x] **Solo Whist**
  - JSON: [solo-whist.json](../src/processed-games/solo-whist.json)
  - URLs: https://www.pagat.com/whist/solo_whist.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 857 : [x] **Spades**
  - JSON: [spades.json](../src/processed-games/spades.json)
  - URLs: https://www.pagat.com/whist/spades.html | https://en.wikipedia.org/wiki/Whist | https://en.wikipedia.org/wiki/Spades_(card_game)
  - Local HTML: âœ“ (wiki-spades.html, wiki-whist-4.html, wiki-whist.html)

- 858 : [x] **Spades Partnership**
  - JSON: [spades-partnership.json](../src/processed-games/spades-partnership.json)
  - URLs: https://www.pagat.com/auction/spades_var.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 859 : [x] **Spanish 21**
  - JSON: [spanish-21.json](../src/processed-games/spanish-21.json)
  - URLs: https://wizardofodds.com/games/spanish-21/
  - Local HTML: âœ“ (wizardofodds-spanish-21.html)

- 860 : [x] **Spar**
  - JSON: [spar.json](../src/processed-games/spar.json)
  - URLs: https://www.pagat.com/beating/spar.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 861 : [x] **Speculation**
  - JSON: [speculation.json](../src/processed-games/speculation.json)
  - URLs: https://www.pagat.com/banking/speculation.html
  - Local HTML: âœ“ (pagat-speculation.html)

- 862 : [x] **Speed | California Speed | Frustration Speed**
  - JSON: [speed.json](../src/processed-games/speed.json)
  - URLs: https://www.pagat.com/patience/california_speed.html | https://en.wikipedia.org/wiki/Speed_(card_game) | https://www.pagat.com/patience/california_speed.html#frustration
  - Local HTML: âœ“ (pagat-california-speed.html, wiki-speed-2.html, wiki-speed-4.html, wiki-speed.html)

- 863 : [x] **Spider**
  - JSON: [spider.json](../src/processed-games/spider.json)
  - URLs: https://www.pagat.com/patience/spider.html | https://en.wikipedia.org/wiki/Spider_(solitaire)
  - Local HTML: âœ“ (wiki-spider.html)

- 864 : [x] **Spit**
  - JSON: [spit.json](../src/processed-games/spit.json)
  - URLs: https://www.pagat.com/patience/spit.html | https://en.wikipedia.org/wiki/Spit_(card_game)
  - Local HTML: âœ“ (pagat-spit.html, wiki-spit-2.html, wiki-spit.html)

- 865 : [x] **Spit in the Ocean Poker**
  - JSON: [spit-in-the-ocean.json](../src/processed-games/spit-in-the-ocean.json)
  - URLs: https://www.pagat.com/poker/variants/spit.html | https://en.wikipedia.org/wiki/Spit_(card_game)
  - Local HTML: âœ“ (wiki-spit-2.html, wiki-spit.html)

- 866 : [x] **Spite and Malice | Cat and Mouse**
  - JSON: [spite-and-malice.json](../src/processed-games/spite-and-malice.json)
  - URLs: https://www.pagat.com/patience/spitemal.html | https://en.wikipedia.org/wiki/Spit_(card_game) | https://en.wikipedia.org/wiki/Spite_and_malice
  - Local HTML: âœ“ (pagat-spitemal.html, wiki-spit-2.html, wiki-spit.html, wiki-spite-and-malice.html)

- 867 : [x] **Spitzer**
  - JSON: [spitzer.json](../src/processed-games/spitzer.json)
  - URLs: https://www.pagat.com/jass/spitzer.html | https://en.wikipedia.org/wiki/Spit_(card_game)
  - Local HTML: âœ“ (wiki-spit-2.html, wiki-spit.html)

- 868 : [x] **Spizzichino | Pizzichino | Tressette in Due**
  - JSON: [spizzichino.json](../src/processed-games/spizzichino.json)
  - URLs: https://www.pagat.com/fishing/spizzichino.html | https://en.wikipedia.org/wiki/Scopa | https://en.wikipedia.org/wiki/Tressette
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html, wiki-tressette-2.html, wiki-tressette.html)

- 869 : [x] **Spoons**
  - JSON: [spoons.json](../src/processed-games/spoons.json)
  - URLs: https://www.pagat.com/passing/spoons.html
  - Local HTML: âœ“ (pagat-passing-pig.html, pagat-spoons.html)

- 870 : [x] **Spot**
  - JSON: [spot.json](../src/processed-games/spot.json)
  - URLs: https://www.pagat.com/draw/spot.html
  - Local HTML: âœ“ (pagat-spot.html)

- 871 : [x] **Spot Hearts**
  - JSON: [hearts-spot.json](../src/processed-games/hearts-spot.json)
  - URLs: https://www.pagat.com/reverse/hearts.html#spot | https://en.wikipedia.org/wiki/Hearts_(card_game)
  - Local HTML: âœ“ (pagat-hearts.html, wiki-hearts-3.html, wiki-hearts.html)

- 872 : [x] **Staekske Rape**
  - JSON: [staekske-rape.json](../src/processed-games/staekske-rape.json)
  - URLs: https://www.pagat.com/last/staekske_rape.html | https://en.wikipedia.org/wiki/Last_Card
  - Local HTML: âœ“ (pagat-staekske-rape.html)

- 873 : [x] **Steal War**
  - JSON: [steal-war.json](../src/processed-games/steal-war.json)
  - URLs: https://www.pagat.com/war/steal_war.html | https://en.wikipedia.org/wiki/War_(card_game)
  - Local HTML: âœ“ (wiki-war-3.html, wiki-war.html)

- 874 : [x] **Stealing Bundles | Steal Pile**
  - JSON: [stealing-bundles.json](../src/processed-games/stealing-bundles.json)
  - URLs: https://www.pagat.com/rummy/stealing_bundles.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 875 : [x] **Stop the Bus**
  - JSON: [stop-the-bus.json](../src/processed-games/stop-the-bus.json)
  - URLs: https://www.pagat.com/draw/stop_the_bus.html
  - Local HTML: âœ“ (pagat-stop-the-bus.html)

- 876 : [x] **Stortok | Kjempetosk**
  - JSON: [stortok.json](../src/processed-games/stortok.json)
  - URLs: https://www.pagat.com/trumps/stortok.html
  - Local HTML: âœ“ (pagat-stortok.html)

- 877 : [x] **Stovkahra | BrÄko**
  - JSON: [stovkahra.json](../src/processed-games/stovkahra.json)
  - URLs: https://www.pagat.com/trappola/stovkahra.html | https://en.wikipedia.org/wiki/Trappola
  - Local HTML: âœ“ (pagat-stovkahra.html, wiki-trappola-2.html, wiki-trappola.html)

- 878 : [x] **Strafperlaggen**
  - JSON: [strafperlaggen.json](../src/processed-games/strafperlaggen.json)
  - URLs: https://www.pagat.com/tarot/strafperlaggen.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 879 : [x] **Streets And Alleys**
  - JSON: [streets-and-alleys.json](../src/processed-games/streets-and-alleys.json)
  - URLs: https://www.semicolon.com/Solitaire/Rules/StreetsAndAlleys.html
  - Local HTML: âœ“ (semicolon-streets-and-alleys.html)

- 880 : [x] **Strip Poker**
  - JSON: [strip-poker.json](../src/processed-games/strip-poker.json)
  - URLs: https://www.pagat.com/poker/variants/strip.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 881 : [x] **StÃ½rivolt**
  - JSON: [styrivolt.json](../src/processed-games/styrivolt.json)
  - URLs: https://www.pagat.com/beating/styrivolt.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 882 : [x] **Sueca | Sueca Italiana**
  - JSON: [sueca.json](../src/processed-games/sueca.json)
  - URLs: https://www.pagat.com/aceten/sueca.html | https://en.wikipedia.org/wiki/Tressette | https://www.pagat.com/aceten/sueca.html#italiana | https://en.wikipedia.org/wiki/Sueca_(card_game)
  - Local HTML: âœ“ (pagat-sueca.html, wiki-tressette-2.html, wiki-tressette.html)

- 883 : [x] **Sviten Special | Celestial Poker**
  - JSON: [sviten-special.json](../src/processed-games/sviten-special.json)
  - URLs: https://www.pagat.com/poker/variants/sviten.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-sviten.html, wiki-poker.html)

- 884 : [x] **Svoi Kozyri | Besikovich's Game | Challenge | Svoi Kozyri Besikovich | Vsyak Svoi Kozyri**
  - JSON: [svoi-kozyri.json](../src/processed-games/svoi-kozyri.json)
  - URLs: https://www.pagat.com/beating/svoi_kozyri.html#besikovich | https://en.wikipedia.org/wiki/Durak | https://www.pagat.com/beating/svoi_kozyri.html
  - Local HTML: âœ“ (pagat-svoi-kozyri.html, wiki-durak-3.html, wiki-durak.html)

- 885 : [x] **Sweet Chariot Poker**
  - JSON: [sweet-chariot.json](../src/processed-games/sweet-chariot.json)
  - URLs: https://www.pagat.com/poker/variants/sweetchariot.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 886 : [x] **Swingo Poker**
  - JSON: [swingo.json](../src/processed-games/swingo.json)
  - URLs: https://www.pagat.com/poker/variants/swingo.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-swingo.html, wiki-poker.html)

- 887 : [x] **Swoop | Swipe | Swish | Swoosh**
  - JSON: [swoop.json](../src/processed-games/swoop.json)
  - URLs: https://www.pagat.com/patience/swoop.html | https://en.wikipedia.org/wiki/Patience_(game)
  - Local HTML: âœ“ (wiki-patience.html)

### T

- 888 : [ ] **Ta Gou Ta Doi æ­ä¹æ­å¯¹**
  - JSON: [ta-gou-ta-doi.json](../src/processed-games/ta-gou-ta-doi.json)
  - URLs: https://www.pagat.com/domino/line/ta_gou_ta_doi.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 889 : [ ] **TabliÄ‡ | Tabinet**
  - JSON: [tabli.json](../src/processed-games/tabli.json)
  - URLs: https://www.pagat.com/domino/line/tablic.html | https://en.wikipedia.org/wiki/Dominoes | https://en.wikipedia.org/wiki/TabliÄ‡
  - Local HTML: âœ“ (wiki-dominoes.html)

- 890 : [ ] **Tahiti**
  - JSON: [tahiti.json](../src/processed-games/tahiti.json)
  - URLs: https://www.pagat.com/rummy/tahiti.html | https://en.wikipedia.org/wiki/Rummy | https://en.wikipedia.org/wiki/Big_Two
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 891 : [ ] **Tahoe Poker | Wichita Hold'em Poker**
  - JSON: [tahoe.json](../src/processed-games/tahoe.json)
  - URLs: https://www.pagat.com/poker/variants/tahoe.html | https://en.wikipedia.org/wiki/Poker | https://poker.fandom.com/wiki/Tahoe
  - Local HTML: âœ“ (wiki-poker.html)

- 892 : [ ] **TÃ ihÃ© A BÄo æ³°å’ŒAåŒ…**
  - JSON: [taihe-a-bao.json](../src/processed-games/taihe-a-bao.json)
  - URLs: https://www.pagat.com/domino/partition/taihe_abao.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 893 : [ ] **Tapp Tarock**
  - JSON: [tapp-tarock.json](../src/processed-games/tapp-tarock.json)
  - URLs: https://www.pagat.com/tarot/tapp.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 894 : [ ] **Tarneeb**
  - JSON: [tarneeb.json](../src/processed-games/tarneeb.json)
  - URLs: https://www.pagat.com/whist/tarneeb.html | https://en.wikipedia.org/wiki/Whist | https://en.wikipedia.org/wiki/Tarneeb
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 895 : [ ] **Tarocchi Sicilian**
  - JSON: [tarocchi-sicilian.json](../src/processed-games/tarocchi-sicilian.json)
  - URLs: https://www.pagat.com/tarot/tarocchi_sicilian.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 896 : [ ] **Tarock KÃ¶nigrufen: Austrian**
  - JSON: [tarock-k-nigrufen-austrian.json](../src/processed-games/tarock-k-nigrufen-austrian.json)
  - URLs: https://www.pagat.com/tarot/koenigrufen.html | https://en.wikipedia.org/wiki/Tarot | https://www.pagat.com/tarot/konigrup.html
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 897 : [ ] **Tarock Lungau KÃ¶nigrufen**
  - JSON: [tarock-lungau-k-nigrufen.json](../src/processed-games/tarock-lungau-k-nigrufen.json)
  - URLs: https://www.pagat.com/tarot/koenigrufen.html#lungau | https://en.wikipedia.org/wiki/Tarot | https://www.pagat.com/tarot/lungau.html
  - Local HTML: âœ“ (pagat-lungau.html, wiki-tarot-2.html, wiki-tarot.html)

- 898 : [ ] **Tarock Stubaital**
  - JSON: [droggn.json](../src/processed-games/droggn.json)
  - URLs: https://www.pagat.com/tarot/stubtar.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (pagat-stubtar.html, wiki-tarot-2.html, wiki-tarot.html)

- 899 : [ ] **Tarock TÃ¼bingen**
  - JSON: [tarock-t-bingen.json](../src/processed-games/tarock-t-bingen.json)
  - URLs: https://www.pagat.com/tarot/tuebingen.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (pagat-tuebingen.html, wiki-tarot-2.html, wiki-tarot.html)

- 900 : [ ] **Tarok Danish**
  - JSON: [tarok-danish.json](../src/processed-games/tarok-danish.json)
  - URLs: https://www.pagat.com/tarot/tarok_danish.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 901 : [ ] **Tarok Romanian**
  - JSON: [tarok-romanian.json](../src/processed-games/tarok-romanian.json)
  - URLs: https://www.pagat.com/tarot/tarok_romanian.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 902 : [ ] **Tarok Slovenian**
  - JSON: [tarok-slovenian.json](../src/processed-games/tarok-slovenian.json)
  - URLs: https://www.pagat.com/tarot/tarok_slovenian.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 903 : [ ] **Taroki Polish, call king**
  - JSON: [taroki-polish-call-king.json](../src/processed-games/taroki-polish-call-king.json)
  - URLs: https://www.pagat.com/tarot/taroki.html#king | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 904 : [ ] **Taroki Polish, call XIX**
  - JSON: [taroki-polish-call-xix.json](../src/processed-games/taroki-polish-call-xix.json)
  - URLs: https://www.pagat.com/tarot/taroki.html#xix | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 905 : [ ] **Tarokk Hungarian**
  - JSON: [tarokk-hungarian.json](../src/processed-games/tarokk-hungarian.json)
  - URLs: https://www.pagat.com/tarot/hungarian.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 906 : [ ] **Taroky Czech**
  - JSON: [taroky-czech.json](../src/processed-games/taroky-czech.json)
  - URLs: https://www.pagat.com/tarot/taroky_czech.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 907 : [ ] **Taroky Nebraska**
  - JSON: [taroky-nebraska.json](../src/processed-games/taroky-nebraska.json)
  - URLs: https://www.pagat.com/tarot/taroky_nebraska.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 908 : [ ] **Tarot ChambÃ©ry 1902**
  - JSON: [tarot-chambery.json](../src/processed-games/tarot-chambery.json)
  - URLs: https://www.pagat.com/tarot/chambery.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (pagat-chambery.html, wiki-tarot-2.html, wiki-tarot.html)

- 909 : [ ] **Tarot French**
  - JSON: [tarot.json](../src/processed-games/tarot.json)
  - URLs: https://www.pagat.com/tarot/french.html | https://en.wikipedia.org/wiki/Tarot | https://en.wikipedia.org/wiki/Tarot_card_games
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 910 : [ ] **Tarot of the AbbÃ© de Marolles 1637**
  - JSON: [tarot-marolles.json](../src/processed-games/tarot-marolles.json)
  - URLs: https://www.pagat.com/tarot/marolles.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (pagat-marolles.html, wiki-tarot-2.html, wiki-tarot.html)

- 911 : [ ] **Tartli | FelsÅ‘s**
  - JSON: [tartli.json](../src/processed-games/tartli.json)
  - URLs: https://www.pagat.com/jass/tartli.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (pagat-tartli.html, wiki-jass-3.html, wiki-jass.html)

- 912 : [ ] **Tau Ngau**
  - JSON: [tau-ngau.json](../src/processed-games/tau-ngau.json)
  - URLs: https://www.pagat.com/domino/partition/taungau.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 913 : [ ] **Tausendeins | 1001**
  - JSON: [tausendeins.json](../src/processed-games/tausendeins.json)
  - URLs: https://www.pagat.com/adders/tausendeins.html | https://en.wikipedia.org/wiki/Cribbage
  - Local HTML: âœ“ (wiki-cribbage-3.html, wiki-cribbage.html)

- 914 : [ ] **Teen Do Panch**
  - JSON: [teen-do-panch.json](../src/processed-games/teen-do-panch.json)
  - URLs: https://www.pagat.com/fishing/teen_do_panch.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 915 : [ ] **Teka**
  - JSON: [teka.json](../src/processed-games/teka.json)
  - URLs: https://www.pagat.com/fishing/teka.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 916 : [ ] **Telefunken | Farmers' Rummy**
  - JSON: [telefunken.json](../src/processed-games/telefunken.json)
  - URLs: https://www.pagat.com/rummy/telefunken.html#farmers | https://en.wikipedia.org/wiki/Rummy | https://www.pagat.com/rummy/telefunken.html
  - Local HTML: âœ“ (pagat-telefunken.html, wiki-rummy-4.html, wiki-rummy.html)

- 917 : [ ] **Telesina**
  - JSON: [telesina.json](../src/processed-games/telesina.json)
  - URLs: https://www.pagat.com/fishing/telesina.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 918 : [ ] **Ten-Card Regrets Poker | 10 Card Regrets Poker | 7 Card Regrets Poker | Seven-card Regrets Poker**
  - JSON: [ten-card-regrets-poker.json](../src/processed-games/ten-card-regrets-poker.json)
  - URLs: https://www.pagat.com/poker/variants/regrets.html#seven | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/regrets.html#ten
  - Local HTML: âœ“ (wiki-poker.html)

- 919 : [ ] **Terrace**
  - JSON: [terrace.json](../src/processed-games/terrace.json)
  - URLs: https://www.semicolon.com/Solitaire/Rules/Terrace.html
  - Local HTML: âœ“ (semicolon-terrace.html)

- 920 : [ ] **Texas 42 | 42 | Forty-Two**
  - JSON: [texas-42.json](../src/processed-games/texas-42.json)
  - URLs: https://www.pagat.com/domino/trick/42.html | https://en.wikipedia.org/wiki/Texas_42
  - Local HTML: âœ“ (pagat-domino-42-texas.html, wiki-texas-42.html)

- 921 : [ ] **Texas 88 | 88**
  - JSON: [texas-88.json](../src/processed-games/texas-88.json)
  - URLs: https://www.pagat.com/domino/trick/texas88.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-texas88.html, wiki-dominoes.html)

- 922 : [ ] **The Great Dalmuti**
  - JSON: [the-great-dalmuti.json](../src/processed-games/the-great-dalmuti.json)
  - URLs: https://www.pagat.com/climbing/president.html
  - Local HTML: âœ“ (pagat-climbing-president.html)

- 923 : [ ] **Thirteen | Tiáº¿n LÃªn | Viet Cong**
  - JSON: [tien-len.json](../src/processed-games/tien-len.json)
  - URLs: https://www.pagat.com/climbing/tien_len.html | https://en.wikipedia.org/wiki/Ti%E1%BA%BFn_l%C3%Aan | https://en.wikipedia.org/wiki/TiÃ¡ÂºÂ¿n_lÃƒÂªn
  - Local HTML: âœ“ (pagat-rummy-3-13.html, pagat-thirteen.html, wiki-three-thirteen.html, wiki-tien-len.html, wiki-tin-ln.html)

- 924 : [ ] **Thirty-One Greek | 31 Greek**
  - JSON: [thirty-one-greek.json](../src/processed-games/thirty-one-greek.json)
  - URLs: https://www.pagat.com/showdown/31_greek.html
  - Local HTML: âœ“ (pagat-banking-31-card.html)

- 925 : [ ] **Three card Brag | Brag 3 card | Flush | Teen Patti**
  - JSON: [three-card-brag.json](../src/processed-games/three-card-brag.json)
  - URLs: https://www.pagat.com/vying/brag.html | https://www.pagat.com/vying/teen_patti.html | https://en.wikipedia.org/wiki/Teen_patti
  - Local HTML: âœ“ (pagat-teen-patti.html, pagat-vying-brag.html, wiki-teen-patti.html)

- 926 : [ ] **Three Card Monte | Bonneteau | Find the Lady**
  - JSON: [three-card-monte.json](../src/processed-games/three-card-monte.json)
  - URLs: https://www.pagat.com/misc/monte.html | https://en.wikipedia.org/wiki/Three-card_monte
  - Local HTML: âœ“ (pagat-monte.html, wiki-three-card-monte-2.html, wiki-three-card-monte.html)

- 927 : [ ] **Three Card Poker**
  - JSON: [three-card-poker.json](../src/processed-games/three-card-poker.json)
  - URLs: https://www.pagat.com/banking/three_card.html
  - Local HTML: âœ“ (pagat-three-card-poker.html)

- 928 : [ ] **Three Nought Four**
  - JSON: [three-nought-four.json](../src/processed-games/three-nought-four.json)
  - URLs: https://www.pagat.com/beating/304.html | https://en.wikipedia.org/wiki/Durak | https://en.wikipedia.org/wiki/304_(card_game)
  - Local HTML: âœ“ (wiki-304.html, wiki-durak-3.html, wiki-durak.html)

- 929 : [ ] **Thunee South African**
  - JSON: [thunee-south-african.json](../src/processed-games/thunee-south-african.json)
  - URLs: https://www.pagat.com/fishing/thunee.html | https://en.wikipedia.org/wiki/Scopa | https://playthunee.com/
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 930 : [ ] **Thuni Nigerian**
  - JSON: [thuni-nigerian.json](../src/processed-games/thuni-nigerian.json)
  - URLs: https://www.pagat.com/fishing/thuni.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 931 : [ ] **Tiddly-Wink American**
  - JSON: [tiddly-wink-american.json](../src/processed-games/tiddly-wink-american.json)
  - URLs: https://www.pagat.com/stops/tiddlywink.html#american | https://en.wikipedia.org/wiki/Michigan_(card_game) | https://www.pagat.com/stops/michigan.html
  - Local HTML: âœ“ (pagat-michigan.html, wiki-michigan.html)

- 932 : [ ] **Tiddly-Wink British**
  - JSON: [tiddly-wink-british.json](../src/processed-games/tiddly-wink-british.json)
  - URLs: https://www.pagat.com/stops/tiddlywink.html | https://en.wikipedia.org/wiki/Michigan_(card_game) | https://www.pagat.com/domino/line/tiddlywink.html
  - Local HTML: âœ“ (pagat-tiddlywink.html, wiki-michigan.html)

- 933 : [ ] **Tien Gow å¤©ä¹ | Heaven Nine | Sky Nine | Tian Jiu å¤©ä¹**
  - JSON: [tien-gow.json](../src/processed-games/tien-gow.json)
  - URLs: https://www.pagat.com/domino/partition/tiengow.html | https://en.wikipedia.org/wiki/Dominoes | https://en.wikipedia.org/wiki/Tien_Gow
  - Local HTML: âœ“ (wiki-dominoes.html)

- 934 : [ ] **Tile Matching Solitaire**
  - JSON: [tile-matching-solitaire.json](../src/processed-games/tile-matching-solitaire.json)
  - URLs: https://www.pagat.com/domino/solitaire/tile_matching.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 935 : [ ] **Tile Rummy Romanian**
  - JSON: [tile-rummy.json](../src/processed-games/tile-rummy.json)
  - URLs: https://www.pagat.com/rummy/tile_rummy.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 936 : [ ] **Tiu-U é‡£é­š**
  - JSON: [tiu-u.json](../src/processed-games/tiu-u.json)
  - URLs: https://www.pagat.com/fishing/tiu_u.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 937 : [ ] **Tjuv | Tattare**
  - JSON: [tjuv.json](../src/processed-games/tjuv.json)
  - URLs: https://www.pagat.com/beating/tjuv.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 938 : [ ] **Tod und Leben Life and Death**
  - JSON: [tod-und-leben-life-and-death.json](../src/processed-games/tod-und-leben-life-and-death.json)
  - URLs: https://www.pagat.com/beating/tod_und_leben.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 939 : [ ] **Toepen**
  - JSON: [toepen.json](../src/processed-games/toepen.json)
  - URLs: https://www.pagat.com/last/toepen.html | https://en.wikipedia.org/wiki/Last_Card | https://nl.wikipedia.org/wiki/Toepen
  - Local HTML: âœ“ (pagat-toepen.html)

- 940 : [ ] **Tong Its**
  - JSON: [tong-its.json](../src/processed-games/tong-its.json)
  - URLs: https://www.pagat.com/rummy/tongits.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 941 : [ ] **Tonk | Tunk**
  - JSON: [tonk.json](../src/processed-games/tonk.json)
  - URLs: https://www.pagat.com/rummy/tonk.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-tonk.html, wiki-rummy-4.html, wiki-rummy.html)

- 942 : [ ] **Top Trumps**
  - JSON: [top-trumps.json](../src/processed-games/top-trumps.json)
  - URLs: https://www.pagat.com/quartet/top_trumps.html | https://en.wikipedia.org/wiki/Happy_Families
  - Local HTML: âœ“ (wiki-happy-families.html)

- 943 : [ ] **Toruro**
  - JSON: [toruro.json](../src/processed-games/toruro.json)
  - URLs: https://www.pagat.com/fishing/toruro.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 944 : [ ] **Tractor æ‹–æ‹‰æœº | BÄ ShÃ­ FÄ“n å…«ååˆ† | TuÅ LÄ JÄ« æ‹–æ‹‰æœº**
  - JSON: [tractor.json](../src/processed-games/tractor.json)
  - URLs: https://www.pagat.com/kt5/tractor.html | https://en.wikipedia.org/wiki/Tractor_(card_game) | https://en.wikipedia.org/wiki/Sheng_ji
  - Local HTML: âœ“ (pagat-tractor.html, wiki-tractor-2.html, wiki-tractor.html)

- 945 : [ ] **Trains**
  - JSON: [trains.json](../src/processed-games/trains.json)
  - URLs: https://www.pagat.com/domino/tree/trains.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 946 : [ ] **Traversone | Kifameno | Perdivinci | Rovescino | Tressette a non Prendere | Vinciperde**
  - JSON: [traversone.json](../src/processed-games/traversone.json)
  - URLs: https://www.pagat.com/fishing/traversone.html | https://en.wikipedia.org/wiki/Scopa | https://en.wikipedia.org/wiki/Tressette
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html, wiki-tressette-2.html, wiki-tressette.html)

- 947 : [ ] **Trees Poker**
  - JSON: [trees-poker.json](../src/processed-games/trees-poker.json)
  - URLs: https://www.pagat.com/poker/variants/trees.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 948 : [ ] **Treikort**
  - JSON: [treikort.json](../src/processed-games/treikort.json)
  - URLs: https://www.pagat.com/beating/treikort.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 949 : [ ] **Tres y Dos**
  - JSON: [tres-y-dos.json](../src/processed-games/tres-y-dos.json)
  - URLs: https://www.pagat.com/rummy/tres_y_dos.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 950 : [ ] **Tresillo**
  - JSON: [tresillo.json](../src/processed-games/tresillo.json)
  - URLs: https://www.pagat.com/lhombre/tresillo.html | https://en.wikipedia.org/wiki/Ombre
  - Local HTML: âœ“ (pagat-tresillo.html, wiki-ombre-2.html, wiki-ombre.html)

- 951 : [ ] **Tressette**
  - JSON: [tressette.json](../src/processed-games/tressette.json)
  - URLs: https://www.pagat.com/tressette/tressette.html | https://en.wikipedia.org/wiki/Tressette
  - Local HTML: âœ“ (pagat-tressette.html, wiki-tressette-2.html, wiki-tressette.html)

- 952 : [ ] **Tri Palki Ñ‚Ñ€Ð¸ Ð¿Ð°Ð»ÐºÐ¸**
  - JSON: [tri-palki.json](../src/processed-games/tri-palki.json)
  - URLs: https://www.pagat.com/beating/tri_palki.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 953 : [ ] **Tribello**
  - JSON: [tribello.json](../src/processed-games/tribello.json)
  - URLs: https://www.pagat.com/fishing/tribello.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 954 : [ ] **Trijumf**
  - JSON: [trijumf.json](../src/processed-games/trijumf.json)
  - URLs: https://www.pagat.com/jass/trijumf.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 955 : [ ] **Trionfetti**
  - JSON: [trionfetti.json](../src/processed-games/trionfetti.json)
  - URLs: https://www.pagat.com/tarot/trionfetti.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 956 : [ ] **Trionfo Beccaccino | Marafon-Beccaccino | Trionfino Beccaccino**
  - JSON: [trionfo-beccaccino.json](../src/processed-games/trionfo-beccaccino.json)
  - URLs: https://www.pagat.com/tressette/beccaccino.html | https://en.wikipedia.org/wiki/Tressette | https://www.pagat.com/tressette/beccaccino.html#trionfino
  - Local HTML: âœ“ (pagat-beccaccino.html, wiki-tressette-2.html, wiki-tressette.html)

- 957 : [ ] **Tripoli | Michigan Rummy | Rummoli | Three in One**
  - JSON: [tripoli.json](../src/processed-games/tripoli.json)
  - URLs: https://www.pagat.com/stops/tripoli.html | https://en.wikipedia.org/wiki/Michigan_(card_game)
  - Local HTML: âœ“ (wiki-michigan.html)

- 958 : [ ] **Trips to Win (5 Card Draw) Poker**
  - JSON: [five-card-draw-trips-to-win.json](../src/processed-games/five-card-draw-trips-to-win.json)
  - URLs: https://www.pagat.com/poker/variants/5draw.html#trips | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-five-card-draw.html, wiki-poker.html)

- 959 : [ ] **Trix | Trex**
  - JSON: [trix.json](../src/processed-games/trix.json)
  - URLs: https://www.pagat.com/jass/trix.html | https://en.wikipedia.org/wiki/Jass | https://en.wikipedia.org/wiki/Trex_(card_game)
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 960 : [ ] **TrjÃ¡mann**
  - JSON: [trj-mann.json](../src/processed-games/trj-mann.json)
  - URLs: https://www.pagat.com/beating/trjamann.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 961 : [ ] **Troccas**
  - JSON: [troccas.json](../src/processed-games/troccas.json)
  - URLs: https://www.pagat.com/tarot/troccas.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (pagat-troccas.html, wiki-tarot-2.html, wiki-tarot.html)

- 962 : [ ] **Troefcall**
  - JSON: [troefcall.json](../src/processed-games/troefcall.json)
  - URLs: https://www.pagat.com/jass/troefcall.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 963 : [ ] **Troeven**
  - JSON: [troeven.json](../src/processed-games/troeven.json)
  - URLs: https://www.pagat.com/quotawhist/troeven.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 964 : [ ] **Troggu | TappÃ¤**
  - JSON: [troggu.json](../src/processed-games/troggu.json)
  - URLs: https://www.pagat.com/jass/troggu.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 965 : [ ] **Truc Catalonia | Tru | Truc France | Truka | Trut**
  - JSON: [truc.json](../src/processed-games/truc.json)
  - URLs: https://www.pagat.com/vying/truc.html | https://www.pagat.com/vying/truc.html#catalonia
  - Local HTML: âœ“ (pagat-top-trumps.html, pagat-truc.html, pagat-truco.html, pagat-truf.html, pagat-trumps-index.html, wiki-ace-trumps.html, wiki-netrunner.html, wiki-patruni-e-sutta.html, wiki-super-trunfo.html, wiki-top-trumps.html, wiki-truc-2.html, wiki-truc-y-flou.html, wiki-truc.html, wiki-truco.html, wiki-trumped-up-cards.html)

- 966 : [ ] **Truco | Truco Argentinean | Truco Mineiro | Truco Paulista | Truco Uruguayan**
  - JSON: [truco.json](../src/processed-games/truco.json)
  - URLs: https://www.pagat.com/vying/truco.html | https://en.wikipedia.org/wiki/Truco | https://www.pagat.com/vying/truco.html#argentinean | https://www.pagat.com/vying/truco.html#uruguayan | https://www.pagat.com/vying/truco.html#mineiro | https://www.pagat.com/vying/truco.html#paulista
  - Local HTML: âœ“ (wiki-truco.html)

- 967 : [ ] **Truf**
  - JSON: [truf.json](../src/processed-games/truf.json)
  - URLs: https://www.pagat.com/jass/truf.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 968 : [ ] **Tsung Shap**
  - JSON: [tsung-shap.json](../src/processed-games/tsung-shap.json)
  - URLs: https://www.pagat.com/domino/draw/tsungshap.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 969 : [ ] **Tunkhannock 14-point Pitch**
  - JSON: [pitch-tunkhannock.json](../src/processed-games/pitch-tunkhannock.json)
  - URLs: https://www.pagat.com/allfours/pitch.html#tunkhannock | https://en.wikipedia.org/wiki/Pitch_(card_game)
  - Local HTML: âœ“ (pagat-pitch.html, wiki-pitch-5.html, wiki-pitch.html)

- 970 : [ ] **Tuong**
  - JSON: [tuong.json](../src/processed-games/tuong.json)
  - URLs: https://www.pagat.com/climbing/thirteen.html
  - Local HTML: âœ“ (pagat-thirteen.html)

- 971 : [ ] **Tuppenny Ha'penny Loo | Loo**
  - JSON: [tuppenny-hapenny-loo.json](../src/processed-games/tuppenny-hapenny-loo.json)
  - URLs: https://www.pagat.com/rams/loo.html | https://en.wikipedia.org/wiki/Rams_(card_game) | https://www.pagat.com/rams/loo.html#tuppenny | https://www.pagat.com/vying/loo.html
  - Local HTML: âœ“ (pagat-loo.html, wiki-rams-4.html, wiki-rams.html)

- 972 : [ ] **Turbo Hearts**
  - JSON: [hearts-turbo.json](../src/processed-games/hearts-turbo.json)
  - URLs: https://www.pagat.com/reverse/hearts.html#turbo | https://en.wikipedia.org/wiki/Hearts_(card_game)
  - Local HTML: âœ“ (pagat-hearts.html, wiki-hearts-3.html, wiki-hearts.html)

- 973 : [ ] **Turkish Poker | TÃ¼rk pokeri**
  - JSON: [turkish-poker.json](../src/processed-games/turkish-poker.json)
  - URLs: https://www.pagat.com/poker/variants/turkish.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-turkish-poker.html, wiki-poker.html)

- 974 : [ ] **Turnover Bridge | Draw and Discard Bridge | Draw Bridge | Honeymoon Bridge | Memory Bridge | Single Dummy Bridge**
  - JSON: [turnover-bridge.json](../src/processed-games/turnover-bridge.json)
  - URLs: https://www.pagat.com/auctionwhist/honeymoon.html#discard | https://en.wikipedia.org/wiki/Whist | https://www.pagat.com/auctionwhist/honeymoon.html#draw | https://www.pagat.com/auctionwhist/honeymoon.html | https://www.pagat.com/auctionwhist/honeymoon.html#memory | https://www.pagat.com/auctionwhist/honeymoon.html#single | https://www.pagat.com/auctionwhist/honeymoon.html#turnover
  - Local HTML: âœ“ (pagat-honeymoon.html, wiki-whist-4.html, wiki-whist.html)

- 975 : [ ] **Tute**
  - JSON: [tute.json](../src/processed-games/tute.json)
  - URLs: https://www.pagat.com/marriage/tute.html | https://en.wikipedia.org/wiki/Tute
  - Local HTML: âœ“ (pagat-tute.html, wiki-tute-2.html, wiki-tute.html)

- 976 : [ ] **Tute americano**
  - JSON: [tute-americano.json](../src/processed-games/tute-americano.json)
  - URLs: https://www.pagat.com/marriage/tute.html#americano | https://en.wikipedia.org/wiki/Tute
  - Local HTML: âœ“ (pagat-tute.html, wiki-tute-2.html, wiki-tute.html)

- 977 : [ ] **Tute arrastrado**
  - JSON: [tute-arrastrado.json](../src/processed-games/tute-arrastrado.json)
  - URLs: https://www.pagat.com/marriage/tute.html#arrastrado | https://en.wikipedia.org/wiki/Tute
  - Local HTML: âœ“ (pagat-tute.html, wiki-tute-2.html, wiki-tute.html)

- 978 : [ ] **Tute cabrero**
  - JSON: [tute-cabrero.json](../src/processed-games/tute-cabrero.json)
  - URLs: https://www.pagat.com/marriage/tute.html#cabrero | https://en.wikipedia.org/wiki/Tute
  - Local HTML: âœ“ (pagat-tute.html, wiki-tute-2.html, wiki-tute.html)

- 979 : [ ] **Tute corriente**
  - JSON: [tute-corriente.json](../src/processed-games/tute-corriente.json)
  - URLs: https://www.pagat.com/marriage/tute.html#corriente | https://en.wikipedia.org/wiki/Tute
  - Local HTML: âœ“ (pagat-tute.html, wiki-tute-2.html, wiki-tute.html)

- 980 : [ ] **Tute gana-pierde**
  - JSON: [tute-gana-pierde.json](../src/processed-games/tute-gana-pierde.json)
  - URLs: https://www.pagat.com/marriage/tute.html#gana-pierde | https://en.wikipedia.org/wiki/Tute
  - Local HTML: âœ“ (pagat-tute.html, wiki-tute-2.html, wiki-tute.html)

- 981 : [ ] **Tute habanero**
  - JSON: [tute-habanero.json](../src/processed-games/tute-habanero.json)
  - URLs: https://www.pagat.com/marriage/tute.html#habanero | https://en.wikipedia.org/wiki/Tute
  - Local HTML: âœ“ (pagat-tute.html, wiki-tute-2.html, wiki-tute.html)

- 982 : [ ] **Tute individual**
  - JSON: [tute-individual.json](../src/processed-games/tute-individual.json)
  - URLs: https://www.pagat.com/marriage/tute.html#individual | https://en.wikipedia.org/wiki/Tute
  - Local HTML: âœ“ (pagat-tute.html, wiki-tute-2.html, wiki-tute.html)

- 983 : [ ] **Tute subastado**
  - JSON: [tute-subastado.json](../src/processed-games/tute-subastado.json)
  - URLs: https://www.pagat.com/marriage/tute.html#subastado | https://en.wikipedia.org/wiki/Tute
  - Local HTML: âœ“ (pagat-tute.html, wiki-tute-2.html, wiki-tute.html)

- 984 : [ ] **Tuxedo**
  - JSON: [tuxedo.json](../src/processed-games/tuxedo.json)
  - URLs: https://www.pagat.com/beating/tuxedo.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 985 : [ ] **Twenty-Five**
  - JSON: [twenty-five.json](../src/processed-games/twenty-five.json)
  - URLs: https://www.pagat.com/spoil5/25.html | https://en.wikipedia.org/wiki/Forty-fives
  - Local HTML: âœ“ (pagat-spoil-five-25.html, wiki-forty-fives-2.html, wiki-forty-fives-3.html, wiki-forty-fives.html)

- 986 : [ ] **Twenty-Four**
  - JSON: [twenty-four.json](../src/processed-games/twenty-four.json)
  - URLs: https://www.pagat.com/jass/24.html | https://en.wikipedia.org/wiki/Jass | https://en.wikipedia.org/wiki/24_(puzzle) | https://24game.com/ | https://nrich.maths.org/games/make-24
  - Local HTML: âœ“ (wiki-24.html, wiki-jass-3.html, wiki-jass.html)

- 987 : [ ] **Twenty-Nine | 29**
  - JSON: [twenty-nine.json](../src/processed-games/twenty-nine.json)
  - URLs: https://www.pagat.com/domino/trick/29.html | https://en.wikipedia.org/wiki/Dominoes | https://en.wikipedia.org/wiki/Twenty-eight_(card_game)
  - Local HTML: âœ“ (wiki-dominoes.html, wiki-twenty-eight.html)

- 988 : [ ] **Twenty-Six**
  - JSON: [twenty-six.json](../src/processed-games/twenty-six.json)
  - URLs: https://www.pagat.com/jass/26.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 989 : [ ] **Twenty-Two**
  - JSON: [twenty-two.json](../src/processed-games/twenty-two.json)
  - URLs: https://www.pagat.com/jass/22.html | https://en.wikipedia.org/wiki/Jass | https://gamerules.com/rules/twenty-two/ | https://www.catsatcards.com/Games/Twenty-Two.html
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 990 : [ ] **Two Hundred | 10 | Barouche, La | Bidder 10 | Bloutte, La | Deux Cents | Dix | Fouine, La | Rough, Le | Ruff, Le**
  - JSON: [two-hundred.json](../src/processed-games/two-hundred.json)
  - URLs: https://www.pagat.com/kt5/200.html | https://en.wikipedia.org/wiki/Tractor_(card_game)
  - Local HTML: âœ“ (pagat-kt5-two-hundred.html, wiki-tractor.html)

- 991 : [ ] **Two plus One Poker | 2 plus 1 Poker**
  - JSON: [two-plus-one.json](../src/processed-games/two-plus-one.json)
  - URLs: https://www.pagat.com/poker/variants/twoplustone.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

### U

- 992 : [x] **U G O**
  - JSON: [u-g-o.json](../src/processed-games/u-g-o.json)
  - URLs: https://www.pagat.com/invented/u-g-o.html
  - Local HTML: âœ“ (pagat-u-g-o.html, pagat-ugo.html)

- 993 : [x] **Ugly**
  - JSON: [ugly.json](../src/processed-games/ugly.json)
  - URLs: https://www.pagat.com/reverse/ugly.html | https://en.wikipedia.org/wiki/Hearts_(card_game)
  - Local HTML: âœ“ (pagat-ugly.html, wiki-hearts-3.html, wiki-hearts.html)

- 994 : [x] **Uke-Shogi**
  - JSON: [uke-shogi.json](../src/processed-games/uke-shogi.json)
  - URLs: https://www.pagat.com/picture/uke_shogi.html | https://www.pagat.com/climbing/goita.html
  - Local HTML: âœ“ (pagat-goita.html)

- 995 : [x] **Ulti**
  - JSON: [ulti.json](../src/processed-games/ulti.json)
  - URLs: https://www.pagat.com/vying/ulti.html | https://en.wikipedia.org/wiki/Ulti
  - Local HTML: âœ“ (wiki-ulti.html)

- 996 : [x] **Umtali**
  - JSON: [umtali.json](../src/processed-games/umtali.json)
  - URLs: https://www.pagat.com/fishing/umtali.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

### V

- 997 : [x] **Valepaska**
  - JSON: [valepaska.json](../src/processed-games/valepaska.json)
  - URLs: https://www.pagat.com/beating/valepaska.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-valepaska.html, wiki-durak-3.html, wiki-durak.html)

- 998 : [x] **Vandaatta**
  - JSON: [vandaatta.json](../src/processed-games/vandaatta.json)
  - URLs: https://www.pagat.com/eights/vandatta.html | https://www.bicyclecards.com/how-to-play/crazy-eights/
  - Local HTML: âœ“ (pagat-vandatta.html)

- 999 : [x] **VÃ¤ndtia**
  - JSON: [vandtia.json](../src/processed-games/vandtia.json)
  - URLs: https://www.pagat.com/beating/vandtia.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-vandtia.html, wiki-durak-3.html, wiki-durak.html)

- 1000 : [x] **Vatikan | Robbers' Rummy**
  - JSON: [vatikan.json](../src/processed-games/vatikan.json)
  - URLs: https://www.pagat.com/rummy/vatikan.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 1001 : [x] **Vatra**
  - JSON: [vatra.json](../src/processed-games/vatra.json)
  - URLs: https://www.pagat.com/fishing/vatra.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 1002 : [x] **Vazhushal | Wipe**
  - JSON: [vazhushal.json](../src/processed-games/vazhushal.json)
  - URLs: https://www.pagat.com/beating/vazhushal.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (wiki-durak-3.html, wiki-durak.html)

- 1003 : [x] **Verish' Ne Verish'**
  - JSON: [verish-ne-verish.json](../src/processed-games/verish-ne-verish.json)
  - URLs: https://www.pagat.com/beating/verish.html | https://en.wikipedia.org/wiki/Durak
  - Local HTML: âœ“ (pagat-verish.html, wiki-durak-3.html, wiki-durak.html)

- 1004 : [x] **Video Poker**
  - JSON: [video-poker.json](../src/processed-games/video-poker.json)
  - URLs: https://www.pagat.com/banking/video_poker.html
  - Local HTML: âœ“ (pagat-video-poker.html)

- 1005 : [x] **Vier-Anderle | Strassenwart**
  - JSON: [vier-anderle.json](../src/processed-games/vier-anderle.json)
  - URLs: https://www.pagat.com/jass/vier_anderle.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 1006 : [x] **Viersche | 100 Black Forest | Hundert**
  - JSON: [viersche.json](../src/processed-games/viersche.json)
  - URLs: https://www.pagat.com/jass/viersche.html | https://en.wikipedia.org/wiki/Jass | https://en.wikipedia.org/wiki/Viersche
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html, wiki-viersche.html)

- 1007 : [x] **Vint**
  - JSON: [vint.json](../src/processed-games/vint.json)
  - URLs: https://www.pagat.com/whist/vint.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (wiki-whist-4.html, wiki-whist.html)

- 1008 : [x] **Vira | Wira**
  - JSON: [vira.json](../src/processed-games/vira.json)
  - URLs: https://www.pagat.com/whist/vira.html | https://en.wikipedia.org/wiki/Whist | https://en.wikipedia.org/wiki/Vira_(card_game)
  - Local HTML: âœ“ (wiki-vira.html, wiki-whist-4.html, wiki-whist.html)

- 1009 : [x] **Vitou**
  - JSON: [vitou.json](../src/processed-games/vitou.json)
  - URLs: https://www.pagat.com/jass/vitou.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 1010 : [x] **Viuda, La**
  - JSON: [viuda-la.json](../src/processed-games/viuda-la.json)
  - URLs: https://www.pagat.com/fishing/viuda.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 1011 : [x] **Voormsi | Vorms**
  - JSON: [voormsi.json](../src/processed-games/voormsi.json)
  - URLs: https://www.pagat.com/karnoeffel/voormsi.html | https://en.wikipedia.org/wiki/Karn%C3%B6ffel
  - Local HTML: âœ“ (wiki-karnffel.html, wiki-karnoeffel.html)

### W

- 1012 : [x] **Wall Street Poker**
  - JSON: [wall-street-poker.json](../src/processed-games/wall-street-poker.json)
  - URLs: https://www.pagat.com/poker/variants/wallstreet.html | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/buyyourcard.html#wall_street
  - Local HTML: âœ“ (pagat-buy-your-card.html, wiki-poker.html)

- 1013 : [x] **War | War Syrian**
  - JSON: [war.json](../src/processed-games/war.json)
  - URLs: https://www.pagat.com/war/war.html | https://en.wikipedia.org/wiki/War_(card_game) | https://www.pagat.com/war/war.html#syrian
  - Local HTML: âœ“ (pagat-war.html, wiki-war-3.html, wiki-war.html)

- 1014 : [x] **Watten**
  - JSON: [watten.json](../src/processed-games/watten.json)
  - URLs: https://www.pagat.com/trumps/watten.html | https://en.wikipedia.org/wiki/Watten_(card_game)
  - Local HTML: âœ“ (pagat-watten.html, wiki-watten.html)

- 1015 : [x] **Whisky Poker**
  - JSON: [whisky-poker.json](../src/processed-games/whisky-poker.json)
  - URLs: https://www.pagat.com/poker/variants/whisky.html | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/commerce/whisky_poker.html
  - Local HTML: âœ“ (pagat-whisky-poker.html, wiki-poker.html)

- 1016 : [x] **Whist classic**
  - JSON: [whist.json](../src/processed-games/whist.json)
  - URLs: https://www.pagat.com/whist/whist.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-whist.html, wiki-whist-4.html, wiki-whist.html)

- 1017 : [x] **Whist Israeli**
  - JSON: [whist-israeli.json](../src/processed-games/whist-israeli.json)
  - URLs: https://www.pagat.com/whist/whist.html#israeli | https://en.wikipedia.org/wiki/Whist | https://en.wikipedia.org/wiki/Israeli_whist
  - Local HTML: âœ“ (pagat-whist.html, wiki-whist-4.html, wiki-whist.html)

- 1018 : [x] **Whist Minnesota**
  - JSON: [whist-minnesota.json](../src/processed-games/whist-minnesota.json)
  - URLs: https://www.pagat.com/whist/whist.html#minnesota | https://en.wikipedia.org/wiki/Whist | https://en.wikipedia.org/wiki/Minnesota_whist
  - Local HTML: âœ“ (pagat-whist.html, wiki-minnesota-whist.html, wiki-whist-4.html, wiki-whist.html)

- 1019 : [x] **Whist Romanian**
  - JSON: [whist-romanian.json](../src/processed-games/whist-romanian.json)
  - URLs: https://www.pagat.com/whist/whist.html#romanian | https://en.wikipedia.org/wiki/Whist | https://en.wikipedia.org/wiki/Romanian_whist
  - Local HTML: âœ“ (pagat-whist.html, wiki-whist-4.html, wiki-whist.html)

- 1020 : [x] **Whist two-player**
  - JSON: [whist-two-player.json](../src/processed-games/whist-two-player.json)
  - URLs: https://www.pagat.com/whist/whist.html#two | https://en.wikipedia.org/wiki/Whist | https://en.wikipedia.org/wiki/German_whist
  - Local HTML: âœ“ (pagat-whist.html, wiki-german-whist.html, wiki-whist-4.html, wiki-whist.html)

- 1021 : [x] **Whot Â® British**
  - JSON: [whot-british.json](../src/processed-games/whot-british.json)
  - URLs: https://www.pagat.com/eights/whot.html#british | https://www.pagat.com/com/whot.html | https://en.wikipedia.org/wiki/Whot!
  - Local HTML: âœ“ (pagat-whot.html, wiki-whot.html)

- 1022 : [x] **Whot Â® Nigerian**
  - JSON: [whot-nigerian.json](../src/processed-games/whot-nigerian.json)
  - URLs: https://www.pagat.com/eights/whot.html | https://www.pagat.com/com/whot.html | https://en.wikipedia.org/wiki/Whot!
  - Local HTML: âœ“ (pagat-whot.html, wiki-whot.html)

- 1023 : [x] **Wiezen**
  - JSON: [wiezen.json](../src/processed-games/wiezen.json)
  - URLs: https://www.pagat.com/quotawhist/wiezen.html | https://en.wikipedia.org/wiki/Whist | https://www.pagat.com/boston/wiezen.html
  - Local HTML: âœ“ (pagat-wiezen.html, wiki-whist-4.html, wiki-whist.html)

- 1024 : [x] **Woolworth Poker**
  - JSON: [woolworth-poker.json](../src/processed-games/woolworth-poker.json)
  - URLs: https://www.pagat.com/poker/variants/woolworth.html | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/baseball.html#woolworth
  - Local HTML: âœ“ (pagat-baseball-poker.html, wiki-poker.html)

### X

- 1025 : [x] **Xeri ÎžÎµÏÎ® | Kseri**
  - JSON: [xeri.json](../src/processed-games/xeri.json)
  - URLs: https://www.pagat.com/fishing/xeri.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (pagat-xeri.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 1026 : [x] **XXas-hÃ­vÃ¡sos Tarokk**
  - JSON: [xxas-hivasos-tarokk.json](../src/processed-games/xxas-hivasos-tarokk.json)
  - URLs: https://www.pagat.com/tarot/xxas.html | https://en.wikipedia.org/wiki/Tarot
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

### Y

- 1027 : [x] **Yaniv | Dhumbal | Jhyap Yaniv**
  - JSON: [yaniv.json](../src/processed-games/yaniv.json)
  - URLs: https://www.pagat.com/draw/yaniv.html | https://en.wikipedia.org/wiki/Yaniv | https://en.wikipedia.org/wiki/Yaniv_(card_game)
  - Local HTML: âœ“ (pagat-yaniv.html, wiki-yaniv-2.html, wiki-yaniv.html)

- 1028 : [x] **Yonin-Kan | Damari-Kan | Kan**
  - JSON: [yonin-kan.json](../src/processed-games/yonin-kan.json)
  - URLs: https://www.pagat.com/picture/kan.html#yonin | https://www.pagat.com/picture/kan.html
  - Local HTML: âœ“ (pagat-kan.html)

- 1029 : [x] **Yukon | Gullgravere**
  - JSON: [yukon.json](../src/processed-games/yukon.json)
  - URLs: https://www.pagat.com/pointtrk/yukon.html | https://en.wikipedia.org/wiki/Yukon_(solitaire)
  - Local HTML: âœ“ (pagat-yukon.html, wiki-yukon-solitaire.html, wiki-yukon.html)

- 1030 : [x] **Yukon Hold'em Poker**
  - JSON: [yukon-holdem.json](../src/processed-games/yukon-holdem.json)
  - URLs: https://www.pagat.com/poker/variants/yukon_holdem.html | https://en.wikipedia.org/wiki/Yukon_(solitaire)
  - Local HTML: âœ“ (wiki-yukon-solitaire.html, wiki-yukon.html)

### Z

- 1031 : [x] **Z Poker**
  - JSON: [z-poker.json](../src/processed-games/z-poker.json)
  - URLs: https://www.pagat.com/poker/variants/z_poker.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 1032 : [x] **Zanga**
  - JSON: [zanga.json](../src/processed-games/zanga.json)
  - URLs: https://www.pagat.com/fishing/zanga.html | https://en.wikipedia.org/wiki/Scopa | https://www.pagat.com/lhombre/zanga.html
  - Local HTML: âœ“ (pagat-zanga.html, wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 1033 : [x] **Zecchinetta | Ziginette**
  - JSON: [zecchinetta.json](../src/processed-games/zecchinetta.json)
  - URLs: https://www.pagat.com/banking/zecchinetta.html | https://www.pagat.com/banking/lansquenet.html
  - Local HTML: âœ“ (pagat-lansquenet.html)

- 1034 : [x] **ZhÄ“ng FÄ“n æŒ£åˆ†**
  - JSON: [zheng-fen.json](../src/processed-games/zheng-fen.json)
  - URLs: https://www.pagat.com/kt5/zhengfen.html | https://en.wikipedia.org/wiki/Tractor_(card_game) | https://www.pagat.com/climbing/zhengfen.html
  - Local HTML: âœ“ (pagat-zhengfen.html, wiki-tractor.html)

- 1035 : [x] **Zifuli**
  - JSON: [zifuli.json](../src/processed-games/zifuli.json)
  - URLs: https://www.pagat.com/fishing/zifuli.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 1036 : [x] **Zole**
  - JSON: [zole.json](../src/processed-games/zole.json)
  - URLs: https://www.pagat.com/beating/zole.html | https://en.wikipedia.org/wiki/Durak | https://www.pagat.com/schafkopf/zole.html
  - Local HTML: âœ“ (pagat-zole.html, wiki-durak-3.html, wiki-durak.html)

- 1037 : [x] **ZsÃ­ros | ZsÃ­rozÃ¡s**
  - JSON: [zsirozas.json](../src/processed-games/zsirozas.json)
  - URLs: https://www.pagat.com/tarot/zsirozas.html | https://en.wikipedia.org/wiki/Tarot | https://www.pagat.com/sedma/zsirozas.html
  - Local HTML: âœ“ (pagat-zsirozas.html, wiki-tarot-2.html, wiki-tarot.html)

- 1038 : [x] **Zwanzig ab | 20 ab**
  - JSON: [zwanzig-ab.json](../src/processed-games/zwanzig-ab.json)
  - URLs: https://www.pagat.com/jass/zwanzig_ab.html | https://en.wikipedia.org/wiki/Jass | https://www.pagat.com/tarot/zwanzig.html
  - Local HTML: âœ“ (pagat-zwanzig.html, wiki-jass-3.html, wiki-jass.html)

- 1039 : [x] **Zwanzigerrufen | XXer-Rufen**
  - JSON: [zwanzigerrufen.json](../src/processed-games/zwanzigerrufen.json)
  - URLs: https://www.pagat.com/tarot/zwanzigerrufen.html | https://en.wikipedia.org/wiki/Tarot | https://en.wikipedia.org/wiki/Tarot_card_games
  - Local HTML: âœ“ (wiki-tarot-2.html, wiki-tarot.html)

- 1040 : [x] **Zwicker**
  - JSON: [zwicker.json](../src/processed-games/zwicker.json)
  - URLs: https://www.pagat.com/jass/zwicker.html | https://en.wikipedia.org/wiki/Jass | https://www.pagat.com/fishing/zwicker.html
  - Local HTML: âœ“ (pagat-zwicker.html, wiki-jass-3.html, wiki-jass.html)

### 0-9

- 1041 : [x] **100**
  - JSON: [100.json](../src/processed-games/100.json)
  - URLs: https://www.pagat.com/marriage/1000.html | https://en.wikipedia.org/wiki/Whist | https://www.qcsalon.net/en/tysiac | https://gamerules.com/rules/1000-card-game/
  - Local HTML: âœ“ (pagat-marriage-thousand.html, wiki-whist-4.html, wiki-whist.html)

- 1042 : [x] **100 ç™½åˆ† | 40 å››ååˆ† | BÄƒi FÄ“n ç™½åˆ† | DÄƒ BÄƒi FÄ“n æ‰“ç™¾åˆ† | ShuÄƒn Ãˆr æ‘”äºŒ | SÃ¬ ShÃ­ FÄ“n å››ååˆ†**
  - JSON: [baifen.json](../src/processed-games/baifen.json)
  - URLs: https://www.pagat.com/kt5/100.html | https://en.wikipedia.org/wiki/Tractor_(card_game)
  - Local HTML: âœ“ (pagat-kt5-hundred.html, wiki-tractor.html)

- 1043 : [x] **1000 | TysiÄ…c 1000 | Tysiacha Ð¢Ñ‹ÑÑÑ‡Ð°**
  - JSON: [tysiac-1000.json](../src/processed-games/tysiac-1000.json)
  - URLs: https://www.pagat.com/kt5/1000.html | https://en.wikipedia.org/wiki/Tractor_(card_game)
  - Local HTML: âœ“ (wiki-tractor.html)

- 1044 : [x] **11 Point Black Tile | Eleven Point Black Tile**
  - JSON: [11-point-black-tile.json](../src/processed-games/11-point-black-tile.json)
  - URLs: https://www.pagat.com/domino/trick/11black.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (pagat-domino-11-black.html, wiki-dominoes.html)

- 1045 : [x] **110**
  - JSON: [110.json](../src/processed-games/110.json)
  - URLs: https://www.pagat.com/spoil5/25.html#110 | https://en.wikipedia.org/wiki/Forty-fives
  - Local HTML: âœ“ (pagat-spoil-five-25.html, wiki-forty-fives-2.html, wiki-forty-fives-3.html, wiki-forty-fives.html)

- 1046 : [x] **2 7 Triple Draw**
  - JSON: [2-7-triple-draw.json](../src/processed-games/2-7-triple-draw.json)
  - URLs: https://wizardofodds.com/games/deuce-to-seven-triple-draw/
  - Local HTML: âœ“ (wizardofodds-2-7-triple-draw.html)

- 1047 : [x] **20 Dominoes**
  - JSON: [20-dominoes.json](../src/processed-games/20-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/line.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 1048 : [x] **21 Point Black Tile | Twenty-One Point Black Tile**
  - JSON: [21-point-black-tile.json](../src/processed-games/21-point-black-tile.json)
  - URLs: https://www.pagat.com/domino/trick/21black.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 1049 : [x] **220 | Two Hundred and Twenty**
  - JSON: [220.json](../src/processed-games/220.json)
  - URLs: https://www.pagat.com/spoil5/25.html#220 | https://en.wikipedia.org/wiki/Forty-fives | https://en.wikipedia.org/wiki/Twenty-five_(card_game) | https://pagat.com/national/ireland.html
  - Local HTML: âœ“ (pagat-spoil-five-25.html, wiki-forty-fives-2.html, wiki-forty-fives-3.html, wiki-forty-fives.html, wiki-twenty-five.html)

- 1050 : [x] **27 28 Dominoes**
  - JSON: [27-28-dominoes.json](../src/processed-games/27-28-dominoes.json)
  - URLs: https://www.pagat.com/domino/basics.html | https://en.wikipedia.org/wiki/Dominoes | https://worlddominoes.com/domino-rules/
  - Local HTML: âœ“ (pagat-domino-basics.html, wiki-dominoes.html)

- 1051 : [x] **28 | Twenty-Eight**
  - JSON: [28-dominoes.json](../src/processed-games/28-dominoes.json)
  - URLs: https://www.pagat.com/domino/trick/28.html | https://en.wikipedia.org/wiki/Dominoes | https://www.gameschamp.co.uk/block-and-draw-dominoes.html
  - Local HTML: âœ“ (wiki-dominoes.html)

- 1052 : [x] **28 91 Dominoes**
  - JSON: [28-91-dominoes.json](../src/processed-games/28-91-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/line.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 1053 : [x] **3 5 7 Poker | Three Five Seven Poker**
  - JSON: [357-poker.json](../src/processed-games/357-poker.json)
  - URLs: https://www.pagat.com/poker/variants/guts.html#357 | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-guts.html, wiki-poker.html)

- 1054 : [x] **3-13 Rummy | Three-Thirteen Rummy**
  - JSON: [313-rummy.json](../src/processed-games/313-rummy.json)
  - URLs: https://www.pagat.com/rummy/313.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (wiki-rummy-4.html, wiki-rummy.html)

- 1055 : [x] **3-2-5 | 2-3-5 | 5-3-2**
  - JSON: [3-2-5.json](../src/processed-games/3-2-5.json)
  - URLs: https://www.pagat.com/quotawhist/3-2-5.html | https://en.wikipedia.org/wiki/Whist | https://www.catsatcards.com/Games/ThreeTwoFive.html | https://gambiter.com/cards/3-2-5.html
  - Local HTML: âœ“ (pagat-quotawhist-3-2-5.html, wiki-whist-4.html, wiki-whist.html)

- 1056 : [x] **30 Point Black Tile | Thirty Point Black Tile**
  - JSON: [30-point-black-tile.json](../src/processed-games/30-point-black-tile.json)
  - URLs: https://www.pagat.com/domino/trick/30black.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 1057 : [x] **31 Dutch | 31 showdown | Bone Ace | One and Thirty**
  - JSON: [31.json](../src/processed-games/31.json)
  - URLs: https://www.pagat.com/showdown/boneace.html | https://www.pagat.com/showdown/boneace.html#dutch
  - Local HTML: âœ“ (pagat-boneace.html)

- 1058 : [x] **32-card Poker | Stripped Deck Poker**
  - JSON: [32-card-poker.json](../src/processed-games/32-card-poker.json)
  - URLs: https://www.pagat.com/poker/variants/32card.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 1059 : [x] **36 45 Dominoes**
  - JSON: [36-45-dominoes.json](../src/processed-games/36-45-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/line.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 1060 : [x] **4-card Brag | Four-card Brag**
  - JSON: [4-card-brag.json](../src/processed-games/4-card-brag.json)
  - URLs: https://www.pagat.com/vying/brag.html#four | https://en.wikipedia.org/wiki/Brag_(card_game)
  - Local HTML: âœ“ (pagat-vying-brag.html, wiki-brag-4.html, wiki-brag.html)

- 1061 : [x] **41**
  - JSON: [empat-satu.json](../src/processed-games/empat-satu.json)
  - URLs: https://www.pagat.com/draw/41.html
  - Local HTML: âœ“ (pagat-draw-forty-one.html)

- 1062 : [x] **41 Exchange**
  - JSON: [41-exchange.json](../src/processed-games/41-exchange.json)
  - URLs: https://www.pagat.com/auctionwhist/41.html
  - Local HTML: âœ“ (pagat-forty-one.html)

- 1063 : [x] **41 Syrian | 400 arba3meyeh**
  - JSON: [41-syrian.json](../src/processed-games/41-syrian.json)
  - URLs: https://www.pagat.com/auctionwhist/41.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-forty-one.html, wiki-whist-4.html, wiki-whist.html)

- 1064 : [x] **5 Card Draw with a Bug Poker | California Draw Poker | Five Card Draw with a Bug Poker**
  - JSON: [five-card-draw-with-bug.json](../src/processed-games/five-card-draw-with-bug.json)
  - URLs: https://www.pagat.com/poker/variants/5draw.html#five | https://en.wikipedia.org/wiki/Poker | https://www.pagat.com/poker/variants/5draw.html#bug
  - Local HTML: âœ“ (pagat-five-card-draw.html, wiki-poker.html)

- 1065 : [x] **5 Card Omaha poker | Big O poker | Five Card Omaha poker**
  - JSON: [5-card-omaha.json](../src/processed-games/5-card-omaha.json)
  - URLs: https://www.pagat.com/poker/variants/omaha.html#five | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-omaha.html, wiki-poker.html)

- 1066 : [x] **5 Card Stud High-Low With a Buy Poker | Five Card Stud High-Low With a Buy Poker**
  - JSON: [5-card-stud-high-low-with-a-buy.json](../src/processed-games/5-card-stud-high-low-with-a-buy.json)
  - URLs: https://www.pagat.com/poker/variants/5stud.html#buy | https://en.wikipedia.org/wiki/Poker | https://www.pokerlistings.com/poker-rules/5-card-stud-poker
  - Local HTML: âœ“ (pagat-five-card-stud.html, wiki-poker.html)

- 1067 : [x] **5-card Brag | Five-card Brag**
  - JSON: [5-card-brag.json](../src/processed-games/5-card-brag.json)
  - URLs: https://www.pagat.com/vying/brag.html#five | https://en.wikipedia.org/wiki/Brag_(card_game)
  - Local HTML: âœ“ (pagat-vying-brag.html, wiki-brag-4.html, wiki-brag.html)

- 1068 : [x] **500 Rummy | Five Hundred Rummy | Joker Rummy | Rummy 500**
  - JSON: [500-rummy.json](../src/processed-games/500-rummy.json)
  - URLs: https://www.pagat.com/rummy/500rum.html | https://en.wikipedia.org/wiki/500_(card_game) | https://en.wikipedia.org/wiki/Rummy | https://en.wikipedia.org/wiki/500_rum
  - Local HTML: âœ“ (pagat-five-hundred-rum.html, wiki-500-card-game-alt.html, wiki-500-card-game.html, wiki-500-card.html, wiki-500-rum-2.html, wiki-500-rum.html, wiki-500.html, wiki-rummy-4.html, wiki-rummy.html)

- 1069 : [x] **500 Sicilian**
  - JSON: [500-sicilian.json](../src/processed-games/500-sicilian.json)
  - URLs: https://www.pagat.com/fishing/500_sicilian.html | https://en.wikipedia.org/wiki/Scopa
  - Local HTML: âœ“ (wiki-scopa-4.html, wiki-scopa.html, wiki-scopone.html)

- 1070 : [x] **5000 Rummy | 10000 Rummy | 1500 Rummy | 2000 Rummy | 2200 Rummy | 2500 Rummy | 2800 Rummy | Backwards Rummy | Bitchin' Rummy | Circle Rummy | Dummy Rummy | George | Hillbilly Rummy | Polish Rummy | Wild One**
  - JSON: [5000-rummy.json](../src/processed-games/5000-rummy.json)
  - URLs: https://www.pagat.com/rummy/5000rummy.html | https://en.wikipedia.org/wiki/Rummy
  - Local HTML: âœ“ (pagat-five-thousand-rummy.html, wiki-rummy-4.html, wiki-rummy.html)

- 1071 : [x] **501**
  - JSON: [501.json](../src/processed-games/501.json)
  - URLs: https://www.pagat.com/adders/501.html | https://en.wikipedia.org/wiki/Cribbage
  - Local HTML: âœ“ (wiki-cribbage-3.html, wiki-cribbage.html)

- 1072 : [x] **51 Chinese | 51 Japanese | Goju ichi | WÅ­shÃ­yÄ« fÄ“n äº”åä¸€åˆ†**
  - JSON: [51.json](../src/processed-games/51.json)
  - URLs: https://www.pagat.com/commerce/51.html#japanese | https://en.wikipedia.org/wiki/Schwimmen | https://www.pagat.com/commerce/51.html
  - Local HTML: âœ“ (pagat-commerce-51-card.html, wiki-schwimmen.html)

- 1073 : [x] **52 Cards**
  - JSON: [52-cards.json](../src/processed-games/52-cards.json)
  - URLs: https://en.wikipedia.org/wiki/Golf_(patience)
  - Local HTML: âœ“ (wiki-golf-patience.html)

- 1074 : [x] **52 pick-up**
  - JSON: [52-pick-up.json](../src/processed-games/52-pick-up.json)
  - URLs: https://www.pagat.com/misc/52pickup.html
  - Local HTML: âœ“ (pagat-fifty-two-pickup.html)

- 1075 : [x] **55**
  - JSON: [55-dominoes-double-9.json](../src/processed-games/55-dominoes-double-9.json)
  - URLs: https://www.pagat.com/domino/line/55.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 1076 : [x] **55 91 Dominoes**
  - JSON: [55-91-dominoes.json](../src/processed-games/55-91-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/line.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 1077 : [x] **56 Dominoes 2 Sets**
  - JSON: [56-dominoes-2-sets.json](../src/processed-games/56-dominoes-2-sets.json)
  - URLs: https://www.pagat.com/domino/line/line.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 1078 : [x] **6 Bid Solo**
  - JSON: [6-bid-solo.json](../src/processed-games/6-bid-solo.json)
  - URLs: https://www.pagat.com/aceten/solo.html
  - Local HTML: âœ“ (pagat-solo.html)

- 1079 : [x] **6 Card Omaha poker | Six Card Omaha poker**
  - JSON: [6-card-omaha.json](../src/processed-games/6-card-omaha.json)
  - URLs: https://www.pagat.com/poker/variants/omaha.html#six | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-omaha.html, wiki-poker.html)

- 1080 : [x] **66 German | Sechsundsechzig | Sixty-Six German**
  - JSON: [66-german.json](../src/processed-games/66-german.json)
  - URLs: https://www.pagat.com/marriage/sixty_six.html | https://en.wikipedia.org/wiki/Bezique | https://en.wikipedia.org/wiki/Solo_66
  - Local HTML: âœ“ (wiki-bezique-2.html, wiki-bezique.html, wiki-solo-66.html)

- 1081 : [x] **7 27**
  - JSON: [7-27.json](../src/processed-games/7-27.json)
  - URLs: https://www.pagat.com/vying/7-27.html | https://www.pagat.com/poker/rules/ | https://web.archive.org/web/20130512064644/gamereport.com/poker/nonpoker.html
  - Local HTML: âœ“ (pagat-7-27.html, pagat-vying-7-27.html)

- 1082 : [x] **7 Card Brag**
  - JSON: [7-card-brag.json](../src/processed-games/7-card-brag.json)
  - URLs: https://www.pagat.com/partition/crash.html
  - Local HTML: âœ“ (pagat-crash.html)

- 1083 : [x] **7 Card Draw Poker | Seven Card Draw Poker**
  - JSON: [7-card-draw.json](../src/processed-games/7-card-draw.json)
  - URLs: https://www.pagat.com/poker/variants/7draw.html | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (wiki-poker.html)

- 1084 : [x] **7 Card Stud High-Low | Seven Card Stud High-Low Poker**
  - JSON: [7-card-stud-high-low.json](../src/processed-games/7-card-stud-high-low.json)
  - URLs: https://www.pagat.com/poker/variants/7stud.html#hilo | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-seven-card-stud.html, wiki-poker.html)

- 1085 : [x] **7 Card Stud with Wild Cards Poker | Seven Card Stud with Wild Cards Poker**
  - JSON: [7-card-stud-with-wild-cards.json](../src/processed-games/7-card-stud-with-wild-cards.json)
  - URLs: https://www.pagat.com/poker/variants/7stud.html#wild | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-seven-card-stud.html, wiki-poker.html)

- 1086 : [x] **7 of Diamonds | Sab'at Al-Deemin Ø³Ø¹Ø¨Ø© Ø§Ù„Ø¯ÙŠÙ…Ù† | Seven of Diamonds**
  - JSON: [sab-at-al-deemin.json](../src/processed-games/sab-at-al-deemin.json)
  - URLs: https://www.pagat.com/domino/partition/sabat_al_deemin.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 1087 : [x] **7-Toed Pete Dominoes | Seven-Toed Pete Dominoes**
  - JSON: [7-toed-pete-dominoes.json](../src/processed-games/7-toed-pete-dominoes.json)
  - URLs: https://www.pagat.com/domino/line/seven_toed_pete.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 1088 : [x] **7-Truf | Seven-Truf**
  - JSON: [7-truf.json](../src/processed-games/7-truf.json)
  - URLs: https://www.pagat.com/jass/seven_truf.html | https://en.wikipedia.org/wiki/Jass
  - Local HTML: âœ“ (wiki-jass-3.html, wiki-jass.html)

- 1089 : [x] **8 Game Mix Poker | THORSEHA Poker**
  - JSON: [8-game-mix.json](../src/processed-games/8-game-mix.json)
  - URLs: https://www.pagat.com/poker/variants/horse.html#eight | https://en.wikipedia.org/wiki/Poker
  - Local HTML: âœ“ (pagat-horse-poker.html, wiki-poker.html)

- 1090 : [x] **9 Card Brag**
  - JSON: [9-card-brag.json](../src/processed-games/9-card-brag.json)
  - URLs: https://www.pagat.com/partition/crash.html
  - Local HTML: âœ“ (pagat-crash.html)

- 1091 : [x] **9-5-2**
  - JSON: [9-5-2.json](../src/processed-games/9-5-2.json)
  - URLs: https://www.pagat.com/quotawhist/3-2-5.html | https://en.wikipedia.org/wiki/Whist
  - Local HTML: âœ“ (pagat-quotawhist-3-2-5.html, wiki-whist-4.html, wiki-whist.html)

- 1092 : [x] **91 Dominoes Double 12**
  - JSON: [91-dominoes-double-12.json](../src/processed-games/91-dominoes-double-12.json)
  - URLs: https://www.pagat.com/domino/line/line.html | https://en.wikipedia.org/wiki/Dominoes
  - Local HTML: âœ“ (wiki-dominoes.html)

- 1093 : [x] **98 | Ninety-Eight**
  - JSON: [98.json](../src/processed-games/98.json)
  - URLs: https://www.pagat.com/adders/ninety_eight.html | https://en.wikipedia.org/wiki/Cribbage
  - Local HTML: âœ“ (wiki-cribbage-3.html, wiki-cribbage.html)

- 1094 : [x] **99 adding game | Ninety-Nine adding game**
  - JSON: [99.json](../src/processed-games/99.json)
  - URLs: https://www.pagat.com/adders/ninety_nine.html | https://en.wikipedia.org/wiki/Cribbage
  - Local HTML: âœ“ (wiki-cribbage-3.html, wiki-cribbage.html)

- 1095 : [x] **99 trick-taking | Ninety-Nine trick-taking**
  - JSON: [99-trick-taking.json](../src/processed-games/99-trick-taking.json)
  - URLs: https://www.pagat.com/exact/99.html | https://en.wikipedia.org/wiki/Oh_hell
  - Local HTML: âœ“ (pagat-oh-hell-99.html, wiki-oh-hell-3.html, wiki-oh-hell.html)

- 1096 : [x] **Ã‰cartÃ©**
  - JSON: [ecarte.json](../src/processed-games/ecarte.json)
  - URLs: https://www.pagat.com/trumps/ecarte.html | https://en.wikipedia.org/wiki/Ã‰cartÃ© | https://en.wikipedia.org/wiki/%C3%89cart%C3%A9
  - Local HTML: âœ“ (pagat-ecarte.html, wiki-cart.html, wiki-ecarte.html)

- 1097 : [x] **Å½andari**
  - JSON: [zandari.json](../src/processed-games/zandari.json)
  - URLs: https://www.pagat.com/beating/zandari.html | https://en.wikipedia.org/wiki/Durak | https://www.pagat.com/fishing/zandari.html
  - Local HTML: âœ“ (pagat-zandari.html, wiki-durak-3.html, wiki-durak.html)

---

**Total: 1097 unique games** (JSON files in src/processed-games/)

