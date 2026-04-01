#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { PROCESSED_GAMES_DIR } from "../paths.js";
import { isValidDeckTriple } from "@ocentra/game-domain/deck/deckCompatibility";
const MIN_WORDS = 15;
function die(msg) {
    console.error(msg);
    process.exit(1);
}
function wordCount(s) {
    return s.trim().split(/\s+/).filter(Boolean).length;
}
function isShortOrEmpty(s) {
    if (s == null || s.trim() === "")
        return true;
    return wordCount(s) < MIN_WORDS;
}
function walkJsonFiles(dir) {
    const out = [];
    const stack = [dir];
    while (stack.length) {
        const d = stack.pop();
        const entries = fs.readdirSync(d, { withFileTypes: true });
        for (const ent of entries) {
            const full = path.join(d, ent.name);
            if (ent.isDirectory())
                stack.push(full);
            else if (ent.isFile() && ent.name.toLowerCase().endsWith(".json"))
                out.push(full);
        }
    }
    return out.sort();
}
function readJson(p) {
    try {
        return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
    catch (e) {
        die(`FAIL: Could not read/parse JSON: ${p}\n${String(e)}`);
    }
}
const STANDARD_DESCRIPTIONS = {
    "Standard 52\0French\0Standard_52": { deck: "A standard 52-card French deck comprising four suits: Hearts, Diamonds, Clubs, and Spades. Each suit contains thirteen ranks: Ace, 2 through 10, Jack, Queen, and King, providing versatile options for various card games." },
    "Standard 52 + Joker(s)\0French\0Standard_52": { deck: "A standard 52-card French deck plus one or more Jokers. Four suits (Hearts, Diamonds, Clubs, Spades) with thirteen ranks each (Ace through King); Jokers are used as wild cards or as specified in the game rules." },
    "Standard 48\0French\0Pinochle_48": { deck: "A 48-card Pinochle deck: two copies of 9, 10, Jack, Queen, King, and Ace in each of the four French suits (Hearts, Diamonds, Clubs, Spades), used for melding and trick-taking in Pinochle and related games." },
    "Standard 48\0Spanish\0Stripped_48": { deck: "A 48-card Spanish deck with four suits and ranks typically 1 through 12 (or equivalent), used in many Spanish and Latin American card games; composition may vary by region." },
    "Standard 40\0French\0Stripped_40": { deck: "A 40-card French deck formed by removing the 8s, 9s, and 10s from a standard 52-card pack, leaving Ace through 7 plus face cards (Jack, Queen, King) in each of the four French suits." },
    "Standard 40\0Italian\0Stripped_40": { deck: "A 40-card Italian deck with four suits (typically Cups, Coins, Swords, Batons) and ranks 1 through 7 plus three face cards per suit, used in games such as Briscola and Scopa." },
    "Standard 40\0Spanish\0Stripped_40": { deck: "A 40-card Spanish deck with four suits and ranks 1 through 7 plus face cards (e.g. Sota, Caballo, Rey), used in many Spanish and Latin American games." },
    "Standard 40\0Portuguese\0Stripped_40": { deck: "A 40-card Portuguese deck with four suits and stripped ranks, used in traditional Portuguese card games; structure is similar to Spanish or Italian 40-card packs." },
    "Standard 36\0French\0Stripped_36": { deck: "A 36-card French deck formed by removing ranks 2 through 5 from a standard pack, leaving 6, 7, 8, 9, 10, Jack, Queen, King, and Ace in each of the four French suits." },
    "Standard 36\0German\0Stripped_36": { deck: "A 36-card German deck with four suits (Hearts, Bells, Acorns, Leaves) and ranks 6 through 10 plus Unter, Ober, King, and Ace (or equivalent), used in games such as Skat and Schafkopf." },
    "Standard 32\0French\0Stripped_32": { deck: "A 32-card French deck formed by removing ranks 2 through 6 from a standard pack, leaving 7, 8, 9, 10, Jack, Queen, King, and Ace in each of the four French suits." },
    "Standard 32\0German\0Stripped_32": { deck: "A 32-card German deck with four suits (Hearts, Bells, Acorns, Leaves) and ranks 7 through 10 plus Unter, Ober, King, and Ace, used in many Central European card games." },
    "Standard 32 + Joker(s)\0French\0Stripped_32": { deck: "A 32-card French deck (7 through Ace in each of four suits) plus one or more Jokers, used in games that combine a stripped pack with wild or special cards." },
    "Standard 32 + Joker(s)\0German\0Stripped_32": { deck: "A 32-card German deck (four suits, ranks 7 through Ace) plus Jokers, used in games that require a stripped German pack with wild cards." },
    "Standard 24\0French\0Stripped_24": { deck: "A 24-card French deck typically containing 9, 10, Jack, Queen, King, and Ace in each of the four French suits, used in games such as some variants of Euchre or Pinochle." },
    "Standard 24\0German\0Stripped_24": { deck: "A 24-card German deck with four German suits and a stripped rank set, used in regional trick-taking and other card games." },
    "Standard 44\0French\0Stripped_44": { deck: "A 44-card French deck formed by removing certain ranks from a standard 52-card pack, leaving a custom rank set in each of the four French suits, as used in specific game variants." },
    "Double 52\0French\0Standard_52": { deck: "Two standard 52-card French decks shuffled together (104 cards total), with four suits and thirteen ranks each per deck, used in games requiring a double pack." },
    "Double 32\0French\0Stripped_32": { deck: "Two 32-card French decks (7 through Ace in each suit) combined, used in games that require a double stripped pack." },
    "Double 32\0German\0Stripped_32": { deck: "Two 32-card German decks combined, with four German suits and stripped ranks, used in games such as Doppelkopf." },
    "Double 24\0French\0Stripped_24": { deck: "Two 24-card French decks combined, used in games that require a double stripped pack of 24 cards per deck." },
    "Double 24\0German\0Stripped_24": { deck: "Two 24-card German decks combined, used in regional games that require a double stripped German pack." },
    "Quad 36\0French\0Stripped_36": { deck: "Four 36-card French decks combined (144 cards), with 6 through Ace in each of four French suits per deck, used in games requiring a quad pack." },
    "Quad 40\0French\0Stripped_40": { deck: "Four 40-card French decks combined, used in games that require a quad stripped pack." },
    "Tarot 78\0French\0Tarot_78": { deck: "A 78-card French Tarot deck with 21 numbered trumps plus the Excuse, and four French suits ranked King, Queen, Cavalier, Jack, 10 down to 1 in each suit." },
    "Tarot 78\0French_tarock\0Tarot_78": { deck: "A 78-card French-suited historical tarock deck with 21 numbered trumps plus the Fool and four French suits, used in older Alpine tarock games." },
    "Tarot 78\0Tarot_de_Marseille\0Tarot_78": { deck: "A 78-card Tarot de Marseille deck with 21 trumps plus the Fool and four Latin suits: Swords, Batons, Cups, and Coins, each containing ten pip cards and four courts (Jack, Cavalier, Queen, King)." },
    "Tarot 78\0Swiss_1JJ\0Tarot_78": { deck: "A 78-card Swiss 1JJ tarot deck with Italian suits (Swords, Batons, Cups, Coins), 21 trumps, and the Fool, used for Troccas and the full Swiss tarot family." },
    "Tarot 62\0Swiss_1JJ\0Tarot_62": { deck: "A 62-card reduced Swiss 1JJ tarot deck: 21 trumps plus the Fool and 40 suit cards, made by removing Ace through 4 from Swords and Batons and 7 through 10 from Cups and Coins." },
    "Tarot 62\0Tarocco_Piemontese\0Tarot_62": { deck: "A 62-card reduced Tarocco Piemontese deck with 21 trumps plus the Fool and 40 Italian-suited cards, formed by removing Ace through 4 from Swords and Batons and 7 through 10 from Cups and Coins." },
    "Tarot 54\0Industrie_und_Glueck\0Tarot_54": { deck: "A 54-card Industrie und Glück tarock deck with 21 numbered trumps plus the Sküs and 32 suit cards: black suits keep King, Queen, Cavalier, Jack, 10, 9, 8, 7; red suits keep King, Queen, Cavalier, Jack, Ace, 2, 3, 4." },
    "Tarot 54\0Cego\0Tarot_54": { deck: "A 54-card Cego-family tarock deck with the same reduced tarot structure as the Austrian 54-card pack: 22 trumps including the Fool and 32 French-suited cards." },
    "Tarot 40\0Industrie_und_Glueck\0Tarot_40": { deck: "A 40-card Industrie und Glück tarock pack used for Zwanzigerrufen: 20 tarocks (Sküs, I, and IV through XXI) plus 20 suit cards, with black suits keeping King, Queen, Cavalier, Jack, 10 and red suits keeping King, Queen, Cavalier, Jack, Ace." },
    "Tarot 66\0French_tarock\0Tarot_66": { deck: "A 66-card French-suited tarock deck with 21 trumps plus the Fool and 44 suit cards; black suits keep King, Queen, Cavalier, Jack, 10 down to 4, while red suits keep King, Queen, Cavalier, Jack, Ace down to 7." },
    "Tarot 66\0Tarot_de_Marseille\0Tarot_66": { deck: "A 66-card Tarot de Marseille pack with 21 trumps plus the Fool and 44 Italian-suited cards; Swords and Batons keep King, Queen, Cavalier, Jack, 10 down to 4, while Cups and Coins keep King, Queen, Cavalier, Jack, Ace down to 7." },
    "Tarot 42\0Industrie_und_Glueck\0Tarot_42": { deck: "A 42-card Industrie und Glück tarock deck with 21 numbered trumps plus the Sküs and 20 suit cards; black suits keep King, Queen, Cavalier, Jack, 10 and red suits keep King, Queen, Cavalier, Jack, Ace." },
    "Double-6 Dominoes\0Dominoes\0Domino_double6": { deck: "A standard double-6 domino set of 28 tiles: each tile has two ends with values 0 through 6, with every combination represented once, used in blocking and drawing domino games." },
    "Double-9 Dominoes\0Dominoes\0Domino_double9": { deck: "A double-9 domino set of 55 tiles with values 0 through 9 on each end, used in domino games that require a larger set." },
    "Double-12 Dominoes\0Dominoes\0Domino_double12": { deck: "A double-12 domino set of 91 tiles with values 0 through 12 on each end, used in domino games that require a large set." },
    "Hanafuda 48\0Hanafuda\0Hanafuda": { deck: "A 48-card Hanafuda (flower card) deck with 12 suits of 4 cards each, each suit representing a month and featuring traditional Japanese floral and cultural imagery, used in games such as Koi-Koi and Hana-Awase." },
    "Hanafuda 48\0Hanafuda_snow\0Hanafuda": { deck: "A 48-card Hanafuda deck in the Hanafuda_snow variant, with 12 months of 4 cards each and traditional Japanese flower and snow motifs." },
    "Hanafuda 52\0Hanafuda\0Hanafuda": { deck: "A 52-card Hanafuda-style deck, typically extending the standard 48-card Hanafuda set with additional cards for specific game variants." },
    "Kabufuda 40\0Kabufuda\0Kabufuda": { deck: "A 40-card Kabufuda deck used in Japanese gambling games; the deck has a distinct structure and symbolism compared to Hanafuda, with cards used in games such as Oicho-Kabu." },
    "Stripped 35\0French\0Stripped_35": { deck: "A 35-card French deck with a custom stripped rank set in each of the four French suits, used in specific game variants that require this composition." },
    "Chinese domino 32\0Chinese_domino\0Chinese_domino": { deck: "A set of 32 Chinese domino tiles (or card equivalent), representing the 21 unique pairs of spots from double-blank to double-six, with 11 duplicated tiles, used in many Chinese domino games such as Tien Gow and Pai Gow." },
    "Whot 54\0Whot\0Whot": { deck: "A 54-card Whot deck with five pictorial suits (circles, triangles, squares, crosses, stars) and numerical ranks plus special action cards (e.g. market, pick-two, hold on, general market), used in Nigerian and West African card games." },
    "Mahjong 144\0Mahjong\0Mahjong": { deck: "A 144-tile Mahjong set with three suits (dots, bamboo, characters) of nine values each, four copies per tile, plus honor tiles (winds and dragons) and optional flowers or seasons, used in Mahjong and variants such as Riichi." },
};
const FALLBACK_SUIT_RANK = "Suits and ranks are as defined in the deck description above; no separate suit or rank set is used for this game.";
function tripleKey(deckType, suitSet, rankSet) {
    return `${deckType}\0${suitSet}\0${rankSet}`;
}
function main() {
    const argv = process.argv.slice(2);
    const write = argv.includes("--write");
    const dryRun = !write;
    const dir = argv.includes("--dir") ? (argv[argv.indexOf("--dir") + 1] ?? PROCESSED_GAMES_DIR) : PROCESSED_GAMES_DIR;
    const resolvedDir = path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
    if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
        die(`Not a directory: ${resolvedDir}`);
    }
    const files = walkJsonFiles(resolvedDir);
    let updated = 0;
    let skipped = 0;
    for (const filePath of files) {
        const data = readJson(filePath);
        const engine = data?.engine ?? {};
        const deckType = String(engine.deckType ?? "").trim();
        const suitSet = String(engine.suitSet ?? "").trim();
        const rankSet = String(engine.rankSet ?? "").trim();
        if (deckType === "Custom" || suitSet === "Custom" || rankSet === "Custom") {
            skipped++;
            continue;
        }
        if (!isValidDeckTriple(deckType, suitSet, rankSet)) {
            skipped++;
            continue;
        }
        const key = tripleKey(deckType, suitSet, rankSet);
        const standard = STANDARD_DESCRIPTIONS[key];
        const needDeck = isShortOrEmpty(engine.deckDescription);
        const needSuit = isShortOrEmpty(engine.suitDescription);
        const needRank = isShortOrEmpty(engine.rankDescription);
        if (!needDeck && !needSuit && !needRank) {
            skipped++;
            continue;
        }
        if (needDeck && !standard?.deck) {
            skipped++;
            continue;
        }
        if (dryRun) {
            console.log(path.basename(filePath));
            if (needDeck && standard?.deck)
                console.log("  deckDescription -> set");
            if (needSuit)
                console.log("  suitDescription -> set");
            if (needRank)
                console.log("  rankDescription -> set");
            updated++;
            continue;
        }
        if (needDeck && standard?.deck) {
            engine.deckDescription = standard.deck;
        }
        if (needSuit) {
            engine.suitDescription = standard?.suit ?? FALLBACK_SUIT_RANK;
        }
        if (needRank) {
            engine.rankDescription = standard?.rank ?? FALLBACK_SUIT_RANK;
        }
        data.engine = engine;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
        console.log(`Wrote ${path.basename(filePath)}`);
        updated++;
    }
    console.log("");
    console.log(`Done. Updated: ${updated}, skipped: ${skipped}`);
    if (dryRun && updated > 0) {
        console.log("Run with --write to apply changes.");
    }
}
main();
