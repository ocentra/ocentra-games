#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { PROCESSED_GAMES_DIR } from "../paths.js";
import { isValidDeckTriple } from "@ocentra/game-domain/deck/deckCompatibility";
const SCRIPT_TRIPLES = new Set([
    "Standard 52\0French\0Standard_52", "Standard 52 + Joker(s)\0French\0Standard_52",
    "Standard 48\0French\0Pinochle_48", "Standard 48\0Spanish\0Stripped_48",
    "Standard 40\0French\0Stripped_40", "Standard 40\0Italian\0Stripped_40", "Standard 40\0Spanish\0Stripped_40", "Standard 40\0Portuguese\0Stripped_40",
    "Standard 36\0French\0Stripped_36", "Standard 36\0German\0Stripped_36",
    "Standard 32\0French\0Stripped_32", "Standard 32\0German\0Stripped_32",
    "Standard 32 + Joker(s)\0French\0Stripped_32", "Standard 32 + Joker(s)\0German\0Stripped_32",
    "Standard 24\0French\0Stripped_24", "Standard 24\0German\0Stripped_24",
    "Standard 44\0French\0Stripped_44",
    "Double 52\0French\0Standard_52", "Double 32\0French\0Stripped_32", "Double 32\0German\0Stripped_32", "Double 24\0French\0Stripped_24", "Double 24\0German\0Stripped_24",
    "Quad 36\0French\0Stripped_36", "Quad 40\0French\0Stripped_40",
    "Tarot 78\0French\0Tarot_78", "Tarot 78\0French_tarock\0Tarot_78", "Tarot 78\0Tarot_de_Marseille\0Tarot_78", "Tarot 78\0Swiss_1JJ\0Tarot_78",
    "Tarot 66\0French_tarock\0Tarot_66", "Tarot 66\0Tarot_de_Marseille\0Tarot_66",
    "Tarot 54\0Industrie_und_Glueck\0Tarot_54", "Tarot 54\0Cego\0Tarot_54",
    "Tarot 42\0Industrie_und_Glueck\0Tarot_42", "Tarot 40\0Industrie_und_Glueck\0Tarot_40",
    "Tarot 62\0Swiss_1JJ\0Tarot_62", "Tarot 62\0Tarocco_Piemontese\0Tarot_62",
    "Double-6 Dominoes\0Dominoes\0Domino_double6", "Double-9 Dominoes\0Dominoes\0Domino_double9", "Double-12 Dominoes\0Dominoes\0Domino_double12",
    "Hanafuda 48\0Hanafuda\0Hanafuda", "Hanafuda 48\0Hanafuda_snow\0Hanafuda", "Hanafuda 52\0Hanafuda\0Hanafuda",
    "Kabufuda 40\0Kabufuda\0Kabufuda", "Stripped 35\0French\0Stripped_35",
    "Chinese domino 32\0Chinese_domino\0Chinese_domino", "Whot 54\0Whot\0Whot",
]);
function tripleKey(d, s, r) {
    return `${d}\0${s}\0${r}`;
}
const deckErrorFiles = `
gao-ji.json ging.json giog.json gleek.json gnav.json goita.json golden-ten.json golf-nine-card.json golf.json gong-zhu.json gonin-kan.json gops.json gouji.json gu-n-d-n.json guadalupe.json guan-dan.json guo-wu-guan.json hindersche.json hockey.json hol-s-der-geier.json hola.json hollywood-garbage.json hollywood-gin.json honest-john.json hoola.json hornafjar-armanni.json hosa-aba.json hose.json hou-zi-ba-pi.json house-of-cards.json hoyle.json humbug.json hundred-and-ten.json hungarian-domin-block-game.json hungarian-domin-draw-game.json hungarian-tarokk.json hunter.json hurrikan.json huszashivasos-tarokk.json huutopussi.json hwatu.json hyakunin-isshu.json illustrated-tarokk-hungarian.json indian-poker-bull.json indian-poker-red-dog-high-card.json indian-poker.json indian-rummy.json indonesian-baccarat.json indonesian-poker.json ino-shika-cho.json irish-don.json irish-poker.json italian-dominoes.json italian-poker.json j-m-p-o.json jamaican-dominoes.json james-bond.json jeu-de-carte-sipa.json jhyap-yaniv.json jhyap.json jielong.json jjak-mat-chu-gi.json jo-jotte.json joffre.json joker-karo.json joker.json ju-ma-pao.json jukha.json mah-jong.json mahjong-riichi.json okey-turkish.json okey.json pai-hong.json palatinusz-tarokk-hungarian.json pan-polish.json pandoeren.json panguingue.json papillon-fishing.json partner-dominoes-jamaican.json partnership-dominoes.json pas-seul.json paskievics-tarokk.json pass-the-trash.json passing-dominoes.json paston-armenian-trick.json paston.json paublillo.json pedro-sancho.json peeso-horns.json pegs-and-jokers-hybrid.json pegs-and-jokers.json pelmanism.json pennies-from-heaven.json pepper.json perevodnoy-durak.json perlaggen.json perudo-bluff.json petit-paquet-gambling.json petrangola.json petteia-greek.json pick-a-partner.json piedicavallo-tarocchi.json pig.json pilotta.json pinochle-double-deck.json pinochle-single-deck-partnership.json pinochle-three-player.json pinochle-two-player.json pinochle.json pip-pip.json piquet-classic.json piquet.json pirate-bridge.json pishe-pasha.json pisti-turkish.json pitch-fish.json pitch-oklahoma.json pitch-tunkhannock.json pitch.json pizzichino.json plait-solitaire.json plus-minus-jass.json poch.json pokerize.json polignac-french.json polignac.json polish-bank-gambling.json polish-red-dog.json pollack.json pontoon.json pope-joan.json prefa.json prefer-nsz-donauschwaben.json preferans-russian-classic.json preferans-russian.json preference.json president.json price-is-right.json primero.json primiera-historical.json prostoy-durak.json proter.json psycho-poker.json pukk-icelandic-poch.json pulle.json push-poker.json put.json pyanitsa-drunkard.json pyramid.json pyramide-french-drinking.json ta-gou-ta-doi.json tarocchi-bolognesi.json tarocchi-sicilian.json tarokk-hungarian.json teen-do-panch.json telefunken.json tiddly-wink-american.json tiddly-wink-british.json treikort.json troggu.json tuxedo.json vier-anderle.json whot-british.json
`.trim().split(/\s+/);
const script = [];
const manual = [];
const validButNoMap = [];
for (const basename of deckErrorFiles) {
    const filePath = path.join(PROCESSED_GAMES_DIR, basename);
    if (!fs.existsSync(filePath)) {
        manual.push(basename + " (missing)");
        continue;
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const engine = data?.engine ?? {};
    const d = String(engine.deckType ?? "").trim();
    const s = String(engine.suitSet ?? "").trim();
    const r = String(engine.rankSet ?? "").trim();
    if (d === "Custom" || s === "Custom" || r === "Custom" || d === "NA" || d === "Unknown" || d === "unknown" || d === "") {
        manual.push(basename);
        continue;
    }
    if (!isValidDeckTriple(d, s, r)) {
        manual.push(basename);
        continue;
    }
    const key = tripleKey(d, s, r);
    if (SCRIPT_TRIPLES.has(key)) {
        script.push(basename);
    }
    else {
        validButNoMap.push(basename + " (" + d + " / " + s + " / " + r + ")");
    }
}
console.log("=== SCRIPT can fill (valid triple + in map, just need run fill-standard-deck-descriptions:write) ===");
console.log(script.length);
script.forEach((f) => console.log("  " + f));
console.log("\n=== MANUAL / read HTML (Custom, NA, or invalid triple) ===");
console.log(manual.length);
manual.forEach((f) => console.log("  " + f));
console.log("\n=== Valid triple but NOT in script map (add to STANDARD_DESCRIPTIONS then run script, or fix manually) ===");
console.log(validButNoMap.length);
validButNoMap.forEach((f) => console.log("  " + f));
console.log("\n--- Summary ---");
console.log("Script-fillable: " + script.length);
console.log("Manual / read HTML: " + manual.length);
console.log("Valid but not in map: " + validButNoMap.length);
