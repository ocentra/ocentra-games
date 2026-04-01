import { z } from "zod";
declare const overviewSchema: z.ZodEffects<z.ZodObject<{
    description: z.ZodString;
    category: z.ZodEnum<["Abstract strategy", "Accumulation", "Banking", "Climbing", "Domino", "Fishing", "Gambling", "Matching", "Miscellaneous", "Other", "Patience", "Poker", "Race", "Rummy", "Shedding", "Social", "Tile", "Trick-taking", "Unknown", "Vying", "War"]>;
    subCategory: z.ZodUnion<[z.ZodEnum<["2-Player / Card Battle", "21 / Blackjack Variant", "Ace-Ten / Draw", "Ace-Ten / Jass", "All Fours / Dom Pedro Family", "All Fours / Pitch", "Andar Bahar", "Arithmetic Capture", "Arithmetic Capture / Sweep", "Asymmetrical Point-trick", "Attack-Defense", "Attack-Defense / Transfer", "Auction / Preference", "Auction Whist", "Auction Whist / Belgian Whist", "Avoidance", "Avoidance / Elimination", "Avoidance / Hearts Family", "Avoidance / Misere", "Baccarat Family", "Banking", "Beating", "Belote Family", "Bid Euchre", "Bidding", "Bidding / Partnership", "Bidding / Social", "Blind / Social", "Block / Blind", "Block / Line Game", "Bluffing", "Board + Cards", "Board / Multi-stage", "Board-Card Hybrid", "Board-Card Hybrid / Sequence", "Brag Variant", "Bridge Family", "Building Capture", "Canasta / Hand and Foot", "Canasta Family / Partnership", "Canasta Variant", "Capture / Elimination", "Capture / Matching", "Capture / Ronda", "Capturing", "Casino", "Casino / Capture", "Casino / High-Roller", "Casino / High-Stake", "Casino Family", "Casino Poker", "Children's", "Chinese Dominoes", "Chosen Suit", "Classic Point-scoring", "Classic Point-scoring (American)", "Classic Point-scoring (Caribbean)", "Classic Point-scoring (Regional)", "Climbing", "Climbing / Rank-exchange", "Combination / Comparison", "Combination Capture", "Community Card", "Community Card / High-Low Split", "Compendium", "Connecting / Matador", "Connecting / Train", "Contract / Meld-Capture", "Contract Rummy", "Contracts", "Crazy Eights", "Crazy Eights Variant", "Cribbage ancestor", "Cross", "Cross / Block Game", "Cross Layout", "Domino / Adding", "Draw", "Draw / Lowball", "Draw Game / European", "Draw Game / Gambling", "Draw Poker", "Draw and Discard", "Draw and Discard / Meld", "Draw and Replace", "Draw-Discard / Meld", "Draw-Meld (Ancestor Rummy)", "Draw-and-Discard", "Draw-and-Discard / Basic Rummy", "Eights family", "Euchre / Auction", "Euchre Family / Individual", "Evasion", "Evolving-Hand Bidding", "Exact Bidding", "Exact Bidding / Special Deals", "Fives and Threes Family", "Follow-Suit / Inflation", "Gambling", "Gambling / Banking", "Gambling / Card Race", "Gaps / Solitaire", "Hanafuda", "Hand Building", "Hearts / Penalty Avoidance", "Hidden Partnership", "High-Low Stud", "Hombre / Point-trick", "Hombre Family", "House Game / Stud Poker", "Indian Partnership", "Indian Poker / Vying", "Individual Bidding / Fixed Trump", "Inflation / Follow-Suit Shedding", "Irish/British Traditional", "Italian", "Jass", "Jass / Ace-Ten / Marriage", "Jass / Belote", "Jass / Bidding", "Jass / Marriage", "Jass / Marriage Family", "Jass / Point-trick", "Jass Family", "Jass Family / Point-Trick", "Jass-Tarokk Fusion", "Karnöffel-style", "Last-Trick", "Last-Trick / Betting", "Last-trick", "Last-trick / Elimination", "Last-trick / Knocking", "Layout / Grid-Based", "Layout / Power Card", "Line / Block Game", "Line / Draw", "Line / Partnership", "Line / Scoring", "Lose Last Trick", "Lowball", "Lowball Draw", "Lowball Stud", "Manipulation", "Manipulation / Contract Rummy", "Mariage / Call", "Marriage", "Marriage / Ace-Ten", "Marriage Group", "Matching", "Matching / Eights Family", "Matching / Melding", "Medieval", "Meld and Layoff", "Melding", "Melding / Pay-Card Gambling", "Memory", "Memory / Partnership", "Memory / Quartets", "Mixed", "Multi-Layer", "Non-Builder", "Nordic Casino", "One-Deck", "Open Information", "Open Packer", "Pai Gow / Casino Game", "Pair Collection", "Partition / Banking", "Partition / Points-Based", "Partitioning", "Partnership", "Partnership / Bidding", "Partnership / Contract Bidding", "Partnership / Draw-and-Discard", "Partnership / Hidden Trump", "Partnership / Personal Trump", "Partnership / Secret Alliance", "Partnership / Shedding", "Partnership Line Game", "Partnership Meld / Draw-Discard", "Partnership Signal", "Partnership with Secret Alliances", "Penalty / Pot-building", "Pitch / All Fours Family", "Plain Tricks / No Trump", "Plain-Trick", "Plain-trick Whist", "Plain-trick with Trump", "Point-Trick", "Point-Trick / All Fours", "Point-Trick / Draw", "Point-collection", "Point-oriented / Cross", "Point-trick", "Point-trick / No Trump", "Point-trick with Bidding", "Poker Family", "Poker Hand Collection", "Poker-based", "Preference / Auction", "Pure Chance", "Puzzle", "Quartet / Collecting", "Quartet / Go Fish", "Quartets", "Quota / Card Exchange", "Quota / Exchange", "Quota Whist", "Rams / Bid", "Rams / Gambling", "Rams / Ramsch", "Reaction / Children's", "Rummy / Set-Collection", "Rummy-like", "Schafkopf / Kop Family", "Schafkopf Family", "Scopa / Capture", "Scopa Family", "Scopa-variant", "Secret Partnership", "Secret Partnership (Boston)", "Sedma / Point-trick", "Seven Card Stud / Split Pot", "Seven Card Stud Variant", "Shared Card / Omaha Variant", "Shedding", "Shedding / Deduction", "Shedding / Hidden Role", "Short Hand / Truco-like", "Showdown / Prime", "Slap Game", "Slap-Jack family", "Social / Party", "Social Drinking", "Social Hierarchy", "Solitaire", "Solitaire-style", "Solo Whist / Contract", "Solo vs Partnership", "Spanish Deck Games", "Speed", "Speed Match", "Split-Target Totaling", "Stud", "Stud / Community Card", "Stud / Exchange", "Stud / Lowball", "Stud / Penalty", "Stud / Roll-Your-Own", "Stud / Wild Cards", "Stud Poker", "Stud Variant", "Stud/Draw Hybrid", "Tarokk / Preferansz Family", "Tarot", "Tarot / Ace-Ten", "Tile", "Traditional Chinese", "Train Building", "Tressette / Italian", "Tressette Family", "Trick Avoidance / Reverse", "Trick-Avoidance", "Trick-Taking / Children's Game", "Trick-avoidance", "Trick-taking", "Trick-taking / Avoidance", "Trick-taking / Chinese Dominoes", "Trick-taking / Multi-game", "Triple Draw / High-Low Split", "Triple Draw / Split Pot", "Two-Deck Patience", "Two-Phase", "Two-Player Draw-and-Discard", "Two-phase", "Two-player", "Vying", "War / Accumulation", "Watten Family / Alpine Games", "Whist", "Whist / Ancestor", "Whist / Bridge Family", "Whist Family", "Whist Family (Somali)", "Whist Variant", "Wild Card Stud"]>, z.ZodNull]>;
    origin: z.ZodString;
    originName: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    playerMode: z.ZodEnum<["singleplayer", "multiplayer"]>;
    players: z.ZodObject<{
        minPlayers: z.ZodNumber;
        maxPlayers: z.ZodNumber;
        recommendedPlayers: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodNull]>>;
        display: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    }, "strict", z.ZodTypeAny, {
        minPlayers: number;
        maxPlayers: number;
        recommendedPlayers?: number | null | undefined;
        display?: string | null | undefined;
    }, {
        minPlayers: number;
        maxPlayers: number;
        recommendedPlayers?: number | null | undefined;
        display?: string | null | undefined;
    }>;
    deckType: z.ZodOptional<z.ZodEnum<["Standard 52", "Standard 52 + Joker(s)", "Standard 48", "Standard 40", "Standard 36", "Standard 32", "Standard 32 + Joker(s)", "Standard 44", "Standard 24", "Double 52", "Double 52 + 4 Jokers", "Double 32", "Double 24", "Quad 36", "Quad 40", "Oct 40", "Quad 52 + 8 Jokers", "Triple 52 + 6 Jokers", "Gnav 42", "Goita 32", "Rook 56", "Xiangqi 32", "Four Color 112", "Tarot 78", "Tarot 62", "Minchiate 97", "Tarot 54", "Tarot 40", "Tarot 66", "Tarot 42", "Cego 38", "Tarocco Bolognese 62", "Tarocco Siciliano 64", "500 deck 63", "Double-6 Dominoes", "Double-6 Dominoes x2", "Double-6 Dominoes x4", "Double-8 Dominoes", "Double-9 Dominoes", "Double-12 Dominoes", "Double-15 Dominoes", "Double-6 + Double-12 Dominoes", "Double-9 + Double-12 Dominoes", "Chinese domino 32", "Chinese domino 84", "Hanafuda 48", "Hanafuda 52", "Kabufuda 40", "Mahjong 136", "Mahjong 144", "Mahjong 148", "Mahjong 152", "Mahjong 160", "Khorol 60", "Daaluu 64", "Money-suited 39", "Money-suited 38", "Ganjifa", "Whot 54", "Okey 106", "Unsun Karuta 75", "Komatsufuda 48", "Uta-garuta 200", "Iroha Karuta 96", "Ceki 60", "To_tom 120", "Bai_choi 33", "Madiao 40", "Khanhoo 30", "Tehonbiki 48", "Stripped 35", "Standard 30", "Standard 28", "Standard 26", "Standard 16", "Treikort 27", "Tiddlywink", "Hols der Geier 75", "Numbered 104"]>>;
    deck: z.ZodEffects<z.ZodString, string, string>;
    difficulty: z.ZodEnum<["Beginner", "Intermediate", "Expert"]>;
    duration: z.ZodString;
    hasPlaceholders: z.ZodBoolean;
}, "strict", z.ZodTypeAny, {
    description: string;
    origin: string;
    players: {
        minPlayers: number;
        maxPlayers: number;
        recommendedPlayers?: number | null | undefined;
        display?: string | null | undefined;
    };
    deck: string;
    difficulty: "Beginner" | "Intermediate" | "Expert";
    duration: string;
    category: "Abstract strategy" | "Accumulation" | "Banking" | "Climbing" | "Domino" | "Fishing" | "Gambling" | "Matching" | "Miscellaneous" | "Other" | "Patience" | "Poker" | "Race" | "Rummy" | "Shedding" | "Social" | "Tile" | "Trick-taking" | "Unknown" | "Vying" | "War";
    subCategory: "Banking" | "Climbing" | "Gambling" | "Matching" | "Shedding" | "Tile" | "Trick-taking" | "Vying" | "2-Player / Card Battle" | "21 / Blackjack Variant" | "Ace-Ten / Draw" | "Ace-Ten / Jass" | "All Fours / Dom Pedro Family" | "All Fours / Pitch" | "Andar Bahar" | "Arithmetic Capture" | "Arithmetic Capture / Sweep" | "Asymmetrical Point-trick" | "Attack-Defense" | "Attack-Defense / Transfer" | "Auction / Preference" | "Auction Whist" | "Auction Whist / Belgian Whist" | "Avoidance" | "Avoidance / Elimination" | "Avoidance / Hearts Family" | "Avoidance / Misere" | "Baccarat Family" | "Beating" | "Belote Family" | "Bid Euchre" | "Bidding" | "Bidding / Partnership" | "Bidding / Social" | "Blind / Social" | "Block / Blind" | "Block / Line Game" | "Bluffing" | "Board + Cards" | "Board / Multi-stage" | "Board-Card Hybrid" | "Board-Card Hybrid / Sequence" | "Brag Variant" | "Bridge Family" | "Building Capture" | "Canasta / Hand and Foot" | "Canasta Family / Partnership" | "Canasta Variant" | "Capture / Elimination" | "Capture / Matching" | "Capture / Ronda" | "Capturing" | "Casino" | "Casino / Capture" | "Casino / High-Roller" | "Casino / High-Stake" | "Casino Family" | "Casino Poker" | "Children's" | "Chinese Dominoes" | "Chosen Suit" | "Classic Point-scoring" | "Classic Point-scoring (American)" | "Classic Point-scoring (Caribbean)" | "Classic Point-scoring (Regional)" | "Climbing / Rank-exchange" | "Combination / Comparison" | "Combination Capture" | "Community Card" | "Community Card / High-Low Split" | "Compendium" | "Connecting / Matador" | "Connecting / Train" | "Contract / Meld-Capture" | "Contract Rummy" | "Contracts" | "Crazy Eights" | "Crazy Eights Variant" | "Cribbage ancestor" | "Cross" | "Cross / Block Game" | "Cross Layout" | "Domino / Adding" | "Draw" | "Draw / Lowball" | "Draw Game / European" | "Draw Game / Gambling" | "Draw Poker" | "Draw and Discard" | "Draw and Discard / Meld" | "Draw and Replace" | "Draw-Discard / Meld" | "Draw-Meld (Ancestor Rummy)" | "Draw-and-Discard" | "Draw-and-Discard / Basic Rummy" | "Eights family" | "Euchre / Auction" | "Euchre Family / Individual" | "Evasion" | "Evolving-Hand Bidding" | "Exact Bidding" | "Exact Bidding / Special Deals" | "Fives and Threes Family" | "Follow-Suit / Inflation" | "Gambling / Banking" | "Gambling / Card Race" | "Gaps / Solitaire" | "Hanafuda" | "Hand Building" | "Hearts / Penalty Avoidance" | "Hidden Partnership" | "High-Low Stud" | "Hombre / Point-trick" | "Hombre Family" | "House Game / Stud Poker" | "Indian Partnership" | "Indian Poker / Vying" | "Individual Bidding / Fixed Trump" | "Inflation / Follow-Suit Shedding" | "Irish/British Traditional" | "Italian" | "Jass" | "Jass / Ace-Ten / Marriage" | "Jass / Belote" | "Jass / Bidding" | "Jass / Marriage" | "Jass / Marriage Family" | "Jass / Point-trick" | "Jass Family" | "Jass Family / Point-Trick" | "Jass-Tarokk Fusion" | "Karnöffel-style" | "Last-Trick" | "Last-Trick / Betting" | "Last-trick" | "Last-trick / Elimination" | "Last-trick / Knocking" | "Layout / Grid-Based" | "Layout / Power Card" | "Line / Block Game" | "Line / Draw" | "Line / Partnership" | "Line / Scoring" | "Lose Last Trick" | "Lowball" | "Lowball Draw" | "Lowball Stud" | "Manipulation" | "Manipulation / Contract Rummy" | "Mariage / Call" | "Marriage" | "Marriage / Ace-Ten" | "Marriage Group" | "Matching / Eights Family" | "Matching / Melding" | "Medieval" | "Meld and Layoff" | "Melding" | "Melding / Pay-Card Gambling" | "Memory" | "Memory / Partnership" | "Memory / Quartets" | "Mixed" | "Multi-Layer" | "Non-Builder" | "Nordic Casino" | "One-Deck" | "Open Information" | "Open Packer" | "Pai Gow / Casino Game" | "Pair Collection" | "Partition / Banking" | "Partition / Points-Based" | "Partitioning" | "Partnership" | "Partnership / Bidding" | "Partnership / Contract Bidding" | "Partnership / Draw-and-Discard" | "Partnership / Hidden Trump" | "Partnership / Personal Trump" | "Partnership / Secret Alliance" | "Partnership / Shedding" | "Partnership Line Game" | "Partnership Meld / Draw-Discard" | "Partnership Signal" | "Partnership with Secret Alliances" | "Penalty / Pot-building" | "Pitch / All Fours Family" | "Plain Tricks / No Trump" | "Plain-Trick" | "Plain-trick Whist" | "Plain-trick with Trump" | "Point-Trick" | "Point-Trick / All Fours" | "Point-Trick / Draw" | "Point-collection" | "Point-oriented / Cross" | "Point-trick" | "Point-trick / No Trump" | "Point-trick with Bidding" | "Poker Family" | "Poker Hand Collection" | "Poker-based" | "Preference / Auction" | "Pure Chance" | "Puzzle" | "Quartet / Collecting" | "Quartet / Go Fish" | "Quartets" | "Quota / Card Exchange" | "Quota / Exchange" | "Quota Whist" | "Rams / Bid" | "Rams / Gambling" | "Rams / Ramsch" | "Reaction / Children's" | "Rummy / Set-Collection" | "Rummy-like" | "Schafkopf / Kop Family" | "Schafkopf Family" | "Scopa / Capture" | "Scopa Family" | "Scopa-variant" | "Secret Partnership" | "Secret Partnership (Boston)" | "Sedma / Point-trick" | "Seven Card Stud / Split Pot" | "Seven Card Stud Variant" | "Shared Card / Omaha Variant" | "Shedding / Deduction" | "Shedding / Hidden Role" | "Short Hand / Truco-like" | "Showdown / Prime" | "Slap Game" | "Slap-Jack family" | "Social / Party" | "Social Drinking" | "Social Hierarchy" | "Solitaire" | "Solitaire-style" | "Solo Whist / Contract" | "Solo vs Partnership" | "Spanish Deck Games" | "Speed" | "Speed Match" | "Split-Target Totaling" | "Stud" | "Stud / Community Card" | "Stud / Exchange" | "Stud / Lowball" | "Stud / Penalty" | "Stud / Roll-Your-Own" | "Stud / Wild Cards" | "Stud Poker" | "Stud Variant" | "Stud/Draw Hybrid" | "Tarokk / Preferansz Family" | "Tarot" | "Tarot / Ace-Ten" | "Traditional Chinese" | "Train Building" | "Tressette / Italian" | "Tressette Family" | "Trick Avoidance / Reverse" | "Trick-Avoidance" | "Trick-Taking / Children's Game" | "Trick-avoidance" | "Trick-taking / Avoidance" | "Trick-taking / Chinese Dominoes" | "Trick-taking / Multi-game" | "Triple Draw / High-Low Split" | "Triple Draw / Split Pot" | "Two-Deck Patience" | "Two-Phase" | "Two-Player Draw-and-Discard" | "Two-phase" | "Two-player" | "War / Accumulation" | "Watten Family / Alpine Games" | "Whist" | "Whist / Ancestor" | "Whist / Bridge Family" | "Whist Family" | "Whist Family (Somali)" | "Whist Variant" | "Wild Card Stud" | null;
    playerMode: "singleplayer" | "multiplayer";
    hasPlaceholders: boolean;
    originName?: string | null | undefined;
    deckType?: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104" | undefined;
}, {
    description: string;
    origin: string;
    players: {
        minPlayers: number;
        maxPlayers: number;
        recommendedPlayers?: number | null | undefined;
        display?: string | null | undefined;
    };
    deck: string;
    difficulty: "Beginner" | "Intermediate" | "Expert";
    duration: string;
    category: "Abstract strategy" | "Accumulation" | "Banking" | "Climbing" | "Domino" | "Fishing" | "Gambling" | "Matching" | "Miscellaneous" | "Other" | "Patience" | "Poker" | "Race" | "Rummy" | "Shedding" | "Social" | "Tile" | "Trick-taking" | "Unknown" | "Vying" | "War";
    subCategory: "Banking" | "Climbing" | "Gambling" | "Matching" | "Shedding" | "Tile" | "Trick-taking" | "Vying" | "2-Player / Card Battle" | "21 / Blackjack Variant" | "Ace-Ten / Draw" | "Ace-Ten / Jass" | "All Fours / Dom Pedro Family" | "All Fours / Pitch" | "Andar Bahar" | "Arithmetic Capture" | "Arithmetic Capture / Sweep" | "Asymmetrical Point-trick" | "Attack-Defense" | "Attack-Defense / Transfer" | "Auction / Preference" | "Auction Whist" | "Auction Whist / Belgian Whist" | "Avoidance" | "Avoidance / Elimination" | "Avoidance / Hearts Family" | "Avoidance / Misere" | "Baccarat Family" | "Beating" | "Belote Family" | "Bid Euchre" | "Bidding" | "Bidding / Partnership" | "Bidding / Social" | "Blind / Social" | "Block / Blind" | "Block / Line Game" | "Bluffing" | "Board + Cards" | "Board / Multi-stage" | "Board-Card Hybrid" | "Board-Card Hybrid / Sequence" | "Brag Variant" | "Bridge Family" | "Building Capture" | "Canasta / Hand and Foot" | "Canasta Family / Partnership" | "Canasta Variant" | "Capture / Elimination" | "Capture / Matching" | "Capture / Ronda" | "Capturing" | "Casino" | "Casino / Capture" | "Casino / High-Roller" | "Casino / High-Stake" | "Casino Family" | "Casino Poker" | "Children's" | "Chinese Dominoes" | "Chosen Suit" | "Classic Point-scoring" | "Classic Point-scoring (American)" | "Classic Point-scoring (Caribbean)" | "Classic Point-scoring (Regional)" | "Climbing / Rank-exchange" | "Combination / Comparison" | "Combination Capture" | "Community Card" | "Community Card / High-Low Split" | "Compendium" | "Connecting / Matador" | "Connecting / Train" | "Contract / Meld-Capture" | "Contract Rummy" | "Contracts" | "Crazy Eights" | "Crazy Eights Variant" | "Cribbage ancestor" | "Cross" | "Cross / Block Game" | "Cross Layout" | "Domino / Adding" | "Draw" | "Draw / Lowball" | "Draw Game / European" | "Draw Game / Gambling" | "Draw Poker" | "Draw and Discard" | "Draw and Discard / Meld" | "Draw and Replace" | "Draw-Discard / Meld" | "Draw-Meld (Ancestor Rummy)" | "Draw-and-Discard" | "Draw-and-Discard / Basic Rummy" | "Eights family" | "Euchre / Auction" | "Euchre Family / Individual" | "Evasion" | "Evolving-Hand Bidding" | "Exact Bidding" | "Exact Bidding / Special Deals" | "Fives and Threes Family" | "Follow-Suit / Inflation" | "Gambling / Banking" | "Gambling / Card Race" | "Gaps / Solitaire" | "Hanafuda" | "Hand Building" | "Hearts / Penalty Avoidance" | "Hidden Partnership" | "High-Low Stud" | "Hombre / Point-trick" | "Hombre Family" | "House Game / Stud Poker" | "Indian Partnership" | "Indian Poker / Vying" | "Individual Bidding / Fixed Trump" | "Inflation / Follow-Suit Shedding" | "Irish/British Traditional" | "Italian" | "Jass" | "Jass / Ace-Ten / Marriage" | "Jass / Belote" | "Jass / Bidding" | "Jass / Marriage" | "Jass / Marriage Family" | "Jass / Point-trick" | "Jass Family" | "Jass Family / Point-Trick" | "Jass-Tarokk Fusion" | "Karnöffel-style" | "Last-Trick" | "Last-Trick / Betting" | "Last-trick" | "Last-trick / Elimination" | "Last-trick / Knocking" | "Layout / Grid-Based" | "Layout / Power Card" | "Line / Block Game" | "Line / Draw" | "Line / Partnership" | "Line / Scoring" | "Lose Last Trick" | "Lowball" | "Lowball Draw" | "Lowball Stud" | "Manipulation" | "Manipulation / Contract Rummy" | "Mariage / Call" | "Marriage" | "Marriage / Ace-Ten" | "Marriage Group" | "Matching / Eights Family" | "Matching / Melding" | "Medieval" | "Meld and Layoff" | "Melding" | "Melding / Pay-Card Gambling" | "Memory" | "Memory / Partnership" | "Memory / Quartets" | "Mixed" | "Multi-Layer" | "Non-Builder" | "Nordic Casino" | "One-Deck" | "Open Information" | "Open Packer" | "Pai Gow / Casino Game" | "Pair Collection" | "Partition / Banking" | "Partition / Points-Based" | "Partitioning" | "Partnership" | "Partnership / Bidding" | "Partnership / Contract Bidding" | "Partnership / Draw-and-Discard" | "Partnership / Hidden Trump" | "Partnership / Personal Trump" | "Partnership / Secret Alliance" | "Partnership / Shedding" | "Partnership Line Game" | "Partnership Meld / Draw-Discard" | "Partnership Signal" | "Partnership with Secret Alliances" | "Penalty / Pot-building" | "Pitch / All Fours Family" | "Plain Tricks / No Trump" | "Plain-Trick" | "Plain-trick Whist" | "Plain-trick with Trump" | "Point-Trick" | "Point-Trick / All Fours" | "Point-Trick / Draw" | "Point-collection" | "Point-oriented / Cross" | "Point-trick" | "Point-trick / No Trump" | "Point-trick with Bidding" | "Poker Family" | "Poker Hand Collection" | "Poker-based" | "Preference / Auction" | "Pure Chance" | "Puzzle" | "Quartet / Collecting" | "Quartet / Go Fish" | "Quartets" | "Quota / Card Exchange" | "Quota / Exchange" | "Quota Whist" | "Rams / Bid" | "Rams / Gambling" | "Rams / Ramsch" | "Reaction / Children's" | "Rummy / Set-Collection" | "Rummy-like" | "Schafkopf / Kop Family" | "Schafkopf Family" | "Scopa / Capture" | "Scopa Family" | "Scopa-variant" | "Secret Partnership" | "Secret Partnership (Boston)" | "Sedma / Point-trick" | "Seven Card Stud / Split Pot" | "Seven Card Stud Variant" | "Shared Card / Omaha Variant" | "Shedding / Deduction" | "Shedding / Hidden Role" | "Short Hand / Truco-like" | "Showdown / Prime" | "Slap Game" | "Slap-Jack family" | "Social / Party" | "Social Drinking" | "Social Hierarchy" | "Solitaire" | "Solitaire-style" | "Solo Whist / Contract" | "Solo vs Partnership" | "Spanish Deck Games" | "Speed" | "Speed Match" | "Split-Target Totaling" | "Stud" | "Stud / Community Card" | "Stud / Exchange" | "Stud / Lowball" | "Stud / Penalty" | "Stud / Roll-Your-Own" | "Stud / Wild Cards" | "Stud Poker" | "Stud Variant" | "Stud/Draw Hybrid" | "Tarokk / Preferansz Family" | "Tarot" | "Tarot / Ace-Ten" | "Traditional Chinese" | "Train Building" | "Tressette / Italian" | "Tressette Family" | "Trick Avoidance / Reverse" | "Trick-Avoidance" | "Trick-Taking / Children's Game" | "Trick-avoidance" | "Trick-taking / Avoidance" | "Trick-taking / Chinese Dominoes" | "Trick-taking / Multi-game" | "Triple Draw / High-Low Split" | "Triple Draw / Split Pot" | "Two-Deck Patience" | "Two-Phase" | "Two-Player Draw-and-Discard" | "Two-phase" | "Two-player" | "War / Accumulation" | "Watten Family / Alpine Games" | "Whist" | "Whist / Ancestor" | "Whist / Bridge Family" | "Whist Family" | "Whist Family (Somali)" | "Whist Variant" | "Wild Card Stud" | null;
    playerMode: "singleplayer" | "multiplayer";
    hasPlaceholders: boolean;
    originName?: string | null | undefined;
    deckType?: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104" | undefined;
}>, {
    description: string;
    origin: string;
    players: {
        minPlayers: number;
        maxPlayers: number;
        recommendedPlayers?: number | null | undefined;
        display?: string | null | undefined;
    };
    deck: string;
    difficulty: "Beginner" | "Intermediate" | "Expert";
    duration: string;
    category: "Abstract strategy" | "Accumulation" | "Banking" | "Climbing" | "Domino" | "Fishing" | "Gambling" | "Matching" | "Miscellaneous" | "Other" | "Patience" | "Poker" | "Race" | "Rummy" | "Shedding" | "Social" | "Tile" | "Trick-taking" | "Unknown" | "Vying" | "War";
    subCategory: "Banking" | "Climbing" | "Gambling" | "Matching" | "Shedding" | "Tile" | "Trick-taking" | "Vying" | "2-Player / Card Battle" | "21 / Blackjack Variant" | "Ace-Ten / Draw" | "Ace-Ten / Jass" | "All Fours / Dom Pedro Family" | "All Fours / Pitch" | "Andar Bahar" | "Arithmetic Capture" | "Arithmetic Capture / Sweep" | "Asymmetrical Point-trick" | "Attack-Defense" | "Attack-Defense / Transfer" | "Auction / Preference" | "Auction Whist" | "Auction Whist / Belgian Whist" | "Avoidance" | "Avoidance / Elimination" | "Avoidance / Hearts Family" | "Avoidance / Misere" | "Baccarat Family" | "Beating" | "Belote Family" | "Bid Euchre" | "Bidding" | "Bidding / Partnership" | "Bidding / Social" | "Blind / Social" | "Block / Blind" | "Block / Line Game" | "Bluffing" | "Board + Cards" | "Board / Multi-stage" | "Board-Card Hybrid" | "Board-Card Hybrid / Sequence" | "Brag Variant" | "Bridge Family" | "Building Capture" | "Canasta / Hand and Foot" | "Canasta Family / Partnership" | "Canasta Variant" | "Capture / Elimination" | "Capture / Matching" | "Capture / Ronda" | "Capturing" | "Casino" | "Casino / Capture" | "Casino / High-Roller" | "Casino / High-Stake" | "Casino Family" | "Casino Poker" | "Children's" | "Chinese Dominoes" | "Chosen Suit" | "Classic Point-scoring" | "Classic Point-scoring (American)" | "Classic Point-scoring (Caribbean)" | "Classic Point-scoring (Regional)" | "Climbing / Rank-exchange" | "Combination / Comparison" | "Combination Capture" | "Community Card" | "Community Card / High-Low Split" | "Compendium" | "Connecting / Matador" | "Connecting / Train" | "Contract / Meld-Capture" | "Contract Rummy" | "Contracts" | "Crazy Eights" | "Crazy Eights Variant" | "Cribbage ancestor" | "Cross" | "Cross / Block Game" | "Cross Layout" | "Domino / Adding" | "Draw" | "Draw / Lowball" | "Draw Game / European" | "Draw Game / Gambling" | "Draw Poker" | "Draw and Discard" | "Draw and Discard / Meld" | "Draw and Replace" | "Draw-Discard / Meld" | "Draw-Meld (Ancestor Rummy)" | "Draw-and-Discard" | "Draw-and-Discard / Basic Rummy" | "Eights family" | "Euchre / Auction" | "Euchre Family / Individual" | "Evasion" | "Evolving-Hand Bidding" | "Exact Bidding" | "Exact Bidding / Special Deals" | "Fives and Threes Family" | "Follow-Suit / Inflation" | "Gambling / Banking" | "Gambling / Card Race" | "Gaps / Solitaire" | "Hanafuda" | "Hand Building" | "Hearts / Penalty Avoidance" | "Hidden Partnership" | "High-Low Stud" | "Hombre / Point-trick" | "Hombre Family" | "House Game / Stud Poker" | "Indian Partnership" | "Indian Poker / Vying" | "Individual Bidding / Fixed Trump" | "Inflation / Follow-Suit Shedding" | "Irish/British Traditional" | "Italian" | "Jass" | "Jass / Ace-Ten / Marriage" | "Jass / Belote" | "Jass / Bidding" | "Jass / Marriage" | "Jass / Marriage Family" | "Jass / Point-trick" | "Jass Family" | "Jass Family / Point-Trick" | "Jass-Tarokk Fusion" | "Karnöffel-style" | "Last-Trick" | "Last-Trick / Betting" | "Last-trick" | "Last-trick / Elimination" | "Last-trick / Knocking" | "Layout / Grid-Based" | "Layout / Power Card" | "Line / Block Game" | "Line / Draw" | "Line / Partnership" | "Line / Scoring" | "Lose Last Trick" | "Lowball" | "Lowball Draw" | "Lowball Stud" | "Manipulation" | "Manipulation / Contract Rummy" | "Mariage / Call" | "Marriage" | "Marriage / Ace-Ten" | "Marriage Group" | "Matching / Eights Family" | "Matching / Melding" | "Medieval" | "Meld and Layoff" | "Melding" | "Melding / Pay-Card Gambling" | "Memory" | "Memory / Partnership" | "Memory / Quartets" | "Mixed" | "Multi-Layer" | "Non-Builder" | "Nordic Casino" | "One-Deck" | "Open Information" | "Open Packer" | "Pai Gow / Casino Game" | "Pair Collection" | "Partition / Banking" | "Partition / Points-Based" | "Partitioning" | "Partnership" | "Partnership / Bidding" | "Partnership / Contract Bidding" | "Partnership / Draw-and-Discard" | "Partnership / Hidden Trump" | "Partnership / Personal Trump" | "Partnership / Secret Alliance" | "Partnership / Shedding" | "Partnership Line Game" | "Partnership Meld / Draw-Discard" | "Partnership Signal" | "Partnership with Secret Alliances" | "Penalty / Pot-building" | "Pitch / All Fours Family" | "Plain Tricks / No Trump" | "Plain-Trick" | "Plain-trick Whist" | "Plain-trick with Trump" | "Point-Trick" | "Point-Trick / All Fours" | "Point-Trick / Draw" | "Point-collection" | "Point-oriented / Cross" | "Point-trick" | "Point-trick / No Trump" | "Point-trick with Bidding" | "Poker Family" | "Poker Hand Collection" | "Poker-based" | "Preference / Auction" | "Pure Chance" | "Puzzle" | "Quartet / Collecting" | "Quartet / Go Fish" | "Quartets" | "Quota / Card Exchange" | "Quota / Exchange" | "Quota Whist" | "Rams / Bid" | "Rams / Gambling" | "Rams / Ramsch" | "Reaction / Children's" | "Rummy / Set-Collection" | "Rummy-like" | "Schafkopf / Kop Family" | "Schafkopf Family" | "Scopa / Capture" | "Scopa Family" | "Scopa-variant" | "Secret Partnership" | "Secret Partnership (Boston)" | "Sedma / Point-trick" | "Seven Card Stud / Split Pot" | "Seven Card Stud Variant" | "Shared Card / Omaha Variant" | "Shedding / Deduction" | "Shedding / Hidden Role" | "Short Hand / Truco-like" | "Showdown / Prime" | "Slap Game" | "Slap-Jack family" | "Social / Party" | "Social Drinking" | "Social Hierarchy" | "Solitaire" | "Solitaire-style" | "Solo Whist / Contract" | "Solo vs Partnership" | "Spanish Deck Games" | "Speed" | "Speed Match" | "Split-Target Totaling" | "Stud" | "Stud / Community Card" | "Stud / Exchange" | "Stud / Lowball" | "Stud / Penalty" | "Stud / Roll-Your-Own" | "Stud / Wild Cards" | "Stud Poker" | "Stud Variant" | "Stud/Draw Hybrid" | "Tarokk / Preferansz Family" | "Tarot" | "Tarot / Ace-Ten" | "Traditional Chinese" | "Train Building" | "Tressette / Italian" | "Tressette Family" | "Trick Avoidance / Reverse" | "Trick-Avoidance" | "Trick-Taking / Children's Game" | "Trick-avoidance" | "Trick-taking / Avoidance" | "Trick-taking / Chinese Dominoes" | "Trick-taking / Multi-game" | "Triple Draw / High-Low Split" | "Triple Draw / Split Pot" | "Two-Deck Patience" | "Two-Phase" | "Two-Player Draw-and-Discard" | "Two-phase" | "Two-player" | "War / Accumulation" | "Watten Family / Alpine Games" | "Whist" | "Whist / Ancestor" | "Whist / Bridge Family" | "Whist Family" | "Whist Family (Somali)" | "Whist Variant" | "Wild Card Stud" | null;
    playerMode: "singleplayer" | "multiplayer";
    hasPlaceholders: boolean;
    originName?: string | null | undefined;
    deckType?: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104" | undefined;
}, {
    description: string;
    origin: string;
    players: {
        minPlayers: number;
        maxPlayers: number;
        recommendedPlayers?: number | null | undefined;
        display?: string | null | undefined;
    };
    deck: string;
    difficulty: "Beginner" | "Intermediate" | "Expert";
    duration: string;
    category: "Abstract strategy" | "Accumulation" | "Banking" | "Climbing" | "Domino" | "Fishing" | "Gambling" | "Matching" | "Miscellaneous" | "Other" | "Patience" | "Poker" | "Race" | "Rummy" | "Shedding" | "Social" | "Tile" | "Trick-taking" | "Unknown" | "Vying" | "War";
    subCategory: "Banking" | "Climbing" | "Gambling" | "Matching" | "Shedding" | "Tile" | "Trick-taking" | "Vying" | "2-Player / Card Battle" | "21 / Blackjack Variant" | "Ace-Ten / Draw" | "Ace-Ten / Jass" | "All Fours / Dom Pedro Family" | "All Fours / Pitch" | "Andar Bahar" | "Arithmetic Capture" | "Arithmetic Capture / Sweep" | "Asymmetrical Point-trick" | "Attack-Defense" | "Attack-Defense / Transfer" | "Auction / Preference" | "Auction Whist" | "Auction Whist / Belgian Whist" | "Avoidance" | "Avoidance / Elimination" | "Avoidance / Hearts Family" | "Avoidance / Misere" | "Baccarat Family" | "Beating" | "Belote Family" | "Bid Euchre" | "Bidding" | "Bidding / Partnership" | "Bidding / Social" | "Blind / Social" | "Block / Blind" | "Block / Line Game" | "Bluffing" | "Board + Cards" | "Board / Multi-stage" | "Board-Card Hybrid" | "Board-Card Hybrid / Sequence" | "Brag Variant" | "Bridge Family" | "Building Capture" | "Canasta / Hand and Foot" | "Canasta Family / Partnership" | "Canasta Variant" | "Capture / Elimination" | "Capture / Matching" | "Capture / Ronda" | "Capturing" | "Casino" | "Casino / Capture" | "Casino / High-Roller" | "Casino / High-Stake" | "Casino Family" | "Casino Poker" | "Children's" | "Chinese Dominoes" | "Chosen Suit" | "Classic Point-scoring" | "Classic Point-scoring (American)" | "Classic Point-scoring (Caribbean)" | "Classic Point-scoring (Regional)" | "Climbing / Rank-exchange" | "Combination / Comparison" | "Combination Capture" | "Community Card" | "Community Card / High-Low Split" | "Compendium" | "Connecting / Matador" | "Connecting / Train" | "Contract / Meld-Capture" | "Contract Rummy" | "Contracts" | "Crazy Eights" | "Crazy Eights Variant" | "Cribbage ancestor" | "Cross" | "Cross / Block Game" | "Cross Layout" | "Domino / Adding" | "Draw" | "Draw / Lowball" | "Draw Game / European" | "Draw Game / Gambling" | "Draw Poker" | "Draw and Discard" | "Draw and Discard / Meld" | "Draw and Replace" | "Draw-Discard / Meld" | "Draw-Meld (Ancestor Rummy)" | "Draw-and-Discard" | "Draw-and-Discard / Basic Rummy" | "Eights family" | "Euchre / Auction" | "Euchre Family / Individual" | "Evasion" | "Evolving-Hand Bidding" | "Exact Bidding" | "Exact Bidding / Special Deals" | "Fives and Threes Family" | "Follow-Suit / Inflation" | "Gambling / Banking" | "Gambling / Card Race" | "Gaps / Solitaire" | "Hanafuda" | "Hand Building" | "Hearts / Penalty Avoidance" | "Hidden Partnership" | "High-Low Stud" | "Hombre / Point-trick" | "Hombre Family" | "House Game / Stud Poker" | "Indian Partnership" | "Indian Poker / Vying" | "Individual Bidding / Fixed Trump" | "Inflation / Follow-Suit Shedding" | "Irish/British Traditional" | "Italian" | "Jass" | "Jass / Ace-Ten / Marriage" | "Jass / Belote" | "Jass / Bidding" | "Jass / Marriage" | "Jass / Marriage Family" | "Jass / Point-trick" | "Jass Family" | "Jass Family / Point-Trick" | "Jass-Tarokk Fusion" | "Karnöffel-style" | "Last-Trick" | "Last-Trick / Betting" | "Last-trick" | "Last-trick / Elimination" | "Last-trick / Knocking" | "Layout / Grid-Based" | "Layout / Power Card" | "Line / Block Game" | "Line / Draw" | "Line / Partnership" | "Line / Scoring" | "Lose Last Trick" | "Lowball" | "Lowball Draw" | "Lowball Stud" | "Manipulation" | "Manipulation / Contract Rummy" | "Mariage / Call" | "Marriage" | "Marriage / Ace-Ten" | "Marriage Group" | "Matching / Eights Family" | "Matching / Melding" | "Medieval" | "Meld and Layoff" | "Melding" | "Melding / Pay-Card Gambling" | "Memory" | "Memory / Partnership" | "Memory / Quartets" | "Mixed" | "Multi-Layer" | "Non-Builder" | "Nordic Casino" | "One-Deck" | "Open Information" | "Open Packer" | "Pai Gow / Casino Game" | "Pair Collection" | "Partition / Banking" | "Partition / Points-Based" | "Partitioning" | "Partnership" | "Partnership / Bidding" | "Partnership / Contract Bidding" | "Partnership / Draw-and-Discard" | "Partnership / Hidden Trump" | "Partnership / Personal Trump" | "Partnership / Secret Alliance" | "Partnership / Shedding" | "Partnership Line Game" | "Partnership Meld / Draw-Discard" | "Partnership Signal" | "Partnership with Secret Alliances" | "Penalty / Pot-building" | "Pitch / All Fours Family" | "Plain Tricks / No Trump" | "Plain-Trick" | "Plain-trick Whist" | "Plain-trick with Trump" | "Point-Trick" | "Point-Trick / All Fours" | "Point-Trick / Draw" | "Point-collection" | "Point-oriented / Cross" | "Point-trick" | "Point-trick / No Trump" | "Point-trick with Bidding" | "Poker Family" | "Poker Hand Collection" | "Poker-based" | "Preference / Auction" | "Pure Chance" | "Puzzle" | "Quartet / Collecting" | "Quartet / Go Fish" | "Quartets" | "Quota / Card Exchange" | "Quota / Exchange" | "Quota Whist" | "Rams / Bid" | "Rams / Gambling" | "Rams / Ramsch" | "Reaction / Children's" | "Rummy / Set-Collection" | "Rummy-like" | "Schafkopf / Kop Family" | "Schafkopf Family" | "Scopa / Capture" | "Scopa Family" | "Scopa-variant" | "Secret Partnership" | "Secret Partnership (Boston)" | "Sedma / Point-trick" | "Seven Card Stud / Split Pot" | "Seven Card Stud Variant" | "Shared Card / Omaha Variant" | "Shedding / Deduction" | "Shedding / Hidden Role" | "Short Hand / Truco-like" | "Showdown / Prime" | "Slap Game" | "Slap-Jack family" | "Social / Party" | "Social Drinking" | "Social Hierarchy" | "Solitaire" | "Solitaire-style" | "Solo Whist / Contract" | "Solo vs Partnership" | "Spanish Deck Games" | "Speed" | "Speed Match" | "Split-Target Totaling" | "Stud" | "Stud / Community Card" | "Stud / Exchange" | "Stud / Lowball" | "Stud / Penalty" | "Stud / Roll-Your-Own" | "Stud / Wild Cards" | "Stud Poker" | "Stud Variant" | "Stud/Draw Hybrid" | "Tarokk / Preferansz Family" | "Tarot" | "Tarot / Ace-Ten" | "Traditional Chinese" | "Train Building" | "Tressette / Italian" | "Tressette Family" | "Trick Avoidance / Reverse" | "Trick-Avoidance" | "Trick-Taking / Children's Game" | "Trick-avoidance" | "Trick-taking / Avoidance" | "Trick-taking / Chinese Dominoes" | "Trick-taking / Multi-game" | "Triple Draw / High-Low Split" | "Triple Draw / Split Pot" | "Two-Deck Patience" | "Two-Phase" | "Two-Player Draw-and-Discard" | "Two-phase" | "Two-player" | "War / Accumulation" | "Watten Family / Alpine Games" | "Whist" | "Whist / Ancestor" | "Whist / Bridge Family" | "Whist Family" | "Whist Family (Somali)" | "Whist Variant" | "Wild Card Stud" | null;
    playerMode: "singleplayer" | "multiplayer";
    hasPlaceholders: boolean;
    originName?: string | null | undefined;
    deckType?: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104" | undefined;
}>;
declare const historySchema: z.ZodObject<{
    origins: z.ZodString;
    originCountries: z.ZodArray<z.ZodString, "many">;
    timeline: z.ZodArray<z.ZodString, "many">;
    evolution: z.ZodUnion<[z.ZodString, z.ZodNull]>;
    cultural: z.ZodUnion<[z.ZodString, z.ZodNull]>;
    hasPlaceholders: z.ZodBoolean;
    nullReasons: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
}, "strict", z.ZodTypeAny, {
    hasPlaceholders: boolean;
    origins: string;
    originCountries: string[];
    timeline: string[];
    evolution: string | null;
    cultural: string | null;
    nullReasons?: Record<string, string> | undefined;
}, {
    hasPlaceholders: boolean;
    origins: string;
    originCountries: string[];
    timeline: string[];
    evolution: string | null;
    cultural: string | null;
    nullReasons?: Record<string, string> | undefined;
}>;
declare const setupSchema: z.ZodObject<{
    players: z.ZodString;
    deck: z.ZodString;
    equipment: z.ZodString;
    dealing: z.ZodString;
    hasPlaceholders: z.ZodBoolean;
}, "strict", z.ZodTypeAny, {
    players: string;
    deck: string;
    hasPlaceholders: boolean;
    equipment: string;
    dealing: string;
}, {
    players: string;
    deck: string;
    hasPlaceholders: boolean;
    equipment: string;
    dealing: string;
}>;
declare const rulesSchema: z.ZodObject<{
    objective: z.ZodString;
    gameplay: z.ZodString;
    keyRules: z.ZodArray<z.ZodString, "many">;
    hasPlaceholders: z.ZodBoolean;
}, "strict", z.ZodTypeAny, {
    hasPlaceholders: boolean;
    objective: string;
    gameplay: string;
    keyRules: string[];
}, {
    hasPlaceholders: boolean;
    objective: string;
    gameplay: string;
    keyRules: string[];
}>;
declare const scoringSchema: z.ZodObject<{
    description: z.ZodString;
    winCondition: z.ZodString;
    cardValues: z.ZodRecord<z.ZodString, z.ZodString>;
    penalties: z.ZodRecord<z.ZodString, z.ZodString>;
    splitRules: z.ZodUnion<[z.ZodString, z.ZodNull]>;
    targetScore: z.ZodUnion<[z.ZodNumber, z.ZodEnum<["NA", "not applicable", "Unknown"]>, z.ZodNull]>;
    scoringDirection: z.ZodUnion<[z.ZodEnum<["high_wins", "low_wins", "closest_to_target"]>, z.ZodNull]>;
    hasPlaceholders: z.ZodBoolean;
    nullReasons: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
}, "strict", z.ZodTypeAny, {
    description: string;
    hasPlaceholders: boolean;
    winCondition: string;
    cardValues: Record<string, string>;
    penalties: Record<string, string>;
    splitRules: string | null;
    targetScore: number | "Unknown" | "NA" | "not applicable" | null;
    scoringDirection: "high_wins" | "low_wins" | "closest_to_target" | null;
    nullReasons?: Record<string, string> | undefined;
}, {
    description: string;
    hasPlaceholders: boolean;
    winCondition: string;
    cardValues: Record<string, string>;
    penalties: Record<string, string>;
    splitRules: string | null;
    targetScore: number | "Unknown" | "NA" | "not applicable" | null;
    scoringDirection: "high_wins" | "low_wins" | "closest_to_target" | null;
    nullReasons?: Record<string, string> | undefined;
}>;
declare const strategySchema: z.ZodObject<{
    basic: z.ZodUnion<[z.ZodString, z.ZodNull]>;
    intermediate: z.ZodUnion<[z.ZodString, z.ZodNull]>;
    advanced: z.ZodUnion<[z.ZodString, z.ZodNull]>;
    tips: z.ZodArray<z.ZodString, "many">;
    hasPlaceholders: z.ZodBoolean;
    nullReasons: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
}, "strict", z.ZodTypeAny, {
    hasPlaceholders: boolean;
    basic: string | null;
    intermediate: string | null;
    advanced: string | null;
    tips: string[];
    nullReasons?: Record<string, string> | undefined;
}, {
    hasPlaceholders: boolean;
    basic: string | null;
    intermediate: string | null;
    advanced: string | null;
    tips: string[];
    nullReasons?: Record<string, string> | undefined;
}>;
declare const variationsSchema: z.ZodEffects<z.ZodObject<{
    list: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        overrides: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>]>>;
        emptyOverridesReason: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        description: string;
        id: string;
        overrides: Record<string, string | number | boolean | Record<string, string | number | boolean | null> | null>;
        emptyOverridesReason?: string | undefined;
    }, {
        name: string;
        description: string;
        id: string;
        overrides: Record<string, string | number | boolean | Record<string, string | number | boolean | null> | null>;
        emptyOverridesReason?: string | undefined;
    }>, "many">;
    hasPlaceholders: z.ZodBoolean;
    noVariationsReason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    hasPlaceholders: boolean;
    list: {
        name: string;
        description: string;
        id: string;
        overrides: Record<string, string | number | boolean | Record<string, string | number | boolean | null> | null>;
        emptyOverridesReason?: string | undefined;
    }[];
    noVariationsReason?: string | undefined;
}, {
    hasPlaceholders: boolean;
    list: {
        name: string;
        description: string;
        id: string;
        overrides: Record<string, string | number | boolean | Record<string, string | number | boolean | null> | null>;
        emptyOverridesReason?: string | undefined;
    }[];
    noVariationsReason?: string | undefined;
}>, {
    hasPlaceholders: boolean;
    list: {
        name: string;
        description: string;
        id: string;
        overrides: Record<string, string | number | boolean | Record<string, string | number | boolean | null> | null>;
        emptyOverridesReason?: string | undefined;
    }[];
    noVariationsReason?: string | undefined;
}, {
    hasPlaceholders: boolean;
    list: {
        name: string;
        description: string;
        id: string;
        overrides: Record<string, string | number | boolean | Record<string, string | number | boolean | null> | null>;
        emptyOverridesReason?: string | undefined;
    }[];
    noVariationsReason?: string | undefined;
}>;
declare const aiSchema: z.ZodEffects<z.ZodObject<{
    difficulty: z.ZodObject<{
        easy: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        medium: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        hard: z.ZodUnion<[z.ZodString, z.ZodNull]>;
    }, "strict", z.ZodTypeAny, {
        easy: string | null;
        medium: string | null;
        hard: string | null;
    }, {
        easy: string | null;
        medium: string | null;
        hard: string | null;
    }>;
    considerations: z.ZodArray<z.ZodString, "many">;
    hasPlaceholders: z.ZodBoolean;
    nullReasons: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
}, "strict", z.ZodTypeAny, {
    difficulty: {
        easy: string | null;
        medium: string | null;
        hard: string | null;
    };
    hasPlaceholders: boolean;
    considerations: string[];
    nullReasons?: Record<string, string> | undefined;
}, {
    difficulty: {
        easy: string | null;
        medium: string | null;
        hard: string | null;
    };
    hasPlaceholders: boolean;
    considerations: string[];
    nullReasons?: Record<string, string> | undefined;
}>, {
    difficulty: {
        easy: string | null;
        medium: string | null;
        hard: string | null;
    };
    hasPlaceholders: boolean;
    considerations: string[];
    nullReasons?: Record<string, string> | undefined;
}, {
    difficulty: {
        easy: string | null;
        medium: string | null;
        hard: string | null;
    };
    hasPlaceholders: boolean;
    considerations: string[];
    nullReasons?: Record<string, string> | undefined;
}>;
declare const sourcesSchema: z.ZodObject<{
    primary: z.ZodArray<z.ZodObject<{
        id: z.ZodUnion<[z.ZodString, z.ZodEnum<["NA", "not applicable", "Unknown"]>]>;
        name: z.ZodString;
        url: z.ZodString;
        retrievedAt: z.ZodOptional<z.ZodString>;
        sections: z.ZodOptional<z.ZodArray<z.ZodObject<{
            section: z.ZodOptional<z.ZodString>;
            sourcePath: z.ZodOptional<z.ZodString>;
            paragraph: z.ZodOptional<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            section?: string | undefined;
            sourcePath?: string | undefined;
            paragraph?: number | undefined;
        }, {
            section?: string | undefined;
            sourcePath?: string | undefined;
            paragraph?: number | undefined;
        }>, "many">>;
        localHtml: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        name: string;
        url: string;
        id: string;
        retrievedAt?: string | undefined;
        sections?: {
            section?: string | undefined;
            sourcePath?: string | undefined;
            paragraph?: number | undefined;
        }[] | undefined;
        localHtml?: string | undefined;
    }, {
        name: string;
        url: string;
        id: string;
        retrievedAt?: string | undefined;
        sections?: {
            section?: string | undefined;
            sourcePath?: string | undefined;
            paragraph?: number | undefined;
        }[] | undefined;
        localHtml?: string | undefined;
    }>, "many">;
    additional: z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
        localHtml: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url?: string | undefined;
        localHtml?: string | undefined;
    }, {
        url?: string | undefined;
        localHtml?: string | undefined;
    }>]>, "many">;
    hasPlaceholders: z.ZodBoolean;
}, "strict", z.ZodTypeAny, {
    hasPlaceholders: boolean;
    primary: {
        name: string;
        url: string;
        id: string;
        retrievedAt?: string | undefined;
        sections?: {
            section?: string | undefined;
            sourcePath?: string | undefined;
            paragraph?: number | undefined;
        }[] | undefined;
        localHtml?: string | undefined;
    }[];
    additional: (string | {
        url?: string | undefined;
        localHtml?: string | undefined;
    })[];
}, {
    hasPlaceholders: boolean;
    primary: {
        name: string;
        url: string;
        id: string;
        retrievedAt?: string | undefined;
        sections?: {
            section?: string | undefined;
            sourcePath?: string | undefined;
            paragraph?: number | undefined;
        }[] | undefined;
        localHtml?: string | undefined;
    }[];
    additional: (string | {
        url?: string | undefined;
        localHtml?: string | undefined;
    })[];
}>;
declare const evidenceSchema: z.ZodArray<z.ZodObject<{
    path: z.ZodString;
    sourceId: z.ZodOptional<z.ZodString>;
    quote: z.ZodOptional<z.ZodString>;
    confidence: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
}, "strict", z.ZodTypeAny, {
    path: string;
    notes?: string | null | undefined;
    sourceId?: string | undefined;
    quote?: string | undefined;
    confidence?: number | undefined;
}, {
    path: string;
    notes?: string | null | undefined;
    sourceId?: string | undefined;
    quote?: string | undefined;
    confidence?: number | undefined;
}>, "many">;
declare const extractionSchema: z.ZodObject<{
    status: z.ZodEnum<["validated"]>;
    missingCritical: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    assumptions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    openQuestions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    validatorVersion: z.ZodOptional<z.ZodString>;
    overviewNaReasons: z.ZodOptional<z.ZodObject<{
        category: z.ZodOptional<z.ZodString>;
        subCategory: z.ZodOptional<z.ZodString>;
        difficulty: z.ZodOptional<z.ZodString>;
        origin: z.ZodOptional<z.ZodString>;
        originName: z.ZodOptional<z.ZodString>;
        duration: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        origin?: string | undefined;
        difficulty?: string | undefined;
        duration?: string | undefined;
        category?: string | undefined;
        subCategory?: string | undefined;
        originName?: string | undefined;
    }, {
        origin?: string | undefined;
        difficulty?: string | undefined;
        duration?: string | undefined;
        category?: string | undefined;
        subCategory?: string | undefined;
        originName?: string | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    status: "validated";
    missingCritical?: string[] | undefined;
    assumptions?: string[] | undefined;
    openQuestions?: string[] | undefined;
    validatorVersion?: string | undefined;
    overviewNaReasons?: {
        origin?: string | undefined;
        difficulty?: string | undefined;
        duration?: string | undefined;
        category?: string | undefined;
        subCategory?: string | undefined;
        originName?: string | undefined;
    } | undefined;
}, {
    status: "validated";
    missingCritical?: string[] | undefined;
    assumptions?: string[] | undefined;
    openQuestions?: string[] | undefined;
    validatorVersion?: string | undefined;
    overviewNaReasons?: {
        origin?: string | undefined;
        difficulty?: string | undefined;
        duration?: string | undefined;
        category?: string | undefined;
        subCategory?: string | undefined;
        originName?: string | undefined;
    } | undefined;
}>;
declare const engineSchema: z.ZodEffects<z.ZodObject<{
    phases: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        idTemplate: z.ZodOptional<z.ZodString>;
        repeatCount: z.ZodOptional<z.ZodNumber>;
        label: z.ZodString;
        actor: z.ZodUnion<[z.ZodEnum<["each_player_clockwise", "each_player_counterclockwise", "dealer", "all_simultaneous", "active_players_clockwise", "active_players_counterclockwise", "current_player", "winning_player", "system"]>, z.ZodString, z.ZodString]>;
        legalActions: z.ZodArray<z.ZodUnion<[z.ZodEnum<["ante", "deal", "reveal_market", "buy_market", "buy_stock", "fold", "check", "call", "bet", "raise", "declare", "reveal_hand", "award_pot", "play_card", "draw", "discard", "pass", "bid", "meld", "go_out"]>, z.ZodString]>, "many">;
        nextPhase: z.ZodUnion<[z.ZodNull, z.ZodString]>;
        isMandatory: z.ZodBoolean;
        loopIndex: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
        totalLoops: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
        conditionalNext: z.ZodUnion<[z.ZodNull, z.ZodArray<z.ZodObject<{
            condition: z.ZodString;
            nextPhase: z.ZodUnion<[z.ZodNull, z.ZodString]>;
        }, "strict", z.ZodTypeAny, {
            nextPhase: string | null;
            condition: string;
        }, {
            nextPhase: string | null;
            condition: string;
        }>, "many">]>;
        cardVisibilityChanges: z.ZodRecord<z.ZodString, z.ZodEnum<["face_up", "face_down"]>>;
        notes: z.ZodUnion<[z.ZodString, z.ZodNull]>;
    }, "strict", z.ZodTypeAny, {
        id: string;
        label: string;
        actor: string;
        legalActions: string[];
        nextPhase: string | null;
        isMandatory: boolean;
        loopIndex: number | null;
        totalLoops: number | null;
        conditionalNext: {
            nextPhase: string | null;
            condition: string;
        }[] | null;
        cardVisibilityChanges: Record<string, "face_up" | "face_down">;
        notes: string | null;
        idTemplate?: string | undefined;
        repeatCount?: number | undefined;
    }, {
        id: string;
        label: string;
        actor: string;
        legalActions: string[];
        nextPhase: string | null;
        isMandatory: boolean;
        loopIndex: number | null;
        totalLoops: number | null;
        conditionalNext: {
            nextPhase: string | null;
            condition: string;
        }[] | null;
        cardVisibilityChanges: Record<string, "face_up" | "face_down">;
        notes: string | null;
        idTemplate?: string | undefined;
        repeatCount?: number | undefined;
    }>, "many">;
    playerActions: z.ZodObject<{
        [k: string]: z.ZodUnion<[z.ZodObject<{
            supported: z.ZodLiteral<false>;
            description: z.ZodEnum<["NA", "not applicable"]>;
            cost: z.ZodLiteral<"NA">;
            constraints: z.ZodEnum<["NA", "not applicable"]>;
            isTerminating: z.ZodBoolean;
            effectType: z.ZodEnum<["NA", "not applicable"]>;
            effectHints: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            id: z.ZodOptional<z.ZodString>;
            reason: z.ZodEffects<z.ZodString, string, string>;
        }, "strip", z.ZodTypeAny, {
            description: "NA" | "not applicable";
            supported: false;
            cost: "NA";
            constraints: "NA" | "not applicable";
            isTerminating: boolean;
            effectType: "NA" | "not applicable";
            reason: string;
            effectHints?: Record<string, unknown> | undefined;
            id?: string | undefined;
        }, {
            description: "NA" | "not applicable";
            supported: false;
            cost: "NA";
            constraints: "NA" | "not applicable";
            isTerminating: boolean;
            effectType: "NA" | "not applicable";
            reason: string;
            effectHints?: Record<string, unknown> | undefined;
            id?: string | undefined;
        }>, z.ZodObject<{
            supported: z.ZodLiteral<true>;
            description: z.ZodEffects<z.ZodString, string, string>;
            cost: z.ZodUnion<[z.ZodObject<{
                type: z.ZodLiteral<"flat">;
                value: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                value: number;
                type: "flat";
            }, {
                value: number;
                type: "flat";
            }>, z.ZodObject<{
                type: z.ZodLiteral<"match_current_bet">;
            }, "strip", z.ZodTypeAny, {
                type: "match_current_bet";
            }, {
                type: "match_current_bet";
            }>, z.ZodObject<{
                type: z.ZodLiteral<"min_bet">;
            }, "strip", z.ZodTypeAny, {
                type: "min_bet";
            }, {
                type: "min_bet";
            }>, z.ZodObject<{
                type: z.ZodLiteral<"min_raise">;
            }, "strip", z.ZodTypeAny, {
                type: "min_raise";
            }, {
                type: "min_raise";
            }>, z.ZodObject<{
                type: z.ZodLiteral<"pot_limit">;
            }, "strip", z.ZodTypeAny, {
                type: "pot_limit";
            }, {
                type: "pot_limit";
            }>, z.ZodObject<{
                type: z.ZodLiteral<"byRank">;
            }, "strip", z.ZodTypeAny, {
                type: "byRank";
            }, {
                type: "byRank";
            }>, z.ZodLiteral<"0">, z.ZodLiteral<"NA">]>;
            constraints: z.ZodEffects<z.ZodString, string, string>;
            isTerminating: z.ZodBoolean;
            effectType: z.ZodEffects<z.ZodEnum<["draw", "play", "discard", "buy", "bet", "raise", "deal", "reveal", "declare", "award", "pass", "meld", "bid", "fold", "ante", "custom", "NA", "not applicable", "Unknown"]>, "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award", "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award">;
            effectHints: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
                from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
                to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
                count: z.ZodOptional<z.ZodNumber>;
            }, "strict", z.ZodTypeAny, {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            }, {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            }>, z.ZodObject<{
                amount: z.ZodOptional<z.ZodString>;
                min: z.ZodOptional<z.ZodNumber>;
                max: z.ZodOptional<z.ZodNumber>;
                limitType: z.ZodOptional<z.ZodEnum<["fixed", "pot_limit", "no_limit", "spread_limit"]>>;
            }, "strict", z.ZodTypeAny, {
                amount?: string | undefined;
                min?: number | undefined;
                max?: number | undefined;
                limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
            }, {
                amount?: string | undefined;
                min?: number | undefined;
                max?: number | undefined;
                limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
            }>, z.ZodObject<{
                from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
                to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
                costSource: z.ZodOptional<z.ZodEnum<["byRank", "flat", "market", "stock"]>>;
            }, "strict", z.ZodTypeAny, {
                from?: string | undefined;
                to?: string | undefined;
                costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
            }, {
                from?: string | undefined;
                to?: string | undefined;
                costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
            }>, z.ZodObject<{
                from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
                to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            }, "strict", z.ZodTypeAny, {
                from?: string | undefined;
                to?: string | undefined;
            }, {
                from?: string | undefined;
                to?: string | undefined;
            }>, z.ZodObject<{
                from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
                to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
                count: z.ZodOptional<z.ZodNumber>;
            }, "strict", z.ZodTypeAny, {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            }, {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            }>, z.ZodObject<{
                target: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
                count: z.ZodOptional<z.ZodNumber>;
            }, "strict", z.ZodTypeAny, {
                count?: number | undefined;
                target?: string | undefined;
            }, {
                count?: number | undefined;
                target?: string | undefined;
            }>, z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>, z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>, z.ZodObject<{
                amount: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                amount?: string | undefined;
            }, {
                amount?: string | undefined;
            }>, z.ZodObject<{
                min: z.ZodOptional<z.ZodNumber>;
                max: z.ZodOptional<z.ZodNumber>;
                declarationType: z.ZodOptional<z.ZodString>;
            }, "strict", z.ZodTypeAny, {
                min?: number | undefined;
                max?: number | undefined;
                declarationType?: string | undefined;
            }, {
                min?: number | undefined;
                max?: number | undefined;
                declarationType?: string | undefined;
            }>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>>;
            id: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            description: string;
            supported: true;
            cost: "0" | "NA" | {
                value: number;
                type: "flat";
            } | {
                type: "match_current_bet";
            } | {
                type: "min_bet";
            } | {
                type: "min_raise";
            } | {
                type: "pot_limit";
            } | {
                type: "byRank";
            };
            constraints: string;
            isTerminating: boolean;
            effectType: "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award";
            effectHints?: Record<string, unknown> | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                amount?: string | undefined;
                min?: number | undefined;
                max?: number | undefined;
                limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                count?: number | undefined;
                target?: string | undefined;
            } | {} | {} | {
                amount?: string | undefined;
            } | {
                min?: number | undefined;
                max?: number | undefined;
                declarationType?: string | undefined;
            } | undefined;
            id?: string | undefined;
        }, {
            description: string;
            supported: true;
            cost: "0" | "NA" | {
                value: number;
                type: "flat";
            } | {
                type: "match_current_bet";
            } | {
                type: "min_bet";
            } | {
                type: "min_raise";
            } | {
                type: "pot_limit";
            } | {
                type: "byRank";
            };
            constraints: string;
            isTerminating: boolean;
            effectType: "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award";
            effectHints?: Record<string, unknown> | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                amount?: string | undefined;
                min?: number | undefined;
                max?: number | undefined;
                limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                count?: number | undefined;
                target?: string | undefined;
            } | {} | {} | {
                amount?: string | undefined;
            } | {
                min?: number | undefined;
                max?: number | undefined;
                declarationType?: string | undefined;
            } | undefined;
            id?: string | undefined;
        }>]>;
    }, "strict", z.ZodTypeAny, {
        [x: string]: {
            description: "NA" | "not applicable";
            supported: false;
            cost: "NA";
            constraints: "NA" | "not applicable";
            isTerminating: boolean;
            effectType: "NA" | "not applicable";
            reason: string;
            effectHints?: Record<string, unknown> | undefined;
            id?: string | undefined;
        } | {
            description: string;
            supported: true;
            cost: "0" | "NA" | {
                value: number;
                type: "flat";
            } | {
                type: "match_current_bet";
            } | {
                type: "min_bet";
            } | {
                type: "min_raise";
            } | {
                type: "pot_limit";
            } | {
                type: "byRank";
            };
            constraints: string;
            isTerminating: boolean;
            effectType: "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award";
            effectHints?: Record<string, unknown> | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                amount?: string | undefined;
                min?: number | undefined;
                max?: number | undefined;
                limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                count?: number | undefined;
                target?: string | undefined;
            } | {} | {} | {
                amount?: string | undefined;
            } | {
                min?: number | undefined;
                max?: number | undefined;
                declarationType?: string | undefined;
            } | undefined;
            id?: string | undefined;
        };
    }, {
        [x: string]: {
            description: "NA" | "not applicable";
            supported: false;
            cost: "NA";
            constraints: "NA" | "not applicable";
            isTerminating: boolean;
            effectType: "NA" | "not applicable";
            reason: string;
            effectHints?: Record<string, unknown> | undefined;
            id?: string | undefined;
        } | {
            description: string;
            supported: true;
            cost: "0" | "NA" | {
                value: number;
                type: "flat";
            } | {
                type: "match_current_bet";
            } | {
                type: "min_bet";
            } | {
                type: "min_raise";
            } | {
                type: "pot_limit";
            } | {
                type: "byRank";
            };
            constraints: string;
            isTerminating: boolean;
            effectType: "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award";
            effectHints?: Record<string, unknown> | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                amount?: string | undefined;
                min?: number | undefined;
                max?: number | undefined;
                limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                count?: number | undefined;
                target?: string | undefined;
            } | {} | {} | {
                amount?: string | undefined;
            } | {
                min?: number | undefined;
                max?: number | undefined;
                declarationType?: string | undefined;
            } | undefined;
            id?: string | undefined;
        };
    }>;
    playerConfig: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        playerMode: z.ZodEnum<["singleplayer", "multiplayer"]>;
        minPlayers: z.ZodNumber;
        maxPlayers: z.ZodNumber;
        optimalPlayers: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
        startingStack: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
        seatLayout: z.ZodEnum<["circular", "linear", "teams_2v2", "teams_3v3", "fixed_partnerships", "variable_partnerships"]>;
        partnerships: z.ZodBoolean;
        partnershipFormats: z.ZodOptional<z.ZodArray<z.ZodEnum<["2v2", "3v3", "2v2v2", "individual", "variable", "NA", "not applicable", "Unknown"]>, "many">>;
    }, "strict", z.ZodTypeAny, {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers: number | null;
        startingStack: number | null;
        seatLayout: "circular" | "linear" | "teams_2v2" | "teams_3v3" | "fixed_partnerships" | "variable_partnerships";
        partnerships: boolean;
        partnershipFormats?: ("Unknown" | "NA" | "not applicable" | "2v2" | "3v3" | "2v2v2" | "individual" | "variable")[] | undefined;
    }, {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers: number | null;
        startingStack: number | null;
        seatLayout: "circular" | "linear" | "teams_2v2" | "teams_3v3" | "fixed_partnerships" | "variable_partnerships";
        partnerships: boolean;
        partnershipFormats?: ("Unknown" | "NA" | "not applicable" | "2v2" | "3v3" | "2v2v2" | "individual" | "variable")[] | undefined;
    }>, {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers: number | null;
        startingStack: number | null;
        seatLayout: "circular" | "linear" | "teams_2v2" | "teams_3v3" | "fixed_partnerships" | "variable_partnerships";
        partnerships: boolean;
        partnershipFormats?: ("Unknown" | "NA" | "not applicable" | "2v2" | "3v3" | "2v2v2" | "individual" | "variable")[] | undefined;
    }, {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers: number | null;
        startingStack: number | null;
        seatLayout: "circular" | "linear" | "teams_2v2" | "teams_3v3" | "fixed_partnerships" | "variable_partnerships";
        partnerships: boolean;
        partnershipFormats?: ("Unknown" | "NA" | "not applicable" | "2v2" | "3v3" | "2v2v2" | "individual" | "variable")[] | undefined;
    }>, {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers: number | null;
        startingStack: number | null;
        seatLayout: "circular" | "linear" | "teams_2v2" | "teams_3v3" | "fixed_partnerships" | "variable_partnerships";
        partnerships: boolean;
        partnershipFormats?: ("Unknown" | "NA" | "not applicable" | "2v2" | "3v3" | "2v2v2" | "individual" | "variable")[] | undefined;
    }, {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers: number | null;
        startingStack: number | null;
        seatLayout: "circular" | "linear" | "teams_2v2" | "teams_3v3" | "fixed_partnerships" | "variable_partnerships";
        partnerships: boolean;
        partnershipFormats?: ("Unknown" | "NA" | "not applicable" | "2v2" | "3v3" | "2v2v2" | "individual" | "variable")[] | undefined;
    }>, {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers: number | null;
        startingStack: number | null;
        seatLayout: "circular" | "linear" | "teams_2v2" | "teams_3v3" | "fixed_partnerships" | "variable_partnerships";
        partnerships: boolean;
        partnershipFormats?: ("Unknown" | "NA" | "not applicable" | "2v2" | "3v3" | "2v2v2" | "individual" | "variable")[] | undefined;
    }, {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers: number | null;
        startingStack: number | null;
        seatLayout: "circular" | "linear" | "teams_2v2" | "teams_3v3" | "fixed_partnerships" | "variable_partnerships";
        partnerships: boolean;
        partnershipFormats?: ("Unknown" | "NA" | "not applicable" | "2v2" | "3v3" | "2v2v2" | "individual" | "variable")[] | undefined;
    }>;
    cardVisibility: z.ZodObject<{
        handDefault: z.ZodEnum<["face_up", "face_down", "mixed"]>;
        initialDeal: z.ZodEnum<["face_up", "face_down", "mixed"]>;
        marketCards: z.ZodUnion<[z.ZodEnum<["face_up", "face_down", "mixed"]>, z.ZodNull]>;
        stockPurchase: z.ZodUnion<[z.ZodEnum<["face_up", "face_down"]>, z.ZodNull]>;
        discardTop: z.ZodUnion<[z.ZodEnum<["face_up", "face_down", "NA", "Unknown"]>, z.ZodNull]>;
        tableauCards: z.ZodUnion<[z.ZodEnum<["face_up", "face_down", "mixed", "NA", "Unknown"]>, z.ZodNull]>;
    }, "strict", z.ZodTypeAny, {
        handDefault: "face_up" | "face_down" | "mixed";
        initialDeal: "face_up" | "face_down" | "mixed";
        marketCards: "face_up" | "face_down" | "mixed" | null;
        stockPurchase: "face_up" | "face_down" | null;
        discardTop: "Unknown" | "NA" | "face_up" | "face_down" | null;
        tableauCards: "Unknown" | "NA" | "face_up" | "face_down" | "mixed" | null;
    }, {
        handDefault: "face_up" | "face_down" | "mixed";
        initialDeal: "face_up" | "face_down" | "mixed";
        marketCards: "face_up" | "face_down" | "mixed" | null;
        stockPurchase: "face_up" | "face_down" | null;
        discardTop: "Unknown" | "NA" | "face_up" | "face_down" | null;
        tableauCards: "Unknown" | "NA" | "face_up" | "face_down" | "mixed" | null;
    }>;
    drawConfig: z.ZodNullable<z.ZodObject<{
        canDraw: z.ZodBoolean;
        drawSources: z.ZodArray<z.ZodObject<{
            source: z.ZodEnum<["stock", "discard_top", "discard_any", "market", "hand_of_player", "talon", "kitty", "widow"]>;
            visibility: z.ZodEnum<["face_up", "face_down"]>;
            isOptional: z.ZodBoolean;
            canPickAny: z.ZodBoolean;
            mustRevealCard: z.ZodUnion<[z.ZodBoolean, z.ZodNull]>;
            maxPerTurn: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
            notes: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        }, "strict", z.ZodTypeAny, {
            notes: string | null;
            visibility: "face_up" | "face_down";
            source: "stock" | "widow" | "kitty" | "market" | "discard_top" | "discard_any" | "hand_of_player" | "talon";
            isOptional: boolean;
            canPickAny: boolean;
            mustRevealCard: boolean | null;
            maxPerTurn: number | null;
        }, {
            notes: string | null;
            visibility: "face_up" | "face_down";
            source: "stock" | "widow" | "kitty" | "market" | "discard_top" | "discard_any" | "hand_of_player" | "talon";
            isOptional: boolean;
            canPickAny: boolean;
            mustRevealCard: boolean | null;
            maxPerTurn: number | null;
        }>, "many">;
        drawCount: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
        drawTiming: z.ZodEnum<["start_of_turn", "end_of_turn", "after_discard", "before_discard", "any_time", "phase_specific"]>;
        mustDrawBeforePlay: z.ZodBoolean;
        drawAndDiscard: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        canDraw: boolean;
        drawSources: {
            notes: string | null;
            visibility: "face_up" | "face_down";
            source: "stock" | "widow" | "kitty" | "market" | "discard_top" | "discard_any" | "hand_of_player" | "talon";
            isOptional: boolean;
            canPickAny: boolean;
            mustRevealCard: boolean | null;
            maxPerTurn: number | null;
        }[];
        drawCount: number | null;
        drawTiming: "start_of_turn" | "end_of_turn" | "after_discard" | "before_discard" | "any_time" | "phase_specific";
        mustDrawBeforePlay: boolean;
        drawAndDiscard: boolean;
    }, {
        canDraw: boolean;
        drawSources: {
            notes: string | null;
            visibility: "face_up" | "face_down";
            source: "stock" | "widow" | "kitty" | "market" | "discard_top" | "discard_any" | "hand_of_player" | "talon";
            isOptional: boolean;
            canPickAny: boolean;
            mustRevealCard: boolean | null;
            maxPerTurn: number | null;
        }[];
        drawCount: number | null;
        drawTiming: "start_of_turn" | "end_of_turn" | "after_discard" | "before_discard" | "any_time" | "phase_specific";
        mustDrawBeforePlay: boolean;
        drawAndDiscard: boolean;
    }>>;
    discardConfig: z.ZodNullable<z.ZodObject<{
        hasDiscard: z.ZodBoolean;
        mustDiscard: z.ZodBoolean;
        discardTiming: z.ZodEnum<["after_draw", "after_play", "end_of_turn", "any_time"]>;
        discardVisibility: z.ZodEnum<["face_up", "face_down"]>;
        discardCount: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
        opponentCanPickFromDiscard: z.ZodBoolean;
        discardPickRules: z.ZodNullable<z.ZodObject<{
            canPickTop: z.ZodBoolean;
            canPickAny: z.ZodBoolean;
            mustTakeAll: z.ZodBoolean;
            mustUsePickedCard: z.ZodBoolean;
            pickCost: z.ZodUnion<[z.ZodString, z.ZodNull]>;
            frozenPileRules: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        }, "strip", z.ZodTypeAny, {
            canPickAny: boolean;
            canPickTop: boolean;
            mustTakeAll: boolean;
            mustUsePickedCard: boolean;
            pickCost: string | null;
            frozenPileRules: string | null;
        }, {
            canPickAny: boolean;
            canPickTop: boolean;
            mustTakeAll: boolean;
            mustUsePickedCard: boolean;
            pickCost: string | null;
            frozenPileRules: string | null;
        }>>;
    }, "strip", z.ZodTypeAny, {
        hasDiscard: boolean;
        mustDiscard: boolean;
        discardTiming: "end_of_turn" | "any_time" | "after_draw" | "after_play";
        discardVisibility: "face_up" | "face_down";
        discardCount: number | null;
        opponentCanPickFromDiscard: boolean;
        discardPickRules: {
            canPickAny: boolean;
            canPickTop: boolean;
            mustTakeAll: boolean;
            mustUsePickedCard: boolean;
            pickCost: string | null;
            frozenPileRules: string | null;
        } | null;
    }, {
        hasDiscard: boolean;
        mustDiscard: boolean;
        discardTiming: "end_of_turn" | "any_time" | "after_draw" | "after_play";
        discardVisibility: "face_up" | "face_down";
        discardCount: number | null;
        opponentCanPickFromDiscard: boolean;
        discardPickRules: {
            canPickAny: boolean;
            canPickTop: boolean;
            mustTakeAll: boolean;
            mustUsePickedCard: boolean;
            pickCost: string | null;
            frozenPileRules: string | null;
        } | null;
    }>>;
    deckType: z.ZodEnum<["Standard 52", "Standard 52 + Joker(s)", "Standard 48", "Standard 40", "Standard 36", "Standard 32", "Standard 32 + Joker(s)", "Standard 44", "Standard 24", "Double 52", "Double 52 + 4 Jokers", "Double 32", "Double 24", "Quad 36", "Quad 40", "Oct 40", "Quad 52 + 8 Jokers", "Triple 52 + 6 Jokers", "Gnav 42", "Goita 32", "Rook 56", "Xiangqi 32", "Four Color 112", "Tarot 78", "Tarot 62", "Minchiate 97", "Tarot 54", "Tarot 40", "Tarot 66", "Tarot 42", "Cego 38", "Tarocco Bolognese 62", "Tarocco Siciliano 64", "500 deck 63", "Double-6 Dominoes", "Double-6 Dominoes x2", "Double-6 Dominoes x4", "Double-8 Dominoes", "Double-9 Dominoes", "Double-12 Dominoes", "Double-15 Dominoes", "Double-6 + Double-12 Dominoes", "Double-9 + Double-12 Dominoes", "Chinese domino 32", "Chinese domino 84", "Hanafuda 48", "Hanafuda 52", "Kabufuda 40", "Mahjong 136", "Mahjong 144", "Mahjong 148", "Mahjong 152", "Mahjong 160", "Khorol 60", "Daaluu 64", "Money-suited 39", "Money-suited 38", "Ganjifa", "Whot 54", "Okey 106", "Unsun Karuta 75", "Komatsufuda 48", "Uta-garuta 200", "Iroha Karuta 96", "Ceki 60", "To_tom 120", "Bai_choi 33", "Madiao 40", "Khanhoo 30", "Tehonbiki 48", "Stripped 35", "Standard 30", "Standard 28", "Standard 26", "Standard 16", "Treikort 27", "Tiddlywink", "Hols der Geier 75", "Numbered 104"]>;
    suitSet: z.ZodEnum<["French", "Italian", "Spanish", "Portuguese", "German", "Tarot_minor", "French_tarock", "Tarot_de_Marseille", "Swiss_1JJ", "Industrie_und_Glueck", "Tarocco_Piemontese", "Minchiate", "Dominoes", "Khorol", "E_awase", "Chinese_domino", "Hanafuda", "Hanafuda_snow", "Kabufuda", "Mahjong", "Daaluu", "Money-suited", "Ganjifa", "Whot", "Okey", "Bai_choi", "Iroha_karuta", "Ceki", "Komatsufuda", "Madiao", "Khanhoo", "Tehonbiki", "To_tom", "Unsun_karuta", "Cego", "Xiangqi_red_black", "Four_color", "Rook_colors", "Uta_garuta", "Tiddlywink_colors", "Gnav", "Goita", "Hols_der_Geier_colors", "Numbered_104"]>;
    rankSet: z.ZodEnum<["Standard_52", "Pinochle_48", "Stripped_48", "Stripped_40", "Stripped_36", "Stripped_32", "Stripped_44", "Stripped_24", "Tarot_78", "Tarot_62", "Minchiate_97", "Tarot_54", "Tarot_40", "Tarot_66", "Tarot_42", "Tarocco_Bolognese_62", "Tarocco_Sicilian_64", "FiveHundred_63", "Cego_38", "Domino_double6", "Domino_double8", "Domino_double9", "Domino_double12", "Domino_double15", "Chinese_domino", "Hanafuda", "Kabufuda", "Mahjong_136", "Mahjong", "Mahjong_148", "Mahjong_152", "Mahjong_160", "Khorol", "Daaluu", "Money-suited", "Ganjifa", "Whot", "Okey", "Bai_choi", "Iroha_karuta", "Ceki", "Komatsufuda", "Madiao", "Khanhoo", "Tehonbiki", "To_tom", "Unsun_karuta", "E_awase", "Domino_double6_plus_double12", "Domino_double9_plus_double12", "Stripped_35", "Stripped_30", "Stripped_28", "Stripped_26", "Stripped_16", "Xiangqi_pieces", "Four_color_pieces", "Gnav_ranks", "Goita_pieces", "Rook_1_14", "Treikort_27", "Uta_garuta", "Tiddlywink_pieces", "Hols_der_Geier_1_15", "Numbered_1_104"]>;
    initialHandSize: z.ZodNumber;
    trumpConfig: z.ZodNullable<z.ZodObject<{
        hasTrump: z.ZodBoolean;
        trumpDetermination: z.ZodEnum<["turned_card", "bid_winner_chooses", "fixed_suit", "last_card_dealt", "highest_bidder", "called_by_contract", "permanent_rank"]>;
        permanentTrumps: z.ZodNullable<z.ZodArray<z.ZodObject<{
            card: z.ZodString;
            rank: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
            name: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        }, "strip", z.ZodTypeAny, {
            name: string | null;
            card: string;
            rank: number | null;
        }, {
            name: string | null;
            card: string;
            rank: number | null;
        }>, "many">>;
        rightBowerLeftBower: z.ZodBoolean;
        trumpSuitRanking: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        canCallNoTrump: z.ZodBoolean;
        overtakingRule: z.ZodUnion<[z.ZodString, z.ZodNull]>;
    }, "strip", z.ZodTypeAny, {
        hasTrump: boolean;
        trumpDetermination: "turned_card" | "bid_winner_chooses" | "fixed_suit" | "last_card_dealt" | "highest_bidder" | "called_by_contract" | "permanent_rank";
        permanentTrumps: {
            name: string | null;
            card: string;
            rank: number | null;
        }[] | null;
        rightBowerLeftBower: boolean;
        trumpSuitRanking: string | null;
        canCallNoTrump: boolean;
        overtakingRule: string | null;
    }, {
        hasTrump: boolean;
        trumpDetermination: "turned_card" | "bid_winner_chooses" | "fixed_suit" | "last_card_dealt" | "highest_bidder" | "called_by_contract" | "permanent_rank";
        permanentTrumps: {
            name: string | null;
            card: string;
            rank: number | null;
        }[] | null;
        rightBowerLeftBower: boolean;
        trumpSuitRanking: string | null;
        canCallNoTrump: boolean;
        overtakingRule: string | null;
    }>>;
    meldConfig: z.ZodNullable<z.ZodObject<{
        hasMelding: z.ZodBoolean;
        meldTypes: z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["set", "run", "flush", "pair", "triplet", "quartet", "canasta", "special"]>;
            minSize: z.ZodNumber;
            maxSize: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
            acesHigh: z.ZodUnion<[z.ZodBoolean, z.ZodNull]>;
            wildcardAllowed: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            type: "set" | "run" | "flush" | "pair" | "triplet" | "quartet" | "canasta" | "special";
            minSize: number;
            maxSize: number | null;
            acesHigh: boolean | null;
            wildcardAllowed: boolean;
        }, {
            type: "set" | "run" | "flush" | "pair" | "triplet" | "quartet" | "canasta" | "special";
            minSize: number;
            maxSize: number | null;
            acesHigh: boolean | null;
            wildcardAllowed: boolean;
        }>, "many">;
        meldTiming: z.ZodEnum<["any_time_in_turn", "after_draw_before_discard", "at_any_time", "end_of_round_only"]>;
        layOffAllowed: z.ZodBoolean;
        initialMeldRequirement: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        goingOut: z.ZodObject<{
            condition: z.ZodString;
            mustAnnounce: z.ZodBoolean;
            knockOption: z.ZodBoolean;
            knockDeadwoodLimit: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
        }, "strip", z.ZodTypeAny, {
            condition: string;
            mustAnnounce: boolean;
            knockOption: boolean;
            knockDeadwoodLimit: number | null;
        }, {
            condition: string;
            mustAnnounce: boolean;
            knockOption: boolean;
            knockDeadwoodLimit: number | null;
        }>;
    }, "strip", z.ZodTypeAny, {
        hasMelding: boolean;
        meldTypes: {
            type: "set" | "run" | "flush" | "pair" | "triplet" | "quartet" | "canasta" | "special";
            minSize: number;
            maxSize: number | null;
            acesHigh: boolean | null;
            wildcardAllowed: boolean;
        }[];
        meldTiming: "any_time_in_turn" | "after_draw_before_discard" | "at_any_time" | "end_of_round_only";
        layOffAllowed: boolean;
        initialMeldRequirement: string | null;
        goingOut: {
            condition: string;
            mustAnnounce: boolean;
            knockOption: boolean;
            knockDeadwoodLimit: number | null;
        };
    }, {
        hasMelding: boolean;
        meldTypes: {
            type: "set" | "run" | "flush" | "pair" | "triplet" | "quartet" | "canasta" | "special";
            minSize: number;
            maxSize: number | null;
            acesHigh: boolean | null;
            wildcardAllowed: boolean;
        }[];
        meldTiming: "any_time_in_turn" | "after_draw_before_discard" | "at_any_time" | "end_of_round_only";
        layOffAllowed: boolean;
        initialMeldRequirement: string | null;
        goingOut: {
            condition: string;
            mustAnnounce: boolean;
            knockOption: boolean;
            knockDeadwoodLimit: number | null;
        };
    }>>;
    trickConfig: z.ZodNullable<z.ZodObject<{
        hasTricks: z.ZodBoolean;
        tricksPerRound: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
        mustFollowSuit: z.ZodBoolean;
        canTrumpFirstTrick: z.ZodOptional<z.ZodBoolean>;
        mustOvertrump: z.ZodUnion<[z.ZodBoolean, z.ZodNull]>;
        leadRestrictions: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        trickWinCondition: z.ZodEnum<["highest_of_led_suit", "highest_trump_if_played_else_highest_led", "lowest_card_wins", "specific_card_wins"]>;
        trickWinnerLeads: z.ZodBoolean;
        scoredTricks: z.ZodBoolean;
        bidding: z.ZodNullable<z.ZodObject<{
            hasBidding: z.ZodBoolean;
            biddingSystem: z.ZodEnum<["auction", "pass_or_bid", "fixed_contract", "german_style", "solo_bidding"]>;
            minBid: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
            maxBid: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
            passAllowed: z.ZodBoolean;
            doubling: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            hasBidding: boolean;
            biddingSystem: "auction" | "pass_or_bid" | "fixed_contract" | "german_style" | "solo_bidding";
            minBid: number | null;
            maxBid: number | null;
            passAllowed: boolean;
            doubling: boolean;
        }, {
            hasBidding: boolean;
            biddingSystem: "auction" | "pass_or_bid" | "fixed_contract" | "german_style" | "solo_bidding";
            minBid: number | null;
            maxBid: number | null;
            passAllowed: boolean;
            doubling: boolean;
        }>>;
        pointValues: z.ZodOptional<z.ZodObject<{
            defaultPerSuit: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
            specificCards: z.ZodOptional<z.ZodArray<z.ZodObject<{
                card: z.ZodString;
                points: z.ZodNumber;
            }, "strict", z.ZodTypeAny, {
                card: string;
                points: number;
            }, {
                card: string;
                points: number;
            }>, "many">>;
        }, "strict", z.ZodTypeAny, {
            defaultPerSuit?: Record<string, number> | undefined;
            specificCards?: {
                card: string;
                points: number;
            }[] | undefined;
        }, {
            defaultPerSuit?: Record<string, number> | undefined;
            specificCards?: {
                card: string;
                points: number;
            }[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        bidding: {
            hasBidding: boolean;
            biddingSystem: "auction" | "pass_or_bid" | "fixed_contract" | "german_style" | "solo_bidding";
            minBid: number | null;
            maxBid: number | null;
            passAllowed: boolean;
            doubling: boolean;
        } | null;
        hasTricks: boolean;
        tricksPerRound: number | null;
        mustFollowSuit: boolean;
        mustOvertrump: boolean | null;
        leadRestrictions: string | null;
        trickWinCondition: "highest_of_led_suit" | "highest_trump_if_played_else_highest_led" | "lowest_card_wins" | "specific_card_wins";
        trickWinnerLeads: boolean;
        scoredTricks: boolean;
        canTrumpFirstTrick?: boolean | undefined;
        pointValues?: {
            defaultPerSuit?: Record<string, number> | undefined;
            specificCards?: {
                card: string;
                points: number;
            }[] | undefined;
        } | undefined;
    }, {
        bidding: {
            hasBidding: boolean;
            biddingSystem: "auction" | "pass_or_bid" | "fixed_contract" | "german_style" | "solo_bidding";
            minBid: number | null;
            maxBid: number | null;
            passAllowed: boolean;
            doubling: boolean;
        } | null;
        hasTricks: boolean;
        tricksPerRound: number | null;
        mustFollowSuit: boolean;
        mustOvertrump: boolean | null;
        leadRestrictions: string | null;
        trickWinCondition: "highest_of_led_suit" | "highest_trump_if_played_else_highest_led" | "lowest_card_wins" | "specific_card_wins";
        trickWinnerLeads: boolean;
        scoredTricks: boolean;
        canTrumpFirstTrick?: boolean | undefined;
        pointValues?: {
            defaultPerSuit?: Record<string, number> | undefined;
            specificCards?: {
                card: string;
                points: number;
            }[] | undefined;
        } | undefined;
    }>>;
    declarationMechanism: z.ZodNullable<z.ZodObject<{
        type: z.ZodEnum<["chips_in_fist", "verbal", "card_select", "token", "none"]>;
        encoding: z.ZodRecord<z.ZodString, z.ZodEnum<["low", "high", "both", "neutral", "pass", "NA", "Unknown"]>>;
        revealTiming: z.ZodEnum<["simultaneous", "clockwise", "after_showdown"]>;
        pigRule: z.ZodBoolean;
        pigPenalty: z.ZodUnion<[z.ZodEnum<["forfeit_entire_pot", "forfeit_one_half", "points_penalty", "NA", "Unknown"]>, z.ZodNull]>;
    }, "strip", z.ZodTypeAny, {
        type: "chips_in_fist" | "verbal" | "card_select" | "token" | "none";
        encoding: Record<string, "Unknown" | "NA" | "pass" | "low" | "high" | "both" | "neutral">;
        revealTiming: "simultaneous" | "clockwise" | "after_showdown";
        pigRule: boolean;
        pigPenalty: "Unknown" | "NA" | "forfeit_entire_pot" | "forfeit_one_half" | "points_penalty" | null;
    }, {
        type: "chips_in_fist" | "verbal" | "card_select" | "token" | "none";
        encoding: Record<string, "Unknown" | "NA" | "pass" | "low" | "high" | "both" | "neutral">;
        revealTiming: "simultaneous" | "clockwise" | "after_showdown";
        pigRule: boolean;
        pigPenalty: "Unknown" | "NA" | "forfeit_entire_pot" | "forfeit_one_half" | "points_penalty" | null;
    }>>;
    handRanks: z.ZodNullable<z.ZodObject<{
        high: z.ZodUnion<[z.ZodEnum<["standard_poker", "deuce_to_seven", "badugi", "chinese_poker_front", "NA", "Unknown"]>, z.ZodNull]>;
        low: z.ZodUnion<[z.ZodEnum<["ace_to_five", "ace_to_five_8_or_better", "deuce_to_seven", "ace_to_six", "NA", "Unknown"]>, z.ZodNull]>;
        lowQualifier: z.ZodNullable<z.ZodObject<{
            maxHighCard: z.ZodNumber;
            acePlaysLow: z.ZodBoolean;
            straightsAndFlushesCount: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            maxHighCard: number;
            acePlaysLow: boolean;
            straightsAndFlushesCount: boolean;
        }, {
            maxHighCard: number;
            acePlaysLow: boolean;
            straightsAndFlushesCount: boolean;
        }>>;
    }, "strip", z.ZodTypeAny, {
        low: "Unknown" | "NA" | "deuce_to_seven" | "ace_to_five" | "ace_to_five_8_or_better" | "ace_to_six" | null;
        high: "Unknown" | "NA" | "standard_poker" | "deuce_to_seven" | "badugi" | "chinese_poker_front" | null;
        lowQualifier: {
            maxHighCard: number;
            acePlaysLow: boolean;
            straightsAndFlushesCount: boolean;
        } | null;
    }, {
        low: "Unknown" | "NA" | "deuce_to_seven" | "ace_to_five" | "ace_to_five_8_or_better" | "ace_to_six" | null;
        high: "Unknown" | "NA" | "standard_poker" | "deuce_to_seven" | "badugi" | "chinese_poker_front" | null;
        lowQualifier: {
            maxHighCard: number;
            acePlaysLow: boolean;
            straightsAndFlushesCount: boolean;
        } | null;
    }>>;
    buyCosts: z.ZodNullable<z.ZodObject<{
        enabled: z.ZodBoolean;
        currency: z.ZodEnum<["chips", "points", "money", "tokens", "NA", "Unknown"]>;
        sources: z.ZodObject<{
            market: z.ZodObject<{
                byRank: z.ZodRecord<z.ZodString, z.ZodNumber>;
                flat: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
            }, "strip", z.ZodTypeAny, {
                flat: number | null;
                byRank: Record<string, number>;
            }, {
                flat: number | null;
                byRank: Record<string, number>;
            }>;
            stock: z.ZodObject<{
                flat: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                flat: number;
            }, {
                flat: number;
            }>;
            discard: z.ZodUnion<[z.ZodObject<{
                flat: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                flat: number;
            }, {
                flat: number;
            }>, z.ZodEnum<["NA", "not applicable", "Unknown"]>, z.ZodNull]>;
        }, "strip", z.ZodTypeAny, {
            stock: {
                flat: number;
            };
            discard: "Unknown" | "NA" | "not applicable" | {
                flat: number;
            } | null;
            market: {
                flat: number | null;
                byRank: Record<string, number>;
            };
        }, {
            stock: {
                flat: number;
            };
            discard: "Unknown" | "NA" | "not applicable" | {
                flat: number;
            } | null;
            market: {
                flat: number | null;
                byRank: Record<string, number>;
            };
        }>;
    }, "strip", z.ZodTypeAny, {
        sources: {
            stock: {
                flat: number;
            };
            discard: "Unknown" | "NA" | "not applicable" | {
                flat: number;
            } | null;
            market: {
                flat: number | null;
                byRank: Record<string, number>;
            };
        };
        enabled: boolean;
        currency: "Unknown" | "NA" | "points" | "chips" | "money" | "tokens";
    }, {
        sources: {
            stock: {
                flat: number;
            };
            discard: "Unknown" | "NA" | "not applicable" | {
                flat: number;
            } | null;
            market: {
                flat: number | null;
                byRank: Record<string, number>;
            };
        };
        enabled: boolean;
        currency: "Unknown" | "NA" | "points" | "chips" | "money" | "tokens";
    }>>;
    marketConfig: z.ZodNullable<z.ZodObject<{
        enabled: z.ZodBoolean;
        size: z.ZodNumber;
        refillFrom: z.ZodEnum<["stock", "discard", "none"]>;
        refillTiming: z.ZodEnum<["immediately_after_purchase", "end_of_round", "start_of_round"]>;
        visibility: z.ZodEnum<["face_up", "face_down"]>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        visibility: "face_up" | "face_down";
        size: number;
        refillFrom: "stock" | "discard" | "none";
        refillTiming: "immediately_after_purchase" | "end_of_round" | "start_of_round";
    }, {
        enabled: boolean;
        visibility: "face_up" | "face_down";
        size: number;
        refillFrom: "stock" | "discard" | "none";
        refillTiming: "immediately_after_purchase" | "end_of_round" | "start_of_round";
    }>>;
    specialCards: z.ZodUnion<[z.ZodObject<{
        wildcards: z.ZodNullable<z.ZodArray<z.ZodObject<{
            card: z.ZodString;
            canSubstituteFor: z.ZodEnum<["any_card", "any_rank", "any_suit", "specific_cards"]>;
            restrictions: z.ZodUnion<[z.ZodString, z.ZodNull]>;
            naturalPreferred: z.ZodBoolean;
        }, "strict", z.ZodTypeAny, {
            card: string;
            canSubstituteFor: "any_card" | "any_rank" | "any_suit" | "specific_cards";
            restrictions: string | null;
            naturalPreferred: boolean;
        }, {
            card: string;
            canSubstituteFor: "any_card" | "any_rank" | "any_suit" | "specific_cards";
            restrictions: string | null;
            naturalPreferred: boolean;
        }>, "many">>;
        actionCards: z.ZodNullable<z.ZodArray<z.ZodObject<{
            card: z.ZodString;
            action: z.ZodEnum<["skip_next_player", "reverse_direction", "draw_2", "draw_4", "wild_suit_change", "penalty", "bonus_points", "extra_turn", "steal_card", "force_swap_hand", "expose_hand", "block_draw"]>;
            drawCount: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
            targetPlayer: z.ZodEnum<["next_player", "previous_player", "all_others", "chosen_player", "self"]>;
            notes: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        }, "strict", z.ZodTypeAny, {
            notes: string | null;
            drawCount: number | null;
            card: string;
            action: "skip_next_player" | "reverse_direction" | "draw_2" | "draw_4" | "wild_suit_change" | "penalty" | "bonus_points" | "extra_turn" | "steal_card" | "force_swap_hand" | "expose_hand" | "block_draw";
            targetPlayer: "next_player" | "previous_player" | "all_others" | "chosen_player" | "self";
        }, {
            notes: string | null;
            drawCount: number | null;
            card: string;
            action: "skip_next_player" | "reverse_direction" | "draw_2" | "draw_4" | "wild_suit_change" | "penalty" | "bonus_points" | "extra_turn" | "steal_card" | "force_swap_hand" | "expose_hand" | "block_draw";
            targetPlayer: "next_player" | "previous_player" | "all_others" | "chosen_player" | "self";
        }>, "many">>;
        bonusCards: z.ZodNullable<z.ZodArray<z.ZodObject<{
            card: z.ZodString;
            bonusPoints: z.ZodNumber;
            condition: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        }, "strict", z.ZodTypeAny, {
            condition: string | null;
            card: string;
            bonusPoints: number;
        }, {
            condition: string | null;
            card: string;
            bonusPoints: number;
        }>, "many">>;
        penaltyCards: z.ZodNullable<z.ZodArray<z.ZodObject<{
            card: z.ZodString;
            penaltyPoints: z.ZodNumber;
            notes: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        }, "strict", z.ZodTypeAny, {
            notes: string | null;
            card: string;
            penaltyPoints: number;
        }, {
            notes: string | null;
            card: string;
            penaltyPoints: number;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        wildcards: {
            card: string;
            canSubstituteFor: "any_card" | "any_rank" | "any_suit" | "specific_cards";
            restrictions: string | null;
            naturalPreferred: boolean;
        }[] | null;
        actionCards: {
            notes: string | null;
            drawCount: number | null;
            card: string;
            action: "skip_next_player" | "reverse_direction" | "draw_2" | "draw_4" | "wild_suit_change" | "penalty" | "bonus_points" | "extra_turn" | "steal_card" | "force_swap_hand" | "expose_hand" | "block_draw";
            targetPlayer: "next_player" | "previous_player" | "all_others" | "chosen_player" | "self";
        }[] | null;
        bonusCards: {
            condition: string | null;
            card: string;
            bonusPoints: number;
        }[] | null;
        penaltyCards: {
            notes: string | null;
            card: string;
            penaltyPoints: number;
        }[] | null;
    }, {
        wildcards: {
            card: string;
            canSubstituteFor: "any_card" | "any_rank" | "any_suit" | "specific_cards";
            restrictions: string | null;
            naturalPreferred: boolean;
        }[] | null;
        actionCards: {
            notes: string | null;
            drawCount: number | null;
            card: string;
            action: "skip_next_player" | "reverse_direction" | "draw_2" | "draw_4" | "wild_suit_change" | "penalty" | "bonus_points" | "extra_turn" | "steal_card" | "force_swap_hand" | "expose_hand" | "block_draw";
            targetPlayer: "next_player" | "previous_player" | "all_others" | "chosen_player" | "self";
        }[] | null;
        bonusCards: {
            condition: string | null;
            card: string;
            bonusPoints: number;
        }[] | null;
        penaltyCards: {
            notes: string | null;
            card: string;
            penaltyPoints: number;
        }[] | null;
    }>, z.ZodUnion<[z.ZodEnum<["NA", "not applicable", "Unknown"]>, z.ZodNull]>]>;
    shedding: z.ZodUnion<[z.ZodObject<{
        hasShedding: z.ZodBoolean;
        sheddingGoal: z.ZodEnum<["empty_hand_first", "empty_hand_last", "reduce_hand_size"]>;
        validPlays: z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["higher_single", "higher_pair", "higher_triple", "higher_sequence", "same_count_higher_rank", "any_combination", "specific_beats"]>;
            notes: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        }, "strip", z.ZodTypeAny, {
            type: "higher_single" | "higher_pair" | "higher_triple" | "higher_sequence" | "same_count_higher_rank" | "any_combination" | "specific_beats";
            notes: string | null;
        }, {
            type: "higher_single" | "higher_pair" | "higher_triple" | "higher_sequence" | "same_count_higher_rank" | "any_combination" | "specific_beats";
            notes: string | null;
        }>, "many">;
        passAllowed: z.ZodBoolean;
        burnRules: z.ZodUnion<[z.ZodString, z.ZodNull]>;
    }, "strip", z.ZodTypeAny, {
        passAllowed: boolean;
        hasShedding: boolean;
        sheddingGoal: "empty_hand_first" | "empty_hand_last" | "reduce_hand_size";
        validPlays: {
            type: "higher_single" | "higher_pair" | "higher_triple" | "higher_sequence" | "same_count_higher_rank" | "any_combination" | "specific_beats";
            notes: string | null;
        }[];
        burnRules: string | null;
    }, {
        passAllowed: boolean;
        hasShedding: boolean;
        sheddingGoal: "empty_hand_first" | "empty_hand_last" | "reduce_hand_size";
        validPlays: {
            type: "higher_single" | "higher_pair" | "higher_triple" | "higher_sequence" | "same_count_higher_rank" | "any_combination" | "specific_beats";
            notes: string | null;
        }[];
        burnRules: string | null;
    }>, z.ZodUnion<[z.ZodEnum<["NA", "not applicable", "Unknown"]>, z.ZodNull]>]>;
    fishingConfig: z.ZodUnion<[z.ZodObject<{
        hasFishing: z.ZodBoolean;
        captureMethod: z.ZodEnum<["matching_rank", "sum_equals_target", "sum_or_match", "rank_beats_rank"]>;
        captureTarget: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
        sweepBonus: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
        tableauStartSize: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
    }, "strip", z.ZodTypeAny, {
        hasFishing: boolean;
        captureMethod: "matching_rank" | "sum_equals_target" | "sum_or_match" | "rank_beats_rank";
        captureTarget: number | null;
        sweepBonus: number | null;
        tableauStartSize: number | null;
    }, {
        hasFishing: boolean;
        captureMethod: "matching_rank" | "sum_equals_target" | "sum_or_match" | "rank_beats_rank";
        captureTarget: number | null;
        sweepBonus: number | null;
        tableauStartSize: number | null;
    }>, z.ZodUnion<[z.ZodEnum<["NA", "not applicable", "Unknown"]>, z.ZodNull]>]>;
    patienceConfig: z.ZodUnion<[z.ZodObject<{
        isSolitaire: z.ZodBoolean;
        tableauColumns: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
        foundationCount: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
        buildDirection: z.ZodUnion<[z.ZodEnum<["ascending", "descending", "both"]>, z.ZodNull]>;
        buildSuitRule: z.ZodUnion<[z.ZodEnum<["same_suit", "alternate_color", "any_suit", "opposite_suit"]>, z.ZodNull]>;
        redealAllowed: z.ZodBoolean;
        redealCount: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
    }, "strip", z.ZodTypeAny, {
        isSolitaire: boolean;
        tableauColumns: number | null;
        foundationCount: number | null;
        buildDirection: "both" | "ascending" | "descending" | null;
        buildSuitRule: "any_suit" | "same_suit" | "alternate_color" | "opposite_suit" | null;
        redealAllowed: boolean;
        redealCount: number | null;
    }, {
        isSolitaire: boolean;
        tableauColumns: number | null;
        foundationCount: number | null;
        buildDirection: "both" | "ascending" | "descending" | null;
        buildSuitRule: "any_suit" | "same_suit" | "alternate_color" | "opposite_suit" | null;
        redealAllowed: boolean;
        redealCount: number | null;
    }>, z.ZodUnion<[z.ZodEnum<["NA", "not applicable", "Unknown"]>, z.ZodNull]>]>;
    bankingConfig: z.ZodUnion<[z.ZodObject<{
        hasBanker: z.ZodBoolean;
        bankerDetermination: z.ZodEnum<["fixed_dealer", "highest_cut", "auction", "rotating", "casino_house"]>;
        targetValue: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
        bustRule: z.ZodUnion<[z.ZodString, z.ZodNull]>;
        playerVsBanker: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        hasBanker: boolean;
        bankerDetermination: "auction" | "fixed_dealer" | "highest_cut" | "rotating" | "casino_house";
        targetValue: number | null;
        bustRule: string | null;
        playerVsBanker: boolean;
    }, {
        hasBanker: boolean;
        bankerDetermination: "auction" | "fixed_dealer" | "highest_cut" | "rotating" | "casino_house";
        targetValue: number | null;
        bustRule: string | null;
        playerVsBanker: boolean;
    }>, z.ZodUnion<[z.ZodEnum<["NA", "not applicable", "Unknown"]>, z.ZodNull]>]>;
    turnOrder: z.ZodObject<{
        direction: z.ZodEnum<["clockwise", "counterclockwise", "variable"]>;
        startsWith: z.ZodEnum<["left_of_dealer", "right_of_dealer", "dealer", "eldest_hand", "fixed_player", "winner_of_previous"]>;
        dealerRotates: z.ZodBoolean;
    }, "strict", z.ZodTypeAny, {
        direction: "clockwise" | "variable" | "counterclockwise";
        startsWith: "dealer" | "left_of_dealer" | "right_of_dealer" | "eldest_hand" | "fixed_player" | "winner_of_previous";
        dealerRotates: boolean;
    }, {
        direction: "clockwise" | "variable" | "counterclockwise";
        startsWith: "dealer" | "left_of_dealer" | "right_of_dealer" | "eldest_hand" | "fixed_player" | "winner_of_previous";
        dealerRotates: boolean;
    }>;
    roundConfig: z.ZodUnion<[z.ZodObject<{
        hasRounds: z.ZodBoolean;
        roundCount: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
        roundEndCondition: z.ZodEnum<["player_goes_out", "stock_exhausted", "tricks_complete", "target_score_reached", "fixed_rounds", "all_cards_played"]>;
        gameEndCondition: z.ZodEnum<["target_score_reached", "fixed_rounds_complete", "elimination", "last_player_standing", "agreed_session"]>;
    }, "strip", z.ZodTypeAny, {
        hasRounds: boolean;
        roundCount: number | null;
        roundEndCondition: "player_goes_out" | "stock_exhausted" | "tricks_complete" | "target_score_reached" | "fixed_rounds" | "all_cards_played";
        gameEndCondition: "target_score_reached" | "fixed_rounds_complete" | "elimination" | "last_player_standing" | "agreed_session";
    }, {
        hasRounds: boolean;
        roundCount: number | null;
        roundEndCondition: "player_goes_out" | "stock_exhausted" | "tricks_complete" | "target_score_reached" | "fixed_rounds" | "all_cards_played";
        gameEndCondition: "target_score_reached" | "fixed_rounds_complete" | "elimination" | "last_player_standing" | "agreed_session";
    }>, z.ZodUnion<[z.ZodEnum<["NA", "not applicable", "Unknown"]>, z.ZodNull]>]>;
    constants: z.ZodRecord<z.ZodEnum<["ante", "optimal_players", "max_players", "min_players", "stock_buy_fee", "low_threshold", "challenge_penalty", "market_size", "buy_rounds", "final_hand_size", "trick_count", "target_score", "hand_size", "kitty_size", "widow_size", "buy_limit", "round_limit", "min_bet", "max_raise", "pot_limit", "deck_count", "joker_count", "barrel_limit", "rospisat_penalty", "zero_penalty"]>, z.ZodNumber>;
    finalHandSize: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
    deckCount: z.ZodUnion<[z.ZodNumber, z.ZodNull]>;
    zones: z.ZodArray<z.ZodObject<{
        id: z.ZodEffects<z.ZodString, string, string>;
        type: z.ZodEnum<["stack", "hand", "pool", "grid", "track", "area"]>;
        visibility: z.ZodEnum<["hidden", "private", "public"]>;
        owner: z.ZodEnum<["table", "player", "team"]>;
        capacity: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodNull]>>;
    }, "strict", z.ZodTypeAny, {
        type: "grid" | "stack" | "hand" | "pool" | "track" | "area";
        id: string;
        visibility: "hidden" | "private" | "public";
        owner: "team" | "table" | "player";
        capacity?: number | null | undefined;
    }, {
        type: "grid" | "stack" | "hand" | "pool" | "track" | "area";
        id: string;
        visibility: "hidden" | "private" | "public";
        owner: "team" | "table" | "player";
        capacity?: number | null | undefined;
    }>, "many">;
    rules: z.ZodObject<{
        edgeCases: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            appliesTo: z.ZodOptional<z.ZodString>;
            text: z.ZodString;
            affects: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            id: string;
            text: string;
            appliesTo?: string | undefined;
            affects?: string | undefined;
        }, {
            id: string;
            text: string;
            appliesTo?: string | undefined;
            affects?: string | undefined;
        }>, "many">;
    }, "strict", z.ZodTypeAny, {
        edgeCases: {
            id: string;
            text: string;
            appliesTo?: string | undefined;
            affects?: string | undefined;
        }[];
    }, {
        edgeCases: {
            id: string;
            text: string;
            appliesTo?: string | undefined;
            affects?: string | undefined;
        }[];
    }>;
    implementationHints: z.ZodObject<{
        rngUsed: z.ZodOptional<z.ZodArray<z.ZodEnum<["shuffle", "deal", "dice", "draw", "random_select"]>, "many">>;
        authoritativeServer: z.ZodOptional<z.ZodBoolean>;
        customLogicNeeded: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strict", z.ZodTypeAny, {
        rngUsed?: ("deal" | "draw" | "shuffle" | "dice" | "random_select")[] | undefined;
        authoritativeServer?: boolean | undefined;
        customLogicNeeded?: string[] | undefined;
    }, {
        rngUsed?: ("deal" | "draw" | "shuffle" | "dice" | "random_select")[] | undefined;
        authoritativeServer?: boolean | undefined;
        customLogicNeeded?: string[] | undefined;
    }>;
    progression: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    roles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    customActions: z.ZodOptional<z.ZodArray<z.ZodIntersection<z.ZodUnion<[z.ZodObject<{
        supported: z.ZodLiteral<false>;
        description: z.ZodEnum<["NA", "not applicable"]>;
        cost: z.ZodLiteral<"NA">;
        constraints: z.ZodEnum<["NA", "not applicable"]>;
        isTerminating: z.ZodBoolean;
        effectType: z.ZodEnum<["NA", "not applicable"]>;
        effectHints: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        id: z.ZodOptional<z.ZodString>;
        reason: z.ZodEffects<z.ZodString, string, string>;
    }, "strip", z.ZodTypeAny, {
        description: "NA" | "not applicable";
        supported: false;
        cost: "NA";
        constraints: "NA" | "not applicable";
        isTerminating: boolean;
        effectType: "NA" | "not applicable";
        reason: string;
        effectHints?: Record<string, unknown> | undefined;
        id?: string | undefined;
    }, {
        description: "NA" | "not applicable";
        supported: false;
        cost: "NA";
        constraints: "NA" | "not applicable";
        isTerminating: boolean;
        effectType: "NA" | "not applicable";
        reason: string;
        effectHints?: Record<string, unknown> | undefined;
        id?: string | undefined;
    }>, z.ZodObject<{
        supported: z.ZodLiteral<true>;
        description: z.ZodEffects<z.ZodString, string, string>;
        cost: z.ZodUnion<[z.ZodObject<{
            type: z.ZodLiteral<"flat">;
            value: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            value: number;
            type: "flat";
        }, {
            value: number;
            type: "flat";
        }>, z.ZodObject<{
            type: z.ZodLiteral<"match_current_bet">;
        }, "strip", z.ZodTypeAny, {
            type: "match_current_bet";
        }, {
            type: "match_current_bet";
        }>, z.ZodObject<{
            type: z.ZodLiteral<"min_bet">;
        }, "strip", z.ZodTypeAny, {
            type: "min_bet";
        }, {
            type: "min_bet";
        }>, z.ZodObject<{
            type: z.ZodLiteral<"min_raise">;
        }, "strip", z.ZodTypeAny, {
            type: "min_raise";
        }, {
            type: "min_raise";
        }>, z.ZodObject<{
            type: z.ZodLiteral<"pot_limit">;
        }, "strip", z.ZodTypeAny, {
            type: "pot_limit";
        }, {
            type: "pot_limit";
        }>, z.ZodObject<{
            type: z.ZodLiteral<"byRank">;
        }, "strip", z.ZodTypeAny, {
            type: "byRank";
        }, {
            type: "byRank";
        }>, z.ZodLiteral<"0">, z.ZodLiteral<"NA">]>;
        constraints: z.ZodEffects<z.ZodString, string, string>;
        isTerminating: z.ZodBoolean;
        effectType: z.ZodEffects<z.ZodEnum<["draw", "play", "discard", "buy", "bet", "raise", "deal", "reveal", "declare", "award", "pass", "meld", "bid", "fold", "ante", "custom", "NA", "not applicable", "Unknown"]>, "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award", "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award">;
        effectHints: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
            from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            count: z.ZodOptional<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        }, {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        }>, z.ZodObject<{
            amount: z.ZodOptional<z.ZodString>;
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            limitType: z.ZodOptional<z.ZodEnum<["fixed", "pot_limit", "no_limit", "spread_limit"]>>;
        }, "strict", z.ZodTypeAny, {
            amount?: string | undefined;
            min?: number | undefined;
            max?: number | undefined;
            limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
        }, {
            amount?: string | undefined;
            min?: number | undefined;
            max?: number | undefined;
            limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
        }>, z.ZodObject<{
            from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            costSource: z.ZodOptional<z.ZodEnum<["byRank", "flat", "market", "stock"]>>;
        }, "strict", z.ZodTypeAny, {
            from?: string | undefined;
            to?: string | undefined;
            costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
        }, {
            from?: string | undefined;
            to?: string | undefined;
            costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
        }>, z.ZodObject<{
            from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        }, "strict", z.ZodTypeAny, {
            from?: string | undefined;
            to?: string | undefined;
        }, {
            from?: string | undefined;
            to?: string | undefined;
        }>, z.ZodObject<{
            from: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            to: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            count: z.ZodOptional<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        }, {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        }>, z.ZodObject<{
            target: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            count: z.ZodOptional<z.ZodNumber>;
        }, "strict", z.ZodTypeAny, {
            count?: number | undefined;
            target?: string | undefined;
        }, {
            count?: number | undefined;
            target?: string | undefined;
        }>, z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>, z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>, z.ZodObject<{
            amount: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            amount?: string | undefined;
        }, {
            amount?: string | undefined;
        }>, z.ZodObject<{
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            declarationType: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            min?: number | undefined;
            max?: number | undefined;
            declarationType?: string | undefined;
        }, {
            min?: number | undefined;
            max?: number | undefined;
            declarationType?: string | undefined;
        }>, z.ZodRecord<z.ZodString, z.ZodUnknown>]>>;
        id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        supported: true;
        cost: "0" | "NA" | {
            value: number;
            type: "flat";
        } | {
            type: "match_current_bet";
        } | {
            type: "min_bet";
        } | {
            type: "min_raise";
        } | {
            type: "pot_limit";
        } | {
            type: "byRank";
        };
        constraints: string;
        isTerminating: boolean;
        effectType: "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award";
        effectHints?: Record<string, unknown> | {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        } | {
            amount?: string | undefined;
            min?: number | undefined;
            max?: number | undefined;
            limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
            costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        } | {
            count?: number | undefined;
            target?: string | undefined;
        } | {} | {} | {
            amount?: string | undefined;
        } | {
            min?: number | undefined;
            max?: number | undefined;
            declarationType?: string | undefined;
        } | undefined;
        id?: string | undefined;
    }, {
        description: string;
        supported: true;
        cost: "0" | "NA" | {
            value: number;
            type: "flat";
        } | {
            type: "match_current_bet";
        } | {
            type: "min_bet";
        } | {
            type: "min_raise";
        } | {
            type: "pot_limit";
        } | {
            type: "byRank";
        };
        constraints: string;
        isTerminating: boolean;
        effectType: "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award";
        effectHints?: Record<string, unknown> | {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        } | {
            amount?: string | undefined;
            min?: number | undefined;
            max?: number | undefined;
            limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
            costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        } | {
            count?: number | undefined;
            target?: string | undefined;
        } | {} | {} | {
            amount?: string | undefined;
        } | {
            min?: number | undefined;
            max?: number | undefined;
            declarationType?: string | undefined;
        } | undefined;
        id?: string | undefined;
    }>]>, z.ZodObject<{
        id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
    }, {
        id: string;
    }>>, "many">>;
    jokerCount: z.ZodOptional<z.ZodNumber>;
    deckDescription: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    suitDescription: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    rankDescription: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    dealPattern: z.ZodOptional<z.ZodString>;
    bettingLimits: z.ZodOptional<z.ZodEnum<["No Limit", "Fixed Limit", "Pot Limit", "Spread Limit", "None", "NA", "Unknown"]>>;
    actions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    handRankingSystem: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    rankingSystem: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNull]>>;
    useTrump: z.ZodOptional<z.ZodBoolean>;
    notApplicableReasons: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
}, "strict", z.ZodTypeAny, {
    rules: {
        edgeCases: {
            id: string;
            text: string;
            appliesTo?: string | undefined;
            affects?: string | undefined;
        }[];
    };
    shedding: "Unknown" | "NA" | "not applicable" | {
        passAllowed: boolean;
        hasShedding: boolean;
        sheddingGoal: "empty_hand_first" | "empty_hand_last" | "reduce_hand_size";
        validPlays: {
            type: "higher_single" | "higher_pair" | "higher_triple" | "higher_sequence" | "same_count_higher_rank" | "any_combination" | "specific_beats";
            notes: string | null;
        }[];
        burnRules: string | null;
    } | null;
    deckType: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104";
    phases: {
        id: string;
        label: string;
        actor: string;
        legalActions: string[];
        nextPhase: string | null;
        isMandatory: boolean;
        loopIndex: number | null;
        totalLoops: number | null;
        conditionalNext: {
            nextPhase: string | null;
            condition: string;
        }[] | null;
        cardVisibilityChanges: Record<string, "face_up" | "face_down">;
        notes: string | null;
        idTemplate?: string | undefined;
        repeatCount?: number | undefined;
    }[];
    playerActions: {
        [x: string]: {
            description: "NA" | "not applicable";
            supported: false;
            cost: "NA";
            constraints: "NA" | "not applicable";
            isTerminating: boolean;
            effectType: "NA" | "not applicable";
            reason: string;
            effectHints?: Record<string, unknown> | undefined;
            id?: string | undefined;
        } | {
            description: string;
            supported: true;
            cost: "0" | "NA" | {
                value: number;
                type: "flat";
            } | {
                type: "match_current_bet";
            } | {
                type: "min_bet";
            } | {
                type: "min_raise";
            } | {
                type: "pot_limit";
            } | {
                type: "byRank";
            };
            constraints: string;
            isTerminating: boolean;
            effectType: "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award";
            effectHints?: Record<string, unknown> | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                amount?: string | undefined;
                min?: number | undefined;
                max?: number | undefined;
                limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                count?: number | undefined;
                target?: string | undefined;
            } | {} | {} | {
                amount?: string | undefined;
            } | {
                min?: number | undefined;
                max?: number | undefined;
                declarationType?: string | undefined;
            } | undefined;
            id?: string | undefined;
        };
    };
    playerConfig: {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers: number | null;
        startingStack: number | null;
        seatLayout: "circular" | "linear" | "teams_2v2" | "teams_3v3" | "fixed_partnerships" | "variable_partnerships";
        partnerships: boolean;
        partnershipFormats?: ("Unknown" | "NA" | "not applicable" | "2v2" | "3v3" | "2v2v2" | "individual" | "variable")[] | undefined;
    };
    cardVisibility: {
        handDefault: "face_up" | "face_down" | "mixed";
        initialDeal: "face_up" | "face_down" | "mixed";
        marketCards: "face_up" | "face_down" | "mixed" | null;
        stockPurchase: "face_up" | "face_down" | null;
        discardTop: "Unknown" | "NA" | "face_up" | "face_down" | null;
        tableauCards: "Unknown" | "NA" | "face_up" | "face_down" | "mixed" | null;
    };
    drawConfig: {
        canDraw: boolean;
        drawSources: {
            notes: string | null;
            visibility: "face_up" | "face_down";
            source: "stock" | "widow" | "kitty" | "market" | "discard_top" | "discard_any" | "hand_of_player" | "talon";
            isOptional: boolean;
            canPickAny: boolean;
            mustRevealCard: boolean | null;
            maxPerTurn: number | null;
        }[];
        drawCount: number | null;
        drawTiming: "start_of_turn" | "end_of_turn" | "after_discard" | "before_discard" | "any_time" | "phase_specific";
        mustDrawBeforePlay: boolean;
        drawAndDiscard: boolean;
    } | null;
    discardConfig: {
        hasDiscard: boolean;
        mustDiscard: boolean;
        discardTiming: "end_of_turn" | "any_time" | "after_draw" | "after_play";
        discardVisibility: "face_up" | "face_down";
        discardCount: number | null;
        opponentCanPickFromDiscard: boolean;
        discardPickRules: {
            canPickAny: boolean;
            canPickTop: boolean;
            mustTakeAll: boolean;
            mustUsePickedCard: boolean;
            pickCost: string | null;
            frozenPileRules: string | null;
        } | null;
    } | null;
    suitSet: "Hanafuda" | "Italian" | "Ganjifa" | "French" | "Spanish" | "Portuguese" | "German" | "Tarot_minor" | "French_tarock" | "Tarot_de_Marseille" | "Swiss_1JJ" | "Industrie_und_Glueck" | "Tarocco_Piemontese" | "Minchiate" | "Dominoes" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda_snow" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Cego" | "Xiangqi_red_black" | "Four_color" | "Rook_colors" | "Uta_garuta" | "Tiddlywink_colors" | "Gnav" | "Goita" | "Hols_der_Geier_colors" | "Numbered_104";
    rankSet: "Hanafuda" | "Ganjifa" | "Khorol" | "E_awase" | "Chinese_domino" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Uta_garuta" | "Standard_52" | "Pinochle_48" | "Stripped_48" | "Stripped_40" | "Stripped_36" | "Stripped_32" | "Stripped_44" | "Stripped_24" | "Tarot_78" | "Tarot_62" | "Minchiate_97" | "Tarot_54" | "Tarot_40" | "Tarot_66" | "Tarot_42" | "Tarocco_Bolognese_62" | "Tarocco_Sicilian_64" | "FiveHundred_63" | "Cego_38" | "Domino_double6" | "Domino_double8" | "Domino_double9" | "Domino_double12" | "Domino_double15" | "Mahjong_136" | "Mahjong_148" | "Mahjong_152" | "Mahjong_160" | "Domino_double6_plus_double12" | "Domino_double9_plus_double12" | "Stripped_35" | "Stripped_30" | "Stripped_28" | "Stripped_26" | "Stripped_16" | "Xiangqi_pieces" | "Four_color_pieces" | "Gnav_ranks" | "Goita_pieces" | "Rook_1_14" | "Treikort_27" | "Tiddlywink_pieces" | "Hols_der_Geier_1_15" | "Numbered_1_104";
    initialHandSize: number;
    trumpConfig: {
        hasTrump: boolean;
        trumpDetermination: "turned_card" | "bid_winner_chooses" | "fixed_suit" | "last_card_dealt" | "highest_bidder" | "called_by_contract" | "permanent_rank";
        permanentTrumps: {
            name: string | null;
            card: string;
            rank: number | null;
        }[] | null;
        rightBowerLeftBower: boolean;
        trumpSuitRanking: string | null;
        canCallNoTrump: boolean;
        overtakingRule: string | null;
    } | null;
    meldConfig: {
        hasMelding: boolean;
        meldTypes: {
            type: "set" | "run" | "flush" | "pair" | "triplet" | "quartet" | "canasta" | "special";
            minSize: number;
            maxSize: number | null;
            acesHigh: boolean | null;
            wildcardAllowed: boolean;
        }[];
        meldTiming: "any_time_in_turn" | "after_draw_before_discard" | "at_any_time" | "end_of_round_only";
        layOffAllowed: boolean;
        initialMeldRequirement: string | null;
        goingOut: {
            condition: string;
            mustAnnounce: boolean;
            knockOption: boolean;
            knockDeadwoodLimit: number | null;
        };
    } | null;
    trickConfig: {
        bidding: {
            hasBidding: boolean;
            biddingSystem: "auction" | "pass_or_bid" | "fixed_contract" | "german_style" | "solo_bidding";
            minBid: number | null;
            maxBid: number | null;
            passAllowed: boolean;
            doubling: boolean;
        } | null;
        hasTricks: boolean;
        tricksPerRound: number | null;
        mustFollowSuit: boolean;
        mustOvertrump: boolean | null;
        leadRestrictions: string | null;
        trickWinCondition: "highest_of_led_suit" | "highest_trump_if_played_else_highest_led" | "lowest_card_wins" | "specific_card_wins";
        trickWinnerLeads: boolean;
        scoredTricks: boolean;
        canTrumpFirstTrick?: boolean | undefined;
        pointValues?: {
            defaultPerSuit?: Record<string, number> | undefined;
            specificCards?: {
                card: string;
                points: number;
            }[] | undefined;
        } | undefined;
    } | null;
    declarationMechanism: {
        type: "chips_in_fist" | "verbal" | "card_select" | "token" | "none";
        encoding: Record<string, "Unknown" | "NA" | "pass" | "low" | "high" | "both" | "neutral">;
        revealTiming: "simultaneous" | "clockwise" | "after_showdown";
        pigRule: boolean;
        pigPenalty: "Unknown" | "NA" | "forfeit_entire_pot" | "forfeit_one_half" | "points_penalty" | null;
    } | null;
    handRanks: {
        low: "Unknown" | "NA" | "deuce_to_seven" | "ace_to_five" | "ace_to_five_8_or_better" | "ace_to_six" | null;
        high: "Unknown" | "NA" | "standard_poker" | "deuce_to_seven" | "badugi" | "chinese_poker_front" | null;
        lowQualifier: {
            maxHighCard: number;
            acePlaysLow: boolean;
            straightsAndFlushesCount: boolean;
        } | null;
    } | null;
    buyCosts: {
        sources: {
            stock: {
                flat: number;
            };
            discard: "Unknown" | "NA" | "not applicable" | {
                flat: number;
            } | null;
            market: {
                flat: number | null;
                byRank: Record<string, number>;
            };
        };
        enabled: boolean;
        currency: "Unknown" | "NA" | "points" | "chips" | "money" | "tokens";
    } | null;
    marketConfig: {
        enabled: boolean;
        visibility: "face_up" | "face_down";
        size: number;
        refillFrom: "stock" | "discard" | "none";
        refillTiming: "immediately_after_purchase" | "end_of_round" | "start_of_round";
    } | null;
    specialCards: "Unknown" | "NA" | "not applicable" | {
        wildcards: {
            card: string;
            canSubstituteFor: "any_card" | "any_rank" | "any_suit" | "specific_cards";
            restrictions: string | null;
            naturalPreferred: boolean;
        }[] | null;
        actionCards: {
            notes: string | null;
            drawCount: number | null;
            card: string;
            action: "skip_next_player" | "reverse_direction" | "draw_2" | "draw_4" | "wild_suit_change" | "penalty" | "bonus_points" | "extra_turn" | "steal_card" | "force_swap_hand" | "expose_hand" | "block_draw";
            targetPlayer: "next_player" | "previous_player" | "all_others" | "chosen_player" | "self";
        }[] | null;
        bonusCards: {
            condition: string | null;
            card: string;
            bonusPoints: number;
        }[] | null;
        penaltyCards: {
            notes: string | null;
            card: string;
            penaltyPoints: number;
        }[] | null;
    } | null;
    fishingConfig: "Unknown" | "NA" | "not applicable" | {
        hasFishing: boolean;
        captureMethod: "matching_rank" | "sum_equals_target" | "sum_or_match" | "rank_beats_rank";
        captureTarget: number | null;
        sweepBonus: number | null;
        tableauStartSize: number | null;
    } | null;
    patienceConfig: "Unknown" | "NA" | "not applicable" | {
        isSolitaire: boolean;
        tableauColumns: number | null;
        foundationCount: number | null;
        buildDirection: "both" | "ascending" | "descending" | null;
        buildSuitRule: "any_suit" | "same_suit" | "alternate_color" | "opposite_suit" | null;
        redealAllowed: boolean;
        redealCount: number | null;
    } | null;
    bankingConfig: "Unknown" | "NA" | "not applicable" | {
        hasBanker: boolean;
        bankerDetermination: "auction" | "fixed_dealer" | "highest_cut" | "rotating" | "casino_house";
        targetValue: number | null;
        bustRule: string | null;
        playerVsBanker: boolean;
    } | null;
    turnOrder: {
        direction: "clockwise" | "variable" | "counterclockwise";
        startsWith: "dealer" | "left_of_dealer" | "right_of_dealer" | "eldest_hand" | "fixed_player" | "winner_of_previous";
        dealerRotates: boolean;
    };
    roundConfig: "Unknown" | "NA" | "not applicable" | {
        hasRounds: boolean;
        roundCount: number | null;
        roundEndCondition: "player_goes_out" | "stock_exhausted" | "tricks_complete" | "target_score_reached" | "fixed_rounds" | "all_cards_played";
        gameEndCondition: "target_score_reached" | "fixed_rounds_complete" | "elimination" | "last_player_standing" | "agreed_session";
    } | null;
    constants: Partial<Record<"ante" | "optimal_players" | "max_players" | "min_players" | "stock_buy_fee" | "low_threshold" | "challenge_penalty" | "market_size" | "buy_rounds" | "final_hand_size" | "trick_count" | "target_score" | "hand_size" | "kitty_size" | "widow_size" | "buy_limit" | "round_limit" | "min_bet" | "max_raise" | "pot_limit" | "deck_count" | "joker_count" | "barrel_limit" | "rospisat_penalty" | "zero_penalty", number>>;
    finalHandSize: number | null;
    deckCount: number | null;
    zones: {
        type: "grid" | "stack" | "hand" | "pool" | "track" | "area";
        id: string;
        visibility: "hidden" | "private" | "public";
        owner: "team" | "table" | "player";
        capacity?: number | null | undefined;
    }[];
    implementationHints: {
        rngUsed?: ("deal" | "draw" | "shuffle" | "dice" | "random_select")[] | undefined;
        authoritativeServer?: boolean | undefined;
        customLogicNeeded?: string[] | undefined;
    };
    progression?: string[] | undefined;
    roles?: string[] | undefined;
    customActions?: (({
        description: "NA" | "not applicable";
        supported: false;
        cost: "NA";
        constraints: "NA" | "not applicable";
        isTerminating: boolean;
        effectType: "NA" | "not applicable";
        reason: string;
        effectHints?: Record<string, unknown> | undefined;
        id?: string | undefined;
    } | {
        description: string;
        supported: true;
        cost: "0" | "NA" | {
            value: number;
            type: "flat";
        } | {
            type: "match_current_bet";
        } | {
            type: "min_bet";
        } | {
            type: "min_raise";
        } | {
            type: "pot_limit";
        } | {
            type: "byRank";
        };
        constraints: string;
        isTerminating: boolean;
        effectType: "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award";
        effectHints?: Record<string, unknown> | {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        } | {
            amount?: string | undefined;
            min?: number | undefined;
            max?: number | undefined;
            limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
            costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        } | {
            count?: number | undefined;
            target?: string | undefined;
        } | {} | {} | {
            amount?: string | undefined;
        } | {
            min?: number | undefined;
            max?: number | undefined;
            declarationType?: string | undefined;
        } | undefined;
        id?: string | undefined;
    }) & {
        id: string;
    })[] | undefined;
    jokerCount?: number | undefined;
    deckDescription?: string | undefined;
    suitDescription?: string | undefined;
    rankDescription?: string | undefined;
    dealPattern?: string | undefined;
    bettingLimits?: "Unknown" | "NA" | "No Limit" | "Fixed Limit" | "Pot Limit" | "Spread Limit" | "None" | undefined;
    actions?: Record<string, unknown> | undefined;
    handRankingSystem?: string | null | undefined;
    rankingSystem?: string | null | undefined;
    useTrump?: boolean | undefined;
    notApplicableReasons?: Record<string, string> | undefined;
}, {
    rules: {
        edgeCases: {
            id: string;
            text: string;
            appliesTo?: string | undefined;
            affects?: string | undefined;
        }[];
    };
    shedding: "Unknown" | "NA" | "not applicable" | {
        passAllowed: boolean;
        hasShedding: boolean;
        sheddingGoal: "empty_hand_first" | "empty_hand_last" | "reduce_hand_size";
        validPlays: {
            type: "higher_single" | "higher_pair" | "higher_triple" | "higher_sequence" | "same_count_higher_rank" | "any_combination" | "specific_beats";
            notes: string | null;
        }[];
        burnRules: string | null;
    } | null;
    deckType: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104";
    phases: {
        id: string;
        label: string;
        actor: string;
        legalActions: string[];
        nextPhase: string | null;
        isMandatory: boolean;
        loopIndex: number | null;
        totalLoops: number | null;
        conditionalNext: {
            nextPhase: string | null;
            condition: string;
        }[] | null;
        cardVisibilityChanges: Record<string, "face_up" | "face_down">;
        notes: string | null;
        idTemplate?: string | undefined;
        repeatCount?: number | undefined;
    }[];
    playerActions: {
        [x: string]: {
            description: "NA" | "not applicable";
            supported: false;
            cost: "NA";
            constraints: "NA" | "not applicable";
            isTerminating: boolean;
            effectType: "NA" | "not applicable";
            reason: string;
            effectHints?: Record<string, unknown> | undefined;
            id?: string | undefined;
        } | {
            description: string;
            supported: true;
            cost: "0" | "NA" | {
                value: number;
                type: "flat";
            } | {
                type: "match_current_bet";
            } | {
                type: "min_bet";
            } | {
                type: "min_raise";
            } | {
                type: "pot_limit";
            } | {
                type: "byRank";
            };
            constraints: string;
            isTerminating: boolean;
            effectType: "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award";
            effectHints?: Record<string, unknown> | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                amount?: string | undefined;
                min?: number | undefined;
                max?: number | undefined;
                limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                count?: number | undefined;
                target?: string | undefined;
            } | {} | {} | {
                amount?: string | undefined;
            } | {
                min?: number | undefined;
                max?: number | undefined;
                declarationType?: string | undefined;
            } | undefined;
            id?: string | undefined;
        };
    };
    playerConfig: {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers: number | null;
        startingStack: number | null;
        seatLayout: "circular" | "linear" | "teams_2v2" | "teams_3v3" | "fixed_partnerships" | "variable_partnerships";
        partnerships: boolean;
        partnershipFormats?: ("Unknown" | "NA" | "not applicable" | "2v2" | "3v3" | "2v2v2" | "individual" | "variable")[] | undefined;
    };
    cardVisibility: {
        handDefault: "face_up" | "face_down" | "mixed";
        initialDeal: "face_up" | "face_down" | "mixed";
        marketCards: "face_up" | "face_down" | "mixed" | null;
        stockPurchase: "face_up" | "face_down" | null;
        discardTop: "Unknown" | "NA" | "face_up" | "face_down" | null;
        tableauCards: "Unknown" | "NA" | "face_up" | "face_down" | "mixed" | null;
    };
    drawConfig: {
        canDraw: boolean;
        drawSources: {
            notes: string | null;
            visibility: "face_up" | "face_down";
            source: "stock" | "widow" | "kitty" | "market" | "discard_top" | "discard_any" | "hand_of_player" | "talon";
            isOptional: boolean;
            canPickAny: boolean;
            mustRevealCard: boolean | null;
            maxPerTurn: number | null;
        }[];
        drawCount: number | null;
        drawTiming: "start_of_turn" | "end_of_turn" | "after_discard" | "before_discard" | "any_time" | "phase_specific";
        mustDrawBeforePlay: boolean;
        drawAndDiscard: boolean;
    } | null;
    discardConfig: {
        hasDiscard: boolean;
        mustDiscard: boolean;
        discardTiming: "end_of_turn" | "any_time" | "after_draw" | "after_play";
        discardVisibility: "face_up" | "face_down";
        discardCount: number | null;
        opponentCanPickFromDiscard: boolean;
        discardPickRules: {
            canPickAny: boolean;
            canPickTop: boolean;
            mustTakeAll: boolean;
            mustUsePickedCard: boolean;
            pickCost: string | null;
            frozenPileRules: string | null;
        } | null;
    } | null;
    suitSet: "Hanafuda" | "Italian" | "Ganjifa" | "French" | "Spanish" | "Portuguese" | "German" | "Tarot_minor" | "French_tarock" | "Tarot_de_Marseille" | "Swiss_1JJ" | "Industrie_und_Glueck" | "Tarocco_Piemontese" | "Minchiate" | "Dominoes" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda_snow" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Cego" | "Xiangqi_red_black" | "Four_color" | "Rook_colors" | "Uta_garuta" | "Tiddlywink_colors" | "Gnav" | "Goita" | "Hols_der_Geier_colors" | "Numbered_104";
    rankSet: "Hanafuda" | "Ganjifa" | "Khorol" | "E_awase" | "Chinese_domino" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Uta_garuta" | "Standard_52" | "Pinochle_48" | "Stripped_48" | "Stripped_40" | "Stripped_36" | "Stripped_32" | "Stripped_44" | "Stripped_24" | "Tarot_78" | "Tarot_62" | "Minchiate_97" | "Tarot_54" | "Tarot_40" | "Tarot_66" | "Tarot_42" | "Tarocco_Bolognese_62" | "Tarocco_Sicilian_64" | "FiveHundred_63" | "Cego_38" | "Domino_double6" | "Domino_double8" | "Domino_double9" | "Domino_double12" | "Domino_double15" | "Mahjong_136" | "Mahjong_148" | "Mahjong_152" | "Mahjong_160" | "Domino_double6_plus_double12" | "Domino_double9_plus_double12" | "Stripped_35" | "Stripped_30" | "Stripped_28" | "Stripped_26" | "Stripped_16" | "Xiangqi_pieces" | "Four_color_pieces" | "Gnav_ranks" | "Goita_pieces" | "Rook_1_14" | "Treikort_27" | "Tiddlywink_pieces" | "Hols_der_Geier_1_15" | "Numbered_1_104";
    initialHandSize: number;
    trumpConfig: {
        hasTrump: boolean;
        trumpDetermination: "turned_card" | "bid_winner_chooses" | "fixed_suit" | "last_card_dealt" | "highest_bidder" | "called_by_contract" | "permanent_rank";
        permanentTrumps: {
            name: string | null;
            card: string;
            rank: number | null;
        }[] | null;
        rightBowerLeftBower: boolean;
        trumpSuitRanking: string | null;
        canCallNoTrump: boolean;
        overtakingRule: string | null;
    } | null;
    meldConfig: {
        hasMelding: boolean;
        meldTypes: {
            type: "set" | "run" | "flush" | "pair" | "triplet" | "quartet" | "canasta" | "special";
            minSize: number;
            maxSize: number | null;
            acesHigh: boolean | null;
            wildcardAllowed: boolean;
        }[];
        meldTiming: "any_time_in_turn" | "after_draw_before_discard" | "at_any_time" | "end_of_round_only";
        layOffAllowed: boolean;
        initialMeldRequirement: string | null;
        goingOut: {
            condition: string;
            mustAnnounce: boolean;
            knockOption: boolean;
            knockDeadwoodLimit: number | null;
        };
    } | null;
    trickConfig: {
        bidding: {
            hasBidding: boolean;
            biddingSystem: "auction" | "pass_or_bid" | "fixed_contract" | "german_style" | "solo_bidding";
            minBid: number | null;
            maxBid: number | null;
            passAllowed: boolean;
            doubling: boolean;
        } | null;
        hasTricks: boolean;
        tricksPerRound: number | null;
        mustFollowSuit: boolean;
        mustOvertrump: boolean | null;
        leadRestrictions: string | null;
        trickWinCondition: "highest_of_led_suit" | "highest_trump_if_played_else_highest_led" | "lowest_card_wins" | "specific_card_wins";
        trickWinnerLeads: boolean;
        scoredTricks: boolean;
        canTrumpFirstTrick?: boolean | undefined;
        pointValues?: {
            defaultPerSuit?: Record<string, number> | undefined;
            specificCards?: {
                card: string;
                points: number;
            }[] | undefined;
        } | undefined;
    } | null;
    declarationMechanism: {
        type: "chips_in_fist" | "verbal" | "card_select" | "token" | "none";
        encoding: Record<string, "Unknown" | "NA" | "pass" | "low" | "high" | "both" | "neutral">;
        revealTiming: "simultaneous" | "clockwise" | "after_showdown";
        pigRule: boolean;
        pigPenalty: "Unknown" | "NA" | "forfeit_entire_pot" | "forfeit_one_half" | "points_penalty" | null;
    } | null;
    handRanks: {
        low: "Unknown" | "NA" | "deuce_to_seven" | "ace_to_five" | "ace_to_five_8_or_better" | "ace_to_six" | null;
        high: "Unknown" | "NA" | "standard_poker" | "deuce_to_seven" | "badugi" | "chinese_poker_front" | null;
        lowQualifier: {
            maxHighCard: number;
            acePlaysLow: boolean;
            straightsAndFlushesCount: boolean;
        } | null;
    } | null;
    buyCosts: {
        sources: {
            stock: {
                flat: number;
            };
            discard: "Unknown" | "NA" | "not applicable" | {
                flat: number;
            } | null;
            market: {
                flat: number | null;
                byRank: Record<string, number>;
            };
        };
        enabled: boolean;
        currency: "Unknown" | "NA" | "points" | "chips" | "money" | "tokens";
    } | null;
    marketConfig: {
        enabled: boolean;
        visibility: "face_up" | "face_down";
        size: number;
        refillFrom: "stock" | "discard" | "none";
        refillTiming: "immediately_after_purchase" | "end_of_round" | "start_of_round";
    } | null;
    specialCards: "Unknown" | "NA" | "not applicable" | {
        wildcards: {
            card: string;
            canSubstituteFor: "any_card" | "any_rank" | "any_suit" | "specific_cards";
            restrictions: string | null;
            naturalPreferred: boolean;
        }[] | null;
        actionCards: {
            notes: string | null;
            drawCount: number | null;
            card: string;
            action: "skip_next_player" | "reverse_direction" | "draw_2" | "draw_4" | "wild_suit_change" | "penalty" | "bonus_points" | "extra_turn" | "steal_card" | "force_swap_hand" | "expose_hand" | "block_draw";
            targetPlayer: "next_player" | "previous_player" | "all_others" | "chosen_player" | "self";
        }[] | null;
        bonusCards: {
            condition: string | null;
            card: string;
            bonusPoints: number;
        }[] | null;
        penaltyCards: {
            notes: string | null;
            card: string;
            penaltyPoints: number;
        }[] | null;
    } | null;
    fishingConfig: "Unknown" | "NA" | "not applicable" | {
        hasFishing: boolean;
        captureMethod: "matching_rank" | "sum_equals_target" | "sum_or_match" | "rank_beats_rank";
        captureTarget: number | null;
        sweepBonus: number | null;
        tableauStartSize: number | null;
    } | null;
    patienceConfig: "Unknown" | "NA" | "not applicable" | {
        isSolitaire: boolean;
        tableauColumns: number | null;
        foundationCount: number | null;
        buildDirection: "both" | "ascending" | "descending" | null;
        buildSuitRule: "any_suit" | "same_suit" | "alternate_color" | "opposite_suit" | null;
        redealAllowed: boolean;
        redealCount: number | null;
    } | null;
    bankingConfig: "Unknown" | "NA" | "not applicable" | {
        hasBanker: boolean;
        bankerDetermination: "auction" | "fixed_dealer" | "highest_cut" | "rotating" | "casino_house";
        targetValue: number | null;
        bustRule: string | null;
        playerVsBanker: boolean;
    } | null;
    turnOrder: {
        direction: "clockwise" | "variable" | "counterclockwise";
        startsWith: "dealer" | "left_of_dealer" | "right_of_dealer" | "eldest_hand" | "fixed_player" | "winner_of_previous";
        dealerRotates: boolean;
    };
    roundConfig: "Unknown" | "NA" | "not applicable" | {
        hasRounds: boolean;
        roundCount: number | null;
        roundEndCondition: "player_goes_out" | "stock_exhausted" | "tricks_complete" | "target_score_reached" | "fixed_rounds" | "all_cards_played";
        gameEndCondition: "target_score_reached" | "fixed_rounds_complete" | "elimination" | "last_player_standing" | "agreed_session";
    } | null;
    constants: Partial<Record<"ante" | "optimal_players" | "max_players" | "min_players" | "stock_buy_fee" | "low_threshold" | "challenge_penalty" | "market_size" | "buy_rounds" | "final_hand_size" | "trick_count" | "target_score" | "hand_size" | "kitty_size" | "widow_size" | "buy_limit" | "round_limit" | "min_bet" | "max_raise" | "pot_limit" | "deck_count" | "joker_count" | "barrel_limit" | "rospisat_penalty" | "zero_penalty", number>>;
    finalHandSize: number | null;
    deckCount: number | null;
    zones: {
        type: "grid" | "stack" | "hand" | "pool" | "track" | "area";
        id: string;
        visibility: "hidden" | "private" | "public";
        owner: "team" | "table" | "player";
        capacity?: number | null | undefined;
    }[];
    implementationHints: {
        rngUsed?: ("deal" | "draw" | "shuffle" | "dice" | "random_select")[] | undefined;
        authoritativeServer?: boolean | undefined;
        customLogicNeeded?: string[] | undefined;
    };
    progression?: string[] | undefined;
    roles?: string[] | undefined;
    customActions?: (({
        description: "NA" | "not applicable";
        supported: false;
        cost: "NA";
        constraints: "NA" | "not applicable";
        isTerminating: boolean;
        effectType: "NA" | "not applicable";
        reason: string;
        effectHints?: Record<string, unknown> | undefined;
        id?: string | undefined;
    } | {
        description: string;
        supported: true;
        cost: "0" | "NA" | {
            value: number;
            type: "flat";
        } | {
            type: "match_current_bet";
        } | {
            type: "min_bet";
        } | {
            type: "min_raise";
        } | {
            type: "pot_limit";
        } | {
            type: "byRank";
        };
        constraints: string;
        isTerminating: boolean;
        effectType: "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award";
        effectHints?: Record<string, unknown> | {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        } | {
            amount?: string | undefined;
            min?: number | undefined;
            max?: number | undefined;
            limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
            costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        } | {
            count?: number | undefined;
            target?: string | undefined;
        } | {} | {} | {
            amount?: string | undefined;
        } | {
            min?: number | undefined;
            max?: number | undefined;
            declarationType?: string | undefined;
        } | undefined;
        id?: string | undefined;
    }) & {
        id: string;
    })[] | undefined;
    jokerCount?: number | undefined;
    deckDescription?: string | undefined;
    suitDescription?: string | undefined;
    rankDescription?: string | undefined;
    dealPattern?: string | undefined;
    bettingLimits?: "Unknown" | "NA" | "No Limit" | "Fixed Limit" | "Pot Limit" | "Spread Limit" | "None" | undefined;
    actions?: Record<string, unknown> | undefined;
    handRankingSystem?: string | null | undefined;
    rankingSystem?: string | null | undefined;
    useTrump?: boolean | undefined;
    notApplicableReasons?: Record<string, string> | undefined;
}>, {
    rules: {
        edgeCases: {
            id: string;
            text: string;
            appliesTo?: string | undefined;
            affects?: string | undefined;
        }[];
    };
    shedding: "Unknown" | "NA" | "not applicable" | {
        passAllowed: boolean;
        hasShedding: boolean;
        sheddingGoal: "empty_hand_first" | "empty_hand_last" | "reduce_hand_size";
        validPlays: {
            type: "higher_single" | "higher_pair" | "higher_triple" | "higher_sequence" | "same_count_higher_rank" | "any_combination" | "specific_beats";
            notes: string | null;
        }[];
        burnRules: string | null;
    } | null;
    deckType: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104";
    phases: {
        id: string;
        label: string;
        actor: string;
        legalActions: string[];
        nextPhase: string | null;
        isMandatory: boolean;
        loopIndex: number | null;
        totalLoops: number | null;
        conditionalNext: {
            nextPhase: string | null;
            condition: string;
        }[] | null;
        cardVisibilityChanges: Record<string, "face_up" | "face_down">;
        notes: string | null;
        idTemplate?: string | undefined;
        repeatCount?: number | undefined;
    }[];
    playerActions: {
        [x: string]: {
            description: "NA" | "not applicable";
            supported: false;
            cost: "NA";
            constraints: "NA" | "not applicable";
            isTerminating: boolean;
            effectType: "NA" | "not applicable";
            reason: string;
            effectHints?: Record<string, unknown> | undefined;
            id?: string | undefined;
        } | {
            description: string;
            supported: true;
            cost: "0" | "NA" | {
                value: number;
                type: "flat";
            } | {
                type: "match_current_bet";
            } | {
                type: "min_bet";
            } | {
                type: "min_raise";
            } | {
                type: "pot_limit";
            } | {
                type: "byRank";
            };
            constraints: string;
            isTerminating: boolean;
            effectType: "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award";
            effectHints?: Record<string, unknown> | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                amount?: string | undefined;
                min?: number | undefined;
                max?: number | undefined;
                limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                count?: number | undefined;
                target?: string | undefined;
            } | {} | {} | {
                amount?: string | undefined;
            } | {
                min?: number | undefined;
                max?: number | undefined;
                declarationType?: string | undefined;
            } | undefined;
            id?: string | undefined;
        };
    };
    playerConfig: {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers: number | null;
        startingStack: number | null;
        seatLayout: "circular" | "linear" | "teams_2v2" | "teams_3v3" | "fixed_partnerships" | "variable_partnerships";
        partnerships: boolean;
        partnershipFormats?: ("Unknown" | "NA" | "not applicable" | "2v2" | "3v3" | "2v2v2" | "individual" | "variable")[] | undefined;
    };
    cardVisibility: {
        handDefault: "face_up" | "face_down" | "mixed";
        initialDeal: "face_up" | "face_down" | "mixed";
        marketCards: "face_up" | "face_down" | "mixed" | null;
        stockPurchase: "face_up" | "face_down" | null;
        discardTop: "Unknown" | "NA" | "face_up" | "face_down" | null;
        tableauCards: "Unknown" | "NA" | "face_up" | "face_down" | "mixed" | null;
    };
    drawConfig: {
        canDraw: boolean;
        drawSources: {
            notes: string | null;
            visibility: "face_up" | "face_down";
            source: "stock" | "widow" | "kitty" | "market" | "discard_top" | "discard_any" | "hand_of_player" | "talon";
            isOptional: boolean;
            canPickAny: boolean;
            mustRevealCard: boolean | null;
            maxPerTurn: number | null;
        }[];
        drawCount: number | null;
        drawTiming: "start_of_turn" | "end_of_turn" | "after_discard" | "before_discard" | "any_time" | "phase_specific";
        mustDrawBeforePlay: boolean;
        drawAndDiscard: boolean;
    } | null;
    discardConfig: {
        hasDiscard: boolean;
        mustDiscard: boolean;
        discardTiming: "end_of_turn" | "any_time" | "after_draw" | "after_play";
        discardVisibility: "face_up" | "face_down";
        discardCount: number | null;
        opponentCanPickFromDiscard: boolean;
        discardPickRules: {
            canPickAny: boolean;
            canPickTop: boolean;
            mustTakeAll: boolean;
            mustUsePickedCard: boolean;
            pickCost: string | null;
            frozenPileRules: string | null;
        } | null;
    } | null;
    suitSet: "Hanafuda" | "Italian" | "Ganjifa" | "French" | "Spanish" | "Portuguese" | "German" | "Tarot_minor" | "French_tarock" | "Tarot_de_Marseille" | "Swiss_1JJ" | "Industrie_und_Glueck" | "Tarocco_Piemontese" | "Minchiate" | "Dominoes" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda_snow" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Cego" | "Xiangqi_red_black" | "Four_color" | "Rook_colors" | "Uta_garuta" | "Tiddlywink_colors" | "Gnav" | "Goita" | "Hols_der_Geier_colors" | "Numbered_104";
    rankSet: "Hanafuda" | "Ganjifa" | "Khorol" | "E_awase" | "Chinese_domino" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Uta_garuta" | "Standard_52" | "Pinochle_48" | "Stripped_48" | "Stripped_40" | "Stripped_36" | "Stripped_32" | "Stripped_44" | "Stripped_24" | "Tarot_78" | "Tarot_62" | "Minchiate_97" | "Tarot_54" | "Tarot_40" | "Tarot_66" | "Tarot_42" | "Tarocco_Bolognese_62" | "Tarocco_Sicilian_64" | "FiveHundred_63" | "Cego_38" | "Domino_double6" | "Domino_double8" | "Domino_double9" | "Domino_double12" | "Domino_double15" | "Mahjong_136" | "Mahjong_148" | "Mahjong_152" | "Mahjong_160" | "Domino_double6_plus_double12" | "Domino_double9_plus_double12" | "Stripped_35" | "Stripped_30" | "Stripped_28" | "Stripped_26" | "Stripped_16" | "Xiangqi_pieces" | "Four_color_pieces" | "Gnav_ranks" | "Goita_pieces" | "Rook_1_14" | "Treikort_27" | "Tiddlywink_pieces" | "Hols_der_Geier_1_15" | "Numbered_1_104";
    initialHandSize: number;
    trumpConfig: {
        hasTrump: boolean;
        trumpDetermination: "turned_card" | "bid_winner_chooses" | "fixed_suit" | "last_card_dealt" | "highest_bidder" | "called_by_contract" | "permanent_rank";
        permanentTrumps: {
            name: string | null;
            card: string;
            rank: number | null;
        }[] | null;
        rightBowerLeftBower: boolean;
        trumpSuitRanking: string | null;
        canCallNoTrump: boolean;
        overtakingRule: string | null;
    } | null;
    meldConfig: {
        hasMelding: boolean;
        meldTypes: {
            type: "set" | "run" | "flush" | "pair" | "triplet" | "quartet" | "canasta" | "special";
            minSize: number;
            maxSize: number | null;
            acesHigh: boolean | null;
            wildcardAllowed: boolean;
        }[];
        meldTiming: "any_time_in_turn" | "after_draw_before_discard" | "at_any_time" | "end_of_round_only";
        layOffAllowed: boolean;
        initialMeldRequirement: string | null;
        goingOut: {
            condition: string;
            mustAnnounce: boolean;
            knockOption: boolean;
            knockDeadwoodLimit: number | null;
        };
    } | null;
    trickConfig: {
        bidding: {
            hasBidding: boolean;
            biddingSystem: "auction" | "pass_or_bid" | "fixed_contract" | "german_style" | "solo_bidding";
            minBid: number | null;
            maxBid: number | null;
            passAllowed: boolean;
            doubling: boolean;
        } | null;
        hasTricks: boolean;
        tricksPerRound: number | null;
        mustFollowSuit: boolean;
        mustOvertrump: boolean | null;
        leadRestrictions: string | null;
        trickWinCondition: "highest_of_led_suit" | "highest_trump_if_played_else_highest_led" | "lowest_card_wins" | "specific_card_wins";
        trickWinnerLeads: boolean;
        scoredTricks: boolean;
        canTrumpFirstTrick?: boolean | undefined;
        pointValues?: {
            defaultPerSuit?: Record<string, number> | undefined;
            specificCards?: {
                card: string;
                points: number;
            }[] | undefined;
        } | undefined;
    } | null;
    declarationMechanism: {
        type: "chips_in_fist" | "verbal" | "card_select" | "token" | "none";
        encoding: Record<string, "Unknown" | "NA" | "pass" | "low" | "high" | "both" | "neutral">;
        revealTiming: "simultaneous" | "clockwise" | "after_showdown";
        pigRule: boolean;
        pigPenalty: "Unknown" | "NA" | "forfeit_entire_pot" | "forfeit_one_half" | "points_penalty" | null;
    } | null;
    handRanks: {
        low: "Unknown" | "NA" | "deuce_to_seven" | "ace_to_five" | "ace_to_five_8_or_better" | "ace_to_six" | null;
        high: "Unknown" | "NA" | "standard_poker" | "deuce_to_seven" | "badugi" | "chinese_poker_front" | null;
        lowQualifier: {
            maxHighCard: number;
            acePlaysLow: boolean;
            straightsAndFlushesCount: boolean;
        } | null;
    } | null;
    buyCosts: {
        sources: {
            stock: {
                flat: number;
            };
            discard: "Unknown" | "NA" | "not applicable" | {
                flat: number;
            } | null;
            market: {
                flat: number | null;
                byRank: Record<string, number>;
            };
        };
        enabled: boolean;
        currency: "Unknown" | "NA" | "points" | "chips" | "money" | "tokens";
    } | null;
    marketConfig: {
        enabled: boolean;
        visibility: "face_up" | "face_down";
        size: number;
        refillFrom: "stock" | "discard" | "none";
        refillTiming: "immediately_after_purchase" | "end_of_round" | "start_of_round";
    } | null;
    specialCards: "Unknown" | "NA" | "not applicable" | {
        wildcards: {
            card: string;
            canSubstituteFor: "any_card" | "any_rank" | "any_suit" | "specific_cards";
            restrictions: string | null;
            naturalPreferred: boolean;
        }[] | null;
        actionCards: {
            notes: string | null;
            drawCount: number | null;
            card: string;
            action: "skip_next_player" | "reverse_direction" | "draw_2" | "draw_4" | "wild_suit_change" | "penalty" | "bonus_points" | "extra_turn" | "steal_card" | "force_swap_hand" | "expose_hand" | "block_draw";
            targetPlayer: "next_player" | "previous_player" | "all_others" | "chosen_player" | "self";
        }[] | null;
        bonusCards: {
            condition: string | null;
            card: string;
            bonusPoints: number;
        }[] | null;
        penaltyCards: {
            notes: string | null;
            card: string;
            penaltyPoints: number;
        }[] | null;
    } | null;
    fishingConfig: "Unknown" | "NA" | "not applicable" | {
        hasFishing: boolean;
        captureMethod: "matching_rank" | "sum_equals_target" | "sum_or_match" | "rank_beats_rank";
        captureTarget: number | null;
        sweepBonus: number | null;
        tableauStartSize: number | null;
    } | null;
    patienceConfig: "Unknown" | "NA" | "not applicable" | {
        isSolitaire: boolean;
        tableauColumns: number | null;
        foundationCount: number | null;
        buildDirection: "both" | "ascending" | "descending" | null;
        buildSuitRule: "any_suit" | "same_suit" | "alternate_color" | "opposite_suit" | null;
        redealAllowed: boolean;
        redealCount: number | null;
    } | null;
    bankingConfig: "Unknown" | "NA" | "not applicable" | {
        hasBanker: boolean;
        bankerDetermination: "auction" | "fixed_dealer" | "highest_cut" | "rotating" | "casino_house";
        targetValue: number | null;
        bustRule: string | null;
        playerVsBanker: boolean;
    } | null;
    turnOrder: {
        direction: "clockwise" | "variable" | "counterclockwise";
        startsWith: "dealer" | "left_of_dealer" | "right_of_dealer" | "eldest_hand" | "fixed_player" | "winner_of_previous";
        dealerRotates: boolean;
    };
    roundConfig: "Unknown" | "NA" | "not applicable" | {
        hasRounds: boolean;
        roundCount: number | null;
        roundEndCondition: "player_goes_out" | "stock_exhausted" | "tricks_complete" | "target_score_reached" | "fixed_rounds" | "all_cards_played";
        gameEndCondition: "target_score_reached" | "fixed_rounds_complete" | "elimination" | "last_player_standing" | "agreed_session";
    } | null;
    constants: Partial<Record<"ante" | "optimal_players" | "max_players" | "min_players" | "stock_buy_fee" | "low_threshold" | "challenge_penalty" | "market_size" | "buy_rounds" | "final_hand_size" | "trick_count" | "target_score" | "hand_size" | "kitty_size" | "widow_size" | "buy_limit" | "round_limit" | "min_bet" | "max_raise" | "pot_limit" | "deck_count" | "joker_count" | "barrel_limit" | "rospisat_penalty" | "zero_penalty", number>>;
    finalHandSize: number | null;
    deckCount: number | null;
    zones: {
        type: "grid" | "stack" | "hand" | "pool" | "track" | "area";
        id: string;
        visibility: "hidden" | "private" | "public";
        owner: "team" | "table" | "player";
        capacity?: number | null | undefined;
    }[];
    implementationHints: {
        rngUsed?: ("deal" | "draw" | "shuffle" | "dice" | "random_select")[] | undefined;
        authoritativeServer?: boolean | undefined;
        customLogicNeeded?: string[] | undefined;
    };
    progression?: string[] | undefined;
    roles?: string[] | undefined;
    customActions?: (({
        description: "NA" | "not applicable";
        supported: false;
        cost: "NA";
        constraints: "NA" | "not applicable";
        isTerminating: boolean;
        effectType: "NA" | "not applicable";
        reason: string;
        effectHints?: Record<string, unknown> | undefined;
        id?: string | undefined;
    } | {
        description: string;
        supported: true;
        cost: "0" | "NA" | {
            value: number;
            type: "flat";
        } | {
            type: "match_current_bet";
        } | {
            type: "min_bet";
        } | {
            type: "min_raise";
        } | {
            type: "pot_limit";
        } | {
            type: "byRank";
        };
        constraints: string;
        isTerminating: boolean;
        effectType: "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award";
        effectHints?: Record<string, unknown> | {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        } | {
            amount?: string | undefined;
            min?: number | undefined;
            max?: number | undefined;
            limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
            costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        } | {
            count?: number | undefined;
            target?: string | undefined;
        } | {} | {} | {
            amount?: string | undefined;
        } | {
            min?: number | undefined;
            max?: number | undefined;
            declarationType?: string | undefined;
        } | undefined;
        id?: string | undefined;
    }) & {
        id: string;
    })[] | undefined;
    jokerCount?: number | undefined;
    deckDescription?: string | undefined;
    suitDescription?: string | undefined;
    rankDescription?: string | undefined;
    dealPattern?: string | undefined;
    bettingLimits?: "Unknown" | "NA" | "No Limit" | "Fixed Limit" | "Pot Limit" | "Spread Limit" | "None" | undefined;
    actions?: Record<string, unknown> | undefined;
    handRankingSystem?: string | null | undefined;
    rankingSystem?: string | null | undefined;
    useTrump?: boolean | undefined;
    notApplicableReasons?: Record<string, string> | undefined;
}, {
    rules: {
        edgeCases: {
            id: string;
            text: string;
            appliesTo?: string | undefined;
            affects?: string | undefined;
        }[];
    };
    shedding: "Unknown" | "NA" | "not applicable" | {
        passAllowed: boolean;
        hasShedding: boolean;
        sheddingGoal: "empty_hand_first" | "empty_hand_last" | "reduce_hand_size";
        validPlays: {
            type: "higher_single" | "higher_pair" | "higher_triple" | "higher_sequence" | "same_count_higher_rank" | "any_combination" | "specific_beats";
            notes: string | null;
        }[];
        burnRules: string | null;
    } | null;
    deckType: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104";
    phases: {
        id: string;
        label: string;
        actor: string;
        legalActions: string[];
        nextPhase: string | null;
        isMandatory: boolean;
        loopIndex: number | null;
        totalLoops: number | null;
        conditionalNext: {
            nextPhase: string | null;
            condition: string;
        }[] | null;
        cardVisibilityChanges: Record<string, "face_up" | "face_down">;
        notes: string | null;
        idTemplate?: string | undefined;
        repeatCount?: number | undefined;
    }[];
    playerActions: {
        [x: string]: {
            description: "NA" | "not applicable";
            supported: false;
            cost: "NA";
            constraints: "NA" | "not applicable";
            isTerminating: boolean;
            effectType: "NA" | "not applicable";
            reason: string;
            effectHints?: Record<string, unknown> | undefined;
            id?: string | undefined;
        } | {
            description: string;
            supported: true;
            cost: "0" | "NA" | {
                value: number;
                type: "flat";
            } | {
                type: "match_current_bet";
            } | {
                type: "min_bet";
            } | {
                type: "min_raise";
            } | {
                type: "pot_limit";
            } | {
                type: "byRank";
            };
            constraints: string;
            isTerminating: boolean;
            effectType: "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award";
            effectHints?: Record<string, unknown> | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                amount?: string | undefined;
                min?: number | undefined;
                max?: number | undefined;
                limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
            } | {
                from?: string | undefined;
                to?: string | undefined;
                count?: number | undefined;
            } | {
                count?: number | undefined;
                target?: string | undefined;
            } | {} | {} | {
                amount?: string | undefined;
            } | {
                min?: number | undefined;
                max?: number | undefined;
                declarationType?: string | undefined;
            } | undefined;
            id?: string | undefined;
        };
    };
    playerConfig: {
        minPlayers: number;
        maxPlayers: number;
        playerMode: "singleplayer" | "multiplayer";
        optimalPlayers: number | null;
        startingStack: number | null;
        seatLayout: "circular" | "linear" | "teams_2v2" | "teams_3v3" | "fixed_partnerships" | "variable_partnerships";
        partnerships: boolean;
        partnershipFormats?: ("Unknown" | "NA" | "not applicable" | "2v2" | "3v3" | "2v2v2" | "individual" | "variable")[] | undefined;
    };
    cardVisibility: {
        handDefault: "face_up" | "face_down" | "mixed";
        initialDeal: "face_up" | "face_down" | "mixed";
        marketCards: "face_up" | "face_down" | "mixed" | null;
        stockPurchase: "face_up" | "face_down" | null;
        discardTop: "Unknown" | "NA" | "face_up" | "face_down" | null;
        tableauCards: "Unknown" | "NA" | "face_up" | "face_down" | "mixed" | null;
    };
    drawConfig: {
        canDraw: boolean;
        drawSources: {
            notes: string | null;
            visibility: "face_up" | "face_down";
            source: "stock" | "widow" | "kitty" | "market" | "discard_top" | "discard_any" | "hand_of_player" | "talon";
            isOptional: boolean;
            canPickAny: boolean;
            mustRevealCard: boolean | null;
            maxPerTurn: number | null;
        }[];
        drawCount: number | null;
        drawTiming: "start_of_turn" | "end_of_turn" | "after_discard" | "before_discard" | "any_time" | "phase_specific";
        mustDrawBeforePlay: boolean;
        drawAndDiscard: boolean;
    } | null;
    discardConfig: {
        hasDiscard: boolean;
        mustDiscard: boolean;
        discardTiming: "end_of_turn" | "any_time" | "after_draw" | "after_play";
        discardVisibility: "face_up" | "face_down";
        discardCount: number | null;
        opponentCanPickFromDiscard: boolean;
        discardPickRules: {
            canPickAny: boolean;
            canPickTop: boolean;
            mustTakeAll: boolean;
            mustUsePickedCard: boolean;
            pickCost: string | null;
            frozenPileRules: string | null;
        } | null;
    } | null;
    suitSet: "Hanafuda" | "Italian" | "Ganjifa" | "French" | "Spanish" | "Portuguese" | "German" | "Tarot_minor" | "French_tarock" | "Tarot_de_Marseille" | "Swiss_1JJ" | "Industrie_und_Glueck" | "Tarocco_Piemontese" | "Minchiate" | "Dominoes" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda_snow" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Cego" | "Xiangqi_red_black" | "Four_color" | "Rook_colors" | "Uta_garuta" | "Tiddlywink_colors" | "Gnav" | "Goita" | "Hols_der_Geier_colors" | "Numbered_104";
    rankSet: "Hanafuda" | "Ganjifa" | "Khorol" | "E_awase" | "Chinese_domino" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Uta_garuta" | "Standard_52" | "Pinochle_48" | "Stripped_48" | "Stripped_40" | "Stripped_36" | "Stripped_32" | "Stripped_44" | "Stripped_24" | "Tarot_78" | "Tarot_62" | "Minchiate_97" | "Tarot_54" | "Tarot_40" | "Tarot_66" | "Tarot_42" | "Tarocco_Bolognese_62" | "Tarocco_Sicilian_64" | "FiveHundred_63" | "Cego_38" | "Domino_double6" | "Domino_double8" | "Domino_double9" | "Domino_double12" | "Domino_double15" | "Mahjong_136" | "Mahjong_148" | "Mahjong_152" | "Mahjong_160" | "Domino_double6_plus_double12" | "Domino_double9_plus_double12" | "Stripped_35" | "Stripped_30" | "Stripped_28" | "Stripped_26" | "Stripped_16" | "Xiangqi_pieces" | "Four_color_pieces" | "Gnav_ranks" | "Goita_pieces" | "Rook_1_14" | "Treikort_27" | "Tiddlywink_pieces" | "Hols_der_Geier_1_15" | "Numbered_1_104";
    initialHandSize: number;
    trumpConfig: {
        hasTrump: boolean;
        trumpDetermination: "turned_card" | "bid_winner_chooses" | "fixed_suit" | "last_card_dealt" | "highest_bidder" | "called_by_contract" | "permanent_rank";
        permanentTrumps: {
            name: string | null;
            card: string;
            rank: number | null;
        }[] | null;
        rightBowerLeftBower: boolean;
        trumpSuitRanking: string | null;
        canCallNoTrump: boolean;
        overtakingRule: string | null;
    } | null;
    meldConfig: {
        hasMelding: boolean;
        meldTypes: {
            type: "set" | "run" | "flush" | "pair" | "triplet" | "quartet" | "canasta" | "special";
            minSize: number;
            maxSize: number | null;
            acesHigh: boolean | null;
            wildcardAllowed: boolean;
        }[];
        meldTiming: "any_time_in_turn" | "after_draw_before_discard" | "at_any_time" | "end_of_round_only";
        layOffAllowed: boolean;
        initialMeldRequirement: string | null;
        goingOut: {
            condition: string;
            mustAnnounce: boolean;
            knockOption: boolean;
            knockDeadwoodLimit: number | null;
        };
    } | null;
    trickConfig: {
        bidding: {
            hasBidding: boolean;
            biddingSystem: "auction" | "pass_or_bid" | "fixed_contract" | "german_style" | "solo_bidding";
            minBid: number | null;
            maxBid: number | null;
            passAllowed: boolean;
            doubling: boolean;
        } | null;
        hasTricks: boolean;
        tricksPerRound: number | null;
        mustFollowSuit: boolean;
        mustOvertrump: boolean | null;
        leadRestrictions: string | null;
        trickWinCondition: "highest_of_led_suit" | "highest_trump_if_played_else_highest_led" | "lowest_card_wins" | "specific_card_wins";
        trickWinnerLeads: boolean;
        scoredTricks: boolean;
        canTrumpFirstTrick?: boolean | undefined;
        pointValues?: {
            defaultPerSuit?: Record<string, number> | undefined;
            specificCards?: {
                card: string;
                points: number;
            }[] | undefined;
        } | undefined;
    } | null;
    declarationMechanism: {
        type: "chips_in_fist" | "verbal" | "card_select" | "token" | "none";
        encoding: Record<string, "Unknown" | "NA" | "pass" | "low" | "high" | "both" | "neutral">;
        revealTiming: "simultaneous" | "clockwise" | "after_showdown";
        pigRule: boolean;
        pigPenalty: "Unknown" | "NA" | "forfeit_entire_pot" | "forfeit_one_half" | "points_penalty" | null;
    } | null;
    handRanks: {
        low: "Unknown" | "NA" | "deuce_to_seven" | "ace_to_five" | "ace_to_five_8_or_better" | "ace_to_six" | null;
        high: "Unknown" | "NA" | "standard_poker" | "deuce_to_seven" | "badugi" | "chinese_poker_front" | null;
        lowQualifier: {
            maxHighCard: number;
            acePlaysLow: boolean;
            straightsAndFlushesCount: boolean;
        } | null;
    } | null;
    buyCosts: {
        sources: {
            stock: {
                flat: number;
            };
            discard: "Unknown" | "NA" | "not applicable" | {
                flat: number;
            } | null;
            market: {
                flat: number | null;
                byRank: Record<string, number>;
            };
        };
        enabled: boolean;
        currency: "Unknown" | "NA" | "points" | "chips" | "money" | "tokens";
    } | null;
    marketConfig: {
        enabled: boolean;
        visibility: "face_up" | "face_down";
        size: number;
        refillFrom: "stock" | "discard" | "none";
        refillTiming: "immediately_after_purchase" | "end_of_round" | "start_of_round";
    } | null;
    specialCards: "Unknown" | "NA" | "not applicable" | {
        wildcards: {
            card: string;
            canSubstituteFor: "any_card" | "any_rank" | "any_suit" | "specific_cards";
            restrictions: string | null;
            naturalPreferred: boolean;
        }[] | null;
        actionCards: {
            notes: string | null;
            drawCount: number | null;
            card: string;
            action: "skip_next_player" | "reverse_direction" | "draw_2" | "draw_4" | "wild_suit_change" | "penalty" | "bonus_points" | "extra_turn" | "steal_card" | "force_swap_hand" | "expose_hand" | "block_draw";
            targetPlayer: "next_player" | "previous_player" | "all_others" | "chosen_player" | "self";
        }[] | null;
        bonusCards: {
            condition: string | null;
            card: string;
            bonusPoints: number;
        }[] | null;
        penaltyCards: {
            notes: string | null;
            card: string;
            penaltyPoints: number;
        }[] | null;
    } | null;
    fishingConfig: "Unknown" | "NA" | "not applicable" | {
        hasFishing: boolean;
        captureMethod: "matching_rank" | "sum_equals_target" | "sum_or_match" | "rank_beats_rank";
        captureTarget: number | null;
        sweepBonus: number | null;
        tableauStartSize: number | null;
    } | null;
    patienceConfig: "Unknown" | "NA" | "not applicable" | {
        isSolitaire: boolean;
        tableauColumns: number | null;
        foundationCount: number | null;
        buildDirection: "both" | "ascending" | "descending" | null;
        buildSuitRule: "any_suit" | "same_suit" | "alternate_color" | "opposite_suit" | null;
        redealAllowed: boolean;
        redealCount: number | null;
    } | null;
    bankingConfig: "Unknown" | "NA" | "not applicable" | {
        hasBanker: boolean;
        bankerDetermination: "auction" | "fixed_dealer" | "highest_cut" | "rotating" | "casino_house";
        targetValue: number | null;
        bustRule: string | null;
        playerVsBanker: boolean;
    } | null;
    turnOrder: {
        direction: "clockwise" | "variable" | "counterclockwise";
        startsWith: "dealer" | "left_of_dealer" | "right_of_dealer" | "eldest_hand" | "fixed_player" | "winner_of_previous";
        dealerRotates: boolean;
    };
    roundConfig: "Unknown" | "NA" | "not applicable" | {
        hasRounds: boolean;
        roundCount: number | null;
        roundEndCondition: "player_goes_out" | "stock_exhausted" | "tricks_complete" | "target_score_reached" | "fixed_rounds" | "all_cards_played";
        gameEndCondition: "target_score_reached" | "fixed_rounds_complete" | "elimination" | "last_player_standing" | "agreed_session";
    } | null;
    constants: Partial<Record<"ante" | "optimal_players" | "max_players" | "min_players" | "stock_buy_fee" | "low_threshold" | "challenge_penalty" | "market_size" | "buy_rounds" | "final_hand_size" | "trick_count" | "target_score" | "hand_size" | "kitty_size" | "widow_size" | "buy_limit" | "round_limit" | "min_bet" | "max_raise" | "pot_limit" | "deck_count" | "joker_count" | "barrel_limit" | "rospisat_penalty" | "zero_penalty", number>>;
    finalHandSize: number | null;
    deckCount: number | null;
    zones: {
        type: "grid" | "stack" | "hand" | "pool" | "track" | "area";
        id: string;
        visibility: "hidden" | "private" | "public";
        owner: "team" | "table" | "player";
        capacity?: number | null | undefined;
    }[];
    implementationHints: {
        rngUsed?: ("deal" | "draw" | "shuffle" | "dice" | "random_select")[] | undefined;
        authoritativeServer?: boolean | undefined;
        customLogicNeeded?: string[] | undefined;
    };
    progression?: string[] | undefined;
    roles?: string[] | undefined;
    customActions?: (({
        description: "NA" | "not applicable";
        supported: false;
        cost: "NA";
        constraints: "NA" | "not applicable";
        isTerminating: boolean;
        effectType: "NA" | "not applicable";
        reason: string;
        effectHints?: Record<string, unknown> | undefined;
        id?: string | undefined;
    } | {
        description: string;
        supported: true;
        cost: "0" | "NA" | {
            value: number;
            type: "flat";
        } | {
            type: "match_current_bet";
        } | {
            type: "min_bet";
        } | {
            type: "min_raise";
        } | {
            type: "pot_limit";
        } | {
            type: "byRank";
        };
        constraints: string;
        isTerminating: boolean;
        effectType: "Unknown" | "NA" | "not applicable" | "ante" | "discard" | "deal" | "fold" | "bet" | "raise" | "declare" | "draw" | "pass" | "bid" | "meld" | "custom" | "play" | "buy" | "reveal" | "award";
        effectHints?: Record<string, unknown> | {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        } | {
            amount?: string | undefined;
            min?: number | undefined;
            max?: number | undefined;
            limitType?: "pot_limit" | "fixed" | "no_limit" | "spread_limit" | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
            costSource?: "flat" | "byRank" | "stock" | "market" | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
        } | {
            from?: string | undefined;
            to?: string | undefined;
            count?: number | undefined;
        } | {
            count?: number | undefined;
            target?: string | undefined;
        } | {} | {} | {
            amount?: string | undefined;
        } | {
            min?: number | undefined;
            max?: number | undefined;
            declarationType?: string | undefined;
        } | undefined;
        id?: string | undefined;
    }) & {
        id: string;
    })[] | undefined;
    jokerCount?: number | undefined;
    deckDescription?: string | undefined;
    suitDescription?: string | undefined;
    rankDescription?: string | undefined;
    dealPattern?: string | undefined;
    bettingLimits?: "Unknown" | "NA" | "No Limit" | "Fixed Limit" | "Pot Limit" | "Spread Limit" | "None" | undefined;
    actions?: Record<string, unknown> | undefined;
    handRankingSystem?: string | null | undefined;
    rankingSystem?: string | null | undefined;
    useTrump?: boolean | undefined;
    notApplicableReasons?: Record<string, string> | undefined;
}>;
declare const synthesisSchema: z.ZodObject<{
    hero: z.ZodObject<{
        title: z.ZodString;
        subtitle: z.ZodString;
        tagline: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        title: string;
        subtitle: string;
        tagline: string;
    }, {
        title: string;
        subtitle: string;
        tagline: string;
    }>;
    shortDescription: z.ZodString;
    uiThemes: z.ZodArray<z.ZodEnum<["classic", "noir", "neon", "traditional", "arabic", "asian", "minimal", "luxury", "cartoon", "retro"]>, "many">;
    uiLayout: z.ZodObject<{
        zones: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
        marketPosition: z.ZodUnion<[z.ZodEnum<["center", "center_top", "center_bottom", "left", "right"]>, z.ZodNull]>;
        stockPosition: z.ZodUnion<[z.ZodEnum<["center", "center_right", "center_left", "top_right", "top_left"]>, z.ZodNull]>;
        discardPosition: z.ZodUnion<[z.ZodEnum<["center", "center_left", "center_right", "adjacent_stock", "NA", "Unknown"]>, z.ZodNull]>;
        playerHandLayout: z.ZodEnum<["arc", "row", "grid", "stacked"]>;
        potPosition: z.ZodUnion<[z.ZodEnum<["center", "top_center", "bottom_center"]>, z.ZodNull]>;
    }, "strip", z.ZodTypeAny, {
        zones: string[];
        marketPosition: "center" | "center_top" | "center_bottom" | "left" | "right" | null;
        stockPosition: "center" | "center_right" | "center_left" | "top_right" | "top_left" | null;
        discardPosition: "Unknown" | "NA" | "center" | "center_right" | "center_left" | "adjacent_stock" | null;
        playerHandLayout: "arc" | "row" | "grid" | "stacked";
        potPosition: "center" | "top_center" | "bottom_center" | null;
    }, {
        zones: string[];
        marketPosition: "center" | "center_top" | "center_bottom" | "left" | "right" | null;
        stockPosition: "center" | "center_right" | "center_left" | "top_right" | "top_left" | null;
        discardPosition: "Unknown" | "NA" | "center" | "center_right" | "center_left" | "adjacent_stock" | null;
        playerHandLayout: "arc" | "row" | "grid" | "stacked";
        potPosition: "center" | "top_center" | "bottom_center" | null;
    }>;
}, "strict", z.ZodTypeAny, {
    hero: {
        title: string;
        subtitle: string;
        tagline: string;
    };
    shortDescription: string;
    uiThemes: ("classic" | "noir" | "neon" | "traditional" | "arabic" | "asian" | "minimal" | "luxury" | "cartoon" | "retro")[];
    uiLayout: {
        zones: string[];
        marketPosition: "center" | "center_top" | "center_bottom" | "left" | "right" | null;
        stockPosition: "center" | "center_right" | "center_left" | "top_right" | "top_left" | null;
        discardPosition: "Unknown" | "NA" | "center" | "center_right" | "center_left" | "adjacent_stock" | null;
        playerHandLayout: "arc" | "row" | "grid" | "stacked";
        potPosition: "center" | "top_center" | "bottom_center" | null;
    };
}, {
    hero: {
        title: string;
        subtitle: string;
        tagline: string;
    };
    shortDescription: string;
    uiThemes: ("classic" | "noir" | "neon" | "traditional" | "arabic" | "asian" | "minimal" | "luxury" | "cartoon" | "retro")[];
    uiLayout: {
        zones: string[];
        marketPosition: "center" | "center_top" | "center_bottom" | "left" | "right" | null;
        stockPosition: "center" | "center_right" | "center_left" | "top_right" | "top_left" | null;
        discardPosition: "Unknown" | "NA" | "center" | "center_right" | "center_left" | "adjacent_stock" | null;
        playerHandLayout: "arc" | "row" | "grid" | "stacked";
        potPosition: "center" | "top_center" | "bottom_center" | null;
    };
}>;
declare const promptsSchema: z.ZodObject<{
    human: z.ZodString;
    ai: z.ZodString;
}, "strict", z.ZodTypeAny, {
    ai: string;
    human: string;
}, {
    ai: string;
    human: string;
}>;
interface IOverview extends z.infer<typeof overviewSchema> {
}
interface IHistory extends z.infer<typeof historySchema> {
}
interface ISetup extends z.infer<typeof setupSchema> {
}
interface IRules extends z.infer<typeof rulesSchema> {
}
interface IStrategy extends z.infer<typeof strategySchema> {
}
interface IVariations extends z.infer<typeof variationsSchema> {
}
interface IAi extends z.infer<typeof aiSchema> {
}
interface ISources extends z.infer<typeof sourcesSchema> {
}
interface IEngine extends z.infer<typeof engineSchema> {
}
interface ISynthesis extends z.infer<typeof synthesisSchema> {
}
interface IPrompts extends z.infer<typeof promptsSchema> {
}
interface IScoring extends z.infer<typeof scoringSchema> {
}
interface IEvidence extends z.infer<typeof evidenceSchema> {
}
interface IExtraction extends z.infer<typeof extractionSchema> {
}
declare const _GameSchemaInner: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodObject<{
    schemaVersion: z.ZodString;
    engineModelVersion: z.ZodString;
    filename: z.ZodString;
    name: z.ZodString;
    completeness: z.ZodObject<{
        overview: z.ZodBoolean;
        history: z.ZodBoolean;
        setup: z.ZodBoolean;
        rules: z.ZodBoolean;
        strategy: z.ZodBoolean;
        variations: z.ZodBoolean;
        ai: z.ZodBoolean;
        sources: z.ZodBoolean;
    }, "strict", z.ZodTypeAny, {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    }, {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    }>;
    quality: z.ZodEnum<["complete", "stub", "partial", "draft", "Unknown"]>;
    qualityReason: z.ZodOptional<z.ZodString>;
    overview: z.ZodType<IOverview, z.ZodTypeDef, IOverview>;
    history: z.ZodType<IHistory, z.ZodTypeDef, IHistory>;
    setup: z.ZodType<ISetup, z.ZodTypeDef, ISetup>;
    rules: z.ZodType<IRules, z.ZodTypeDef, IRules>;
    strategy: z.ZodType<IStrategy, z.ZodTypeDef, IStrategy>;
    variations: z.ZodType<IVariations, z.ZodTypeDef, IVariations>;
    ai: z.ZodType<IAi, z.ZodTypeDef, IAi>;
    sources: z.ZodType<ISources, z.ZodTypeDef, ISources>;
    tags: z.ZodArray<z.ZodEnum<["social", "fast-paced", "gambling", "traditional", "trick-taking", "melding", "shedding", "fishing", "banking", "solitaire", "climbing", "vying", "matching", "bluffing", "cooperative", "team", "draw-and-discard", "market-mechanics", "high-low", "trump", "no-trump", "bidding", "auction", "partnership", "domino", "tile", "rummy", "poker", "poker-variant", "war", "patience", "betting", "strategy", "stud"]>, "many">;
    legal: z.ZodObject<{
        status: z.ZodEnum<["Public Domain", "Proprietary", "Trademarked", "Patent-Expired", "Unknown", "NA"]>;
        reasonForNA: z.ZodOptional<z.ZodString>;
        isCommercial: z.ZodBoolean;
        trademarkNote: z.ZodUnion<[z.ZodString, z.ZodNull]>;
    }, "strict", z.ZodTypeAny, {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    }, {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    }>;
    statistics: z.ZodObject<{
        popularity: z.ZodNumber;
        complexity: z.ZodNumber;
        luck: z.ZodNumber;
        skill: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    }, {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    }>;
    media: z.ZodObject<{
        videoTutorial: z.ZodUnion<[z.ZodString, z.ZodNull]>;
    }, "strict", z.ZodTypeAny, {
        videoTutorial: string | null;
    }, {
        videoTutorial: string | null;
    }>;
    engine: z.ZodType<IEngine, z.ZodTypeDef, IEngine>;
    synthesis: z.ZodType<ISynthesis, z.ZodTypeDef, ISynthesis>;
    prompts: z.ZodType<IPrompts, z.ZodTypeDef, IPrompts>;
    scoring: z.ZodType<IScoring, z.ZodTypeDef, IScoring>;
    alsoKnownAs: z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodNull]>;
    evidence: z.ZodType<IEvidence, z.ZodTypeDef, IEvidence>;
    extraction: z.ZodType<IExtraction, z.ZodTypeDef, IExtraction>;
    fieldStatus: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEnum<["known", "na", "unknown"]>>>;
}, "strict", z.ZodTypeAny, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>;
export declare const GameSchema: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodObject<{
    schemaVersion: z.ZodString;
    engineModelVersion: z.ZodString;
    filename: z.ZodString;
    name: z.ZodString;
    completeness: z.ZodObject<{
        overview: z.ZodBoolean;
        history: z.ZodBoolean;
        setup: z.ZodBoolean;
        rules: z.ZodBoolean;
        strategy: z.ZodBoolean;
        variations: z.ZodBoolean;
        ai: z.ZodBoolean;
        sources: z.ZodBoolean;
    }, "strict", z.ZodTypeAny, {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    }, {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    }>;
    quality: z.ZodEnum<["complete", "stub", "partial", "draft", "Unknown"]>;
    qualityReason: z.ZodOptional<z.ZodString>;
    overview: z.ZodType<IOverview, z.ZodTypeDef, IOverview>;
    history: z.ZodType<IHistory, z.ZodTypeDef, IHistory>;
    setup: z.ZodType<ISetup, z.ZodTypeDef, ISetup>;
    rules: z.ZodType<IRules, z.ZodTypeDef, IRules>;
    strategy: z.ZodType<IStrategy, z.ZodTypeDef, IStrategy>;
    variations: z.ZodType<IVariations, z.ZodTypeDef, IVariations>;
    ai: z.ZodType<IAi, z.ZodTypeDef, IAi>;
    sources: z.ZodType<ISources, z.ZodTypeDef, ISources>;
    tags: z.ZodArray<z.ZodEnum<["social", "fast-paced", "gambling", "traditional", "trick-taking", "melding", "shedding", "fishing", "banking", "solitaire", "climbing", "vying", "matching", "bluffing", "cooperative", "team", "draw-and-discard", "market-mechanics", "high-low", "trump", "no-trump", "bidding", "auction", "partnership", "domino", "tile", "rummy", "poker", "poker-variant", "war", "patience", "betting", "strategy", "stud"]>, "many">;
    legal: z.ZodObject<{
        status: z.ZodEnum<["Public Domain", "Proprietary", "Trademarked", "Patent-Expired", "Unknown", "NA"]>;
        reasonForNA: z.ZodOptional<z.ZodString>;
        isCommercial: z.ZodBoolean;
        trademarkNote: z.ZodUnion<[z.ZodString, z.ZodNull]>;
    }, "strict", z.ZodTypeAny, {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    }, {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    }>;
    statistics: z.ZodObject<{
        popularity: z.ZodNumber;
        complexity: z.ZodNumber;
        luck: z.ZodNumber;
        skill: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    }, {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    }>;
    media: z.ZodObject<{
        videoTutorial: z.ZodUnion<[z.ZodString, z.ZodNull]>;
    }, "strict", z.ZodTypeAny, {
        videoTutorial: string | null;
    }, {
        videoTutorial: string | null;
    }>;
    engine: z.ZodType<IEngine, z.ZodTypeDef, IEngine>;
    synthesis: z.ZodType<ISynthesis, z.ZodTypeDef, ISynthesis>;
    prompts: z.ZodType<IPrompts, z.ZodTypeDef, IPrompts>;
    scoring: z.ZodType<IScoring, z.ZodTypeDef, IScoring>;
    alsoKnownAs: z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodNull]>;
    evidence: z.ZodType<IEvidence, z.ZodTypeDef, IEvidence>;
    extraction: z.ZodType<IExtraction, z.ZodTypeDef, IExtraction>;
    fieldStatus: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEnum<["known", "na", "unknown"]>>>;
}, "strict", z.ZodTypeAny, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}, {
    overview: IOverview;
    history: IHistory;
    setup: ISetup;
    rules: IRules;
    strategy: IStrategy;
    variations: IVariations;
    ai: IAi;
    sources: ISources;
    name: string;
    quality: "Unknown" | "complete" | "partial" | "stub" | "draft";
    completeness: {
        overview: boolean;
        history: boolean;
        setup: boolean;
        rules: boolean;
        strategy: boolean;
        variations: boolean;
        ai: boolean;
        sources: boolean;
    };
    alsoKnownAs: string[] | null;
    schemaVersion: string;
    engineModelVersion: string;
    filename: string;
    tags: ("strategy" | "traditional" | "social" | "fast-paced" | "gambling" | "trick-taking" | "melding" | "shedding" | "fishing" | "banking" | "solitaire" | "climbing" | "vying" | "matching" | "bluffing" | "cooperative" | "team" | "draw-and-discard" | "market-mechanics" | "high-low" | "trump" | "no-trump" | "bidding" | "auction" | "partnership" | "domino" | "tile" | "rummy" | "poker" | "poker-variant" | "war" | "patience" | "betting" | "stud")[];
    legal: {
        status: "Unknown" | "NA" | "Public Domain" | "Proprietary" | "Trademarked" | "Patent-Expired";
        isCommercial: boolean;
        trademarkNote: string | null;
        reasonForNA?: string | undefined;
    };
    statistics: {
        popularity: number;
        complexity: number;
        luck: number;
        skill: number;
    };
    media: {
        videoTutorial: string | null;
    };
    engine: IEngine;
    synthesis: ISynthesis;
    prompts: IPrompts;
    scoring: IScoring;
    evidence: IEvidence;
    extraction: IExtraction;
    qualityReason?: string | undefined;
    fieldStatus?: Record<string, "unknown" | "known" | "na"> | undefined;
}>;
export type Game = z.output<typeof _GameSchemaInner>;
export {};
