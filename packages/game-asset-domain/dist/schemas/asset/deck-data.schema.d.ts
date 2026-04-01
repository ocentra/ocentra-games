import { z } from 'zod';
export declare const DeckDataSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
    supportedTriples: z.ZodEffects<z.ZodArray<z.ZodObject<{
        deckType: z.ZodEnum<["Standard 52", "Standard 52 + Joker(s)", "Standard 48", "Standard 40", "Standard 36", "Standard 32", "Standard 32 + Joker(s)", "Standard 44", "Standard 24", "Double 52", "Double 52 + 4 Jokers", "Double 32", "Double 24", "Quad 36", "Quad 40", "Oct 40", "Quad 52 + 8 Jokers", "Triple 52 + 6 Jokers", "Gnav 42", "Goita 32", "Rook 56", "Xiangqi 32", "Four Color 112", "Tarot 78", "Tarot 62", "Minchiate 97", "Tarot 54", "Tarot 40", "Tarot 66", "Tarot 42", "Cego 38", "Tarocco Bolognese 62", "Tarocco Siciliano 64", "500 deck 63", "Double-6 Dominoes", "Double-6 Dominoes x2", "Double-6 Dominoes x4", "Double-8 Dominoes", "Double-9 Dominoes", "Double-12 Dominoes", "Double-15 Dominoes", "Double-6 + Double-12 Dominoes", "Double-9 + Double-12 Dominoes", "Chinese domino 32", "Chinese domino 84", "Hanafuda 48", "Hanafuda 52", "Kabufuda 40", "Mahjong 136", "Mahjong 144", "Mahjong 148", "Mahjong 152", "Mahjong 160", "Khorol 60", "Daaluu 64", "Money-suited 39", "Money-suited 38", "Ganjifa", "Whot 54", "Okey 106", "Unsun Karuta 75", "Komatsufuda 48", "Uta-garuta 200", "Iroha Karuta 96", "Ceki 60", "To_tom 120", "Bai_choi 33", "Madiao 40", "Khanhoo 30", "Tehonbiki 48", "Stripped 35", "Standard 30", "Standard 28", "Standard 26", "Standard 16", "Treikort 27", "Tiddlywink", "Hols der Geier 75", "Numbered 104"]>;
        suitSet: z.ZodEnum<["French", "Italian", "Spanish", "Portuguese", "German", "Tarot_minor", "French_tarock", "Tarot_de_Marseille", "Swiss_1JJ", "Industrie_und_Glueck", "Tarocco_Piemontese", "Minchiate", "Dominoes", "Khorol", "E_awase", "Chinese_domino", "Hanafuda", "Hanafuda_snow", "Kabufuda", "Mahjong", "Daaluu", "Money-suited", "Ganjifa", "Whot", "Okey", "Bai_choi", "Iroha_karuta", "Ceki", "Komatsufuda", "Madiao", "Khanhoo", "Tehonbiki", "To_tom", "Unsun_karuta", "Cego", "Xiangqi_red_black", "Four_color", "Rook_colors", "Uta_garuta", "Tiddlywink_colors", "Gnav", "Goita", "Hols_der_Geier_colors", "Numbered_104"]>;
        rankSet: z.ZodEnum<["Standard_52", "Pinochle_48", "Stripped_48", "Stripped_40", "Stripped_36", "Stripped_32", "Stripped_44", "Stripped_24", "Tarot_78", "Tarot_62", "Minchiate_97", "Tarot_54", "Tarot_40", "Tarot_66", "Tarot_42", "Tarocco_Bolognese_62", "Tarocco_Sicilian_64", "FiveHundred_63", "Cego_38", "Domino_double6", "Domino_double8", "Domino_double9", "Domino_double12", "Domino_double15", "Chinese_domino", "Hanafuda", "Kabufuda", "Mahjong_136", "Mahjong", "Mahjong_148", "Mahjong_152", "Mahjong_160", "Khorol", "Daaluu", "Money-suited", "Ganjifa", "Whot", "Okey", "Bai_choi", "Iroha_karuta", "Ceki", "Komatsufuda", "Madiao", "Khanhoo", "Tehonbiki", "To_tom", "Unsun_karuta", "E_awase", "Domino_double6_plus_double12", "Domino_double9_plus_double12", "Stripped_35", "Stripped_30", "Stripped_28", "Stripped_26", "Stripped_16", "Xiangqi_pieces", "Four_color_pieces", "Gnav_ranks", "Goita_pieces", "Rook_1_14", "Treikort_27", "Uta_garuta", "Tiddlywink_pieces", "Hols_der_Geier_1_15", "Numbered_1_104"]>;
    }, "strip", z.ZodTypeAny, {
        deckType: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104";
        suitSet: "Ganjifa" | "French" | "Italian" | "Spanish" | "Portuguese" | "German" | "Tarot_minor" | "French_tarock" | "Tarot_de_Marseille" | "Swiss_1JJ" | "Industrie_und_Glueck" | "Tarocco_Piemontese" | "Minchiate" | "Dominoes" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Hanafuda_snow" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Cego" | "Xiangqi_red_black" | "Four_color" | "Rook_colors" | "Uta_garuta" | "Tiddlywink_colors" | "Gnav" | "Goita" | "Hols_der_Geier_colors" | "Numbered_104";
        rankSet: "Ganjifa" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Uta_garuta" | "Standard_52" | "Pinochle_48" | "Stripped_48" | "Stripped_40" | "Stripped_36" | "Stripped_32" | "Stripped_44" | "Stripped_24" | "Tarot_78" | "Tarot_62" | "Minchiate_97" | "Tarot_54" | "Tarot_40" | "Tarot_66" | "Tarot_42" | "Tarocco_Bolognese_62" | "Tarocco_Sicilian_64" | "FiveHundred_63" | "Cego_38" | "Domino_double6" | "Domino_double8" | "Domino_double9" | "Domino_double12" | "Domino_double15" | "Mahjong_136" | "Mahjong_148" | "Mahjong_152" | "Mahjong_160" | "Domino_double6_plus_double12" | "Domino_double9_plus_double12" | "Stripped_35" | "Stripped_30" | "Stripped_28" | "Stripped_26" | "Stripped_16" | "Xiangqi_pieces" | "Four_color_pieces" | "Gnav_ranks" | "Goita_pieces" | "Rook_1_14" | "Treikort_27" | "Tiddlywink_pieces" | "Hols_der_Geier_1_15" | "Numbered_1_104";
    }, {
        deckType: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104";
        suitSet: "Ganjifa" | "French" | "Italian" | "Spanish" | "Portuguese" | "German" | "Tarot_minor" | "French_tarock" | "Tarot_de_Marseille" | "Swiss_1JJ" | "Industrie_und_Glueck" | "Tarocco_Piemontese" | "Minchiate" | "Dominoes" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Hanafuda_snow" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Cego" | "Xiangqi_red_black" | "Four_color" | "Rook_colors" | "Uta_garuta" | "Tiddlywink_colors" | "Gnav" | "Goita" | "Hols_der_Geier_colors" | "Numbered_104";
        rankSet: "Ganjifa" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Uta_garuta" | "Standard_52" | "Pinochle_48" | "Stripped_48" | "Stripped_40" | "Stripped_36" | "Stripped_32" | "Stripped_44" | "Stripped_24" | "Tarot_78" | "Tarot_62" | "Minchiate_97" | "Tarot_54" | "Tarot_40" | "Tarot_66" | "Tarot_42" | "Tarocco_Bolognese_62" | "Tarocco_Sicilian_64" | "FiveHundred_63" | "Cego_38" | "Domino_double6" | "Domino_double8" | "Domino_double9" | "Domino_double12" | "Domino_double15" | "Mahjong_136" | "Mahjong_148" | "Mahjong_152" | "Mahjong_160" | "Domino_double6_plus_double12" | "Domino_double9_plus_double12" | "Stripped_35" | "Stripped_30" | "Stripped_28" | "Stripped_26" | "Stripped_16" | "Xiangqi_pieces" | "Four_color_pieces" | "Gnav_ranks" | "Goita_pieces" | "Rook_1_14" | "Treikort_27" | "Tiddlywink_pieces" | "Hols_der_Geier_1_15" | "Numbered_1_104";
    }>, "many">, {
        deckType: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104";
        suitSet: "Ganjifa" | "French" | "Italian" | "Spanish" | "Portuguese" | "German" | "Tarot_minor" | "French_tarock" | "Tarot_de_Marseille" | "Swiss_1JJ" | "Industrie_und_Glueck" | "Tarocco_Piemontese" | "Minchiate" | "Dominoes" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Hanafuda_snow" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Cego" | "Xiangqi_red_black" | "Four_color" | "Rook_colors" | "Uta_garuta" | "Tiddlywink_colors" | "Gnav" | "Goita" | "Hols_der_Geier_colors" | "Numbered_104";
        rankSet: "Ganjifa" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Uta_garuta" | "Standard_52" | "Pinochle_48" | "Stripped_48" | "Stripped_40" | "Stripped_36" | "Stripped_32" | "Stripped_44" | "Stripped_24" | "Tarot_78" | "Tarot_62" | "Minchiate_97" | "Tarot_54" | "Tarot_40" | "Tarot_66" | "Tarot_42" | "Tarocco_Bolognese_62" | "Tarocco_Sicilian_64" | "FiveHundred_63" | "Cego_38" | "Domino_double6" | "Domino_double8" | "Domino_double9" | "Domino_double12" | "Domino_double15" | "Mahjong_136" | "Mahjong_148" | "Mahjong_152" | "Mahjong_160" | "Domino_double6_plus_double12" | "Domino_double9_plus_double12" | "Stripped_35" | "Stripped_30" | "Stripped_28" | "Stripped_26" | "Stripped_16" | "Xiangqi_pieces" | "Four_color_pieces" | "Gnav_ranks" | "Goita_pieces" | "Rook_1_14" | "Treikort_27" | "Tiddlywink_pieces" | "Hols_der_Geier_1_15" | "Numbered_1_104";
    }[], {
        deckType: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104";
        suitSet: "Ganjifa" | "French" | "Italian" | "Spanish" | "Portuguese" | "German" | "Tarot_minor" | "French_tarock" | "Tarot_de_Marseille" | "Swiss_1JJ" | "Industrie_und_Glueck" | "Tarocco_Piemontese" | "Minchiate" | "Dominoes" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Hanafuda_snow" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Cego" | "Xiangqi_red_black" | "Four_color" | "Rook_colors" | "Uta_garuta" | "Tiddlywink_colors" | "Gnav" | "Goita" | "Hols_der_Geier_colors" | "Numbered_104";
        rankSet: "Ganjifa" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Uta_garuta" | "Standard_52" | "Pinochle_48" | "Stripped_48" | "Stripped_40" | "Stripped_36" | "Stripped_32" | "Stripped_44" | "Stripped_24" | "Tarot_78" | "Tarot_62" | "Minchiate_97" | "Tarot_54" | "Tarot_40" | "Tarot_66" | "Tarot_42" | "Tarocco_Bolognese_62" | "Tarocco_Sicilian_64" | "FiveHundred_63" | "Cego_38" | "Domino_double6" | "Domino_double8" | "Domino_double9" | "Domino_double12" | "Domino_double15" | "Mahjong_136" | "Mahjong_148" | "Mahjong_152" | "Mahjong_160" | "Domino_double6_plus_double12" | "Domino_double9_plus_double12" | "Stripped_35" | "Stripped_30" | "Stripped_28" | "Stripped_26" | "Stripped_16" | "Xiangqi_pieces" | "Four_color_pieces" | "Gnav_ranks" | "Goita_pieces" | "Rook_1_14" | "Treikort_27" | "Tiddlywink_pieces" | "Hols_der_Geier_1_15" | "Numbered_1_104";
    }[]>;
    cardTemplates: z.ZodDefault<z.ZodArray<z.ZodObject<{
        resourceEntryType: z.ZodOptional<z.ZodString>;
        guid: z.ZodOptional<z.ZodString>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    } & {
        path: z.ZodEffects<z.ZodString, string, string>;
        assetType: z.ZodLiteral<"Card">;
        displayName: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        resourceEntryType: z.ZodOptional<z.ZodString>;
        guid: z.ZodOptional<z.ZodString>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    } & {
        path: z.ZodEffects<z.ZodString, string, string>;
        assetType: z.ZodLiteral<"Card">;
        displayName: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        resourceEntryType: z.ZodOptional<z.ZodString>;
        guid: z.ZodOptional<z.ZodString>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    } & {
        path: z.ZodEffects<z.ZodString, string, string>;
        assetType: z.ZodLiteral<"Card">;
        displayName: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    cardComposition: z.ZodDefault<z.ZodArray<z.ZodObject<{
        cardTemplate: z.ZodObject<{
            resourceEntryType: z.ZodOptional<z.ZodString>;
            guid: z.ZodOptional<z.ZodString>;
            variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        } & {
            path: z.ZodEffects<z.ZodString, string, string>;
            assetType: z.ZodLiteral<"Card">;
            displayName: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            resourceEntryType: z.ZodOptional<z.ZodString>;
            guid: z.ZodOptional<z.ZodString>;
            variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        } & {
            path: z.ZodEffects<z.ZodString, string, string>;
            assetType: z.ZodLiteral<"Card">;
            displayName: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            resourceEntryType: z.ZodOptional<z.ZodString>;
            guid: z.ZodOptional<z.ZodString>;
            variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        } & {
            path: z.ZodEffects<z.ZodString, string, string>;
            assetType: z.ZodLiteral<"Card">;
            displayName: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
        }, z.ZodTypeAny, "passthrough">>;
        copies: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        cardTemplate: {
            assetType: "Card";
            displayName: string;
            path: string;
            guid?: string | undefined;
            resourceEntryType?: string | undefined;
            variant?: string | null | undefined;
        } & {
            [k: string]: unknown;
        };
        copies: number;
    }, {
        cardTemplate: {
            assetType: "Card";
            displayName: string;
            path: string;
            guid?: string | undefined;
            resourceEntryType?: string | undefined;
            variant?: string | null | undefined;
        } & {
            [k: string]: unknown;
        };
        copies: number;
    }>, "many">>;
    cardRankingAsset: z.ZodObject<{
        resourceEntryType: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        displayName: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    } & {
        assetType: z.ZodLiteral<"CardRanking">;
        guid: z.ZodString;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        resourceEntryType: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        displayName: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    } & {
        assetType: z.ZodLiteral<"CardRanking">;
        guid: z.ZodString;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        resourceEntryType: z.ZodOptional<z.ZodString>;
        path: z.ZodString;
        displayName: z.ZodOptional<z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    } & {
        assetType: z.ZodLiteral<"CardRanking">;
        guid: z.ZodString;
    }, z.ZodTypeAny, "passthrough">>;
    imageSourceFolderPath: z.ZodString;
    cardOutputPath: z.ZodString;
    backCardSourceFolderPath: z.ZodString;
    backCardHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    cardRankingAsset: {
        assetType: "CardRanking";
        guid: string;
        path: string;
        displayName?: string | undefined;
        resourceEntryType?: string | undefined;
        variant?: string | null | undefined;
    } & {
        [k: string]: unknown;
    };
    name: string;
    supportedTriples: {
        deckType: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104";
        suitSet: "Ganjifa" | "French" | "Italian" | "Spanish" | "Portuguese" | "German" | "Tarot_minor" | "French_tarock" | "Tarot_de_Marseille" | "Swiss_1JJ" | "Industrie_und_Glueck" | "Tarocco_Piemontese" | "Minchiate" | "Dominoes" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Hanafuda_snow" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Cego" | "Xiangqi_red_black" | "Four_color" | "Rook_colors" | "Uta_garuta" | "Tiddlywink_colors" | "Gnav" | "Goita" | "Hols_der_Geier_colors" | "Numbered_104";
        rankSet: "Ganjifa" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Uta_garuta" | "Standard_52" | "Pinochle_48" | "Stripped_48" | "Stripped_40" | "Stripped_36" | "Stripped_32" | "Stripped_44" | "Stripped_24" | "Tarot_78" | "Tarot_62" | "Minchiate_97" | "Tarot_54" | "Tarot_40" | "Tarot_66" | "Tarot_42" | "Tarocco_Bolognese_62" | "Tarocco_Sicilian_64" | "FiveHundred_63" | "Cego_38" | "Domino_double6" | "Domino_double8" | "Domino_double9" | "Domino_double12" | "Domino_double15" | "Mahjong_136" | "Mahjong_148" | "Mahjong_152" | "Mahjong_160" | "Domino_double6_plus_double12" | "Domino_double9_plus_double12" | "Stripped_35" | "Stripped_30" | "Stripped_28" | "Stripped_26" | "Stripped_16" | "Xiangqi_pieces" | "Four_color_pieces" | "Gnav_ranks" | "Goita_pieces" | "Rook_1_14" | "Treikort_27" | "Tiddlywink_pieces" | "Hols_der_Geier_1_15" | "Numbered_1_104";
    }[];
    cardTemplates: z.objectOutputType<{
        resourceEntryType: z.ZodOptional<z.ZodString>;
        guid: z.ZodOptional<z.ZodString>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    } & {
        path: z.ZodEffects<z.ZodString, string, string>;
        assetType: z.ZodLiteral<"Card">;
        displayName: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
    }, z.ZodTypeAny, "passthrough">[];
    cardComposition: {
        cardTemplate: {
            assetType: "Card";
            displayName: string;
            path: string;
            guid?: string | undefined;
            resourceEntryType?: string | undefined;
            variant?: string | null | undefined;
        } & {
            [k: string]: unknown;
        };
        copies: number;
    }[];
    imageSourceFolderPath: string;
    cardOutputPath: string;
    backCardSourceFolderPath: string;
    backCardHash: string;
}, {
    cardRankingAsset: {
        assetType: "CardRanking";
        guid: string;
        path: string;
        displayName?: string | undefined;
        resourceEntryType?: string | undefined;
        variant?: string | null | undefined;
    } & {
        [k: string]: unknown;
    };
    name: string;
    supportedTriples: {
        deckType: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104";
        suitSet: "Ganjifa" | "French" | "Italian" | "Spanish" | "Portuguese" | "German" | "Tarot_minor" | "French_tarock" | "Tarot_de_Marseille" | "Swiss_1JJ" | "Industrie_und_Glueck" | "Tarocco_Piemontese" | "Minchiate" | "Dominoes" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Hanafuda_snow" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Cego" | "Xiangqi_red_black" | "Four_color" | "Rook_colors" | "Uta_garuta" | "Tiddlywink_colors" | "Gnav" | "Goita" | "Hols_der_Geier_colors" | "Numbered_104";
        rankSet: "Ganjifa" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Uta_garuta" | "Standard_52" | "Pinochle_48" | "Stripped_48" | "Stripped_40" | "Stripped_36" | "Stripped_32" | "Stripped_44" | "Stripped_24" | "Tarot_78" | "Tarot_62" | "Minchiate_97" | "Tarot_54" | "Tarot_40" | "Tarot_66" | "Tarot_42" | "Tarocco_Bolognese_62" | "Tarocco_Sicilian_64" | "FiveHundred_63" | "Cego_38" | "Domino_double6" | "Domino_double8" | "Domino_double9" | "Domino_double12" | "Domino_double15" | "Mahjong_136" | "Mahjong_148" | "Mahjong_152" | "Mahjong_160" | "Domino_double6_plus_double12" | "Domino_double9_plus_double12" | "Stripped_35" | "Stripped_30" | "Stripped_28" | "Stripped_26" | "Stripped_16" | "Xiangqi_pieces" | "Four_color_pieces" | "Gnav_ranks" | "Goita_pieces" | "Rook_1_14" | "Treikort_27" | "Tiddlywink_pieces" | "Hols_der_Geier_1_15" | "Numbered_1_104";
    }[];
    imageSourceFolderPath: string;
    cardOutputPath: string;
    backCardSourceFolderPath: string;
    backCardHash: string;
    cardTemplates?: z.objectInputType<{
        resourceEntryType: z.ZodOptional<z.ZodString>;
        guid: z.ZodOptional<z.ZodString>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    } & {
        path: z.ZodEffects<z.ZodString, string, string>;
        assetType: z.ZodLiteral<"Card">;
        displayName: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
    }, z.ZodTypeAny, "passthrough">[] | undefined;
    cardComposition?: {
        cardTemplate: {
            assetType: "Card";
            displayName: string;
            path: string;
            guid?: string | undefined;
            resourceEntryType?: string | undefined;
            variant?: string | null | undefined;
        } & {
            [k: string]: unknown;
        };
        copies: number;
    }[] | undefined;
}>, {
    cardRankingAsset: {
        assetType: "CardRanking";
        guid: string;
        path: string;
        displayName?: string | undefined;
        resourceEntryType?: string | undefined;
        variant?: string | null | undefined;
    } & {
        [k: string]: unknown;
    };
    name: string;
    supportedTriples: {
        deckType: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104";
        suitSet: "Ganjifa" | "French" | "Italian" | "Spanish" | "Portuguese" | "German" | "Tarot_minor" | "French_tarock" | "Tarot_de_Marseille" | "Swiss_1JJ" | "Industrie_und_Glueck" | "Tarocco_Piemontese" | "Minchiate" | "Dominoes" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Hanafuda_snow" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Cego" | "Xiangqi_red_black" | "Four_color" | "Rook_colors" | "Uta_garuta" | "Tiddlywink_colors" | "Gnav" | "Goita" | "Hols_der_Geier_colors" | "Numbered_104";
        rankSet: "Ganjifa" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Uta_garuta" | "Standard_52" | "Pinochle_48" | "Stripped_48" | "Stripped_40" | "Stripped_36" | "Stripped_32" | "Stripped_44" | "Stripped_24" | "Tarot_78" | "Tarot_62" | "Minchiate_97" | "Tarot_54" | "Tarot_40" | "Tarot_66" | "Tarot_42" | "Tarocco_Bolognese_62" | "Tarocco_Sicilian_64" | "FiveHundred_63" | "Cego_38" | "Domino_double6" | "Domino_double8" | "Domino_double9" | "Domino_double12" | "Domino_double15" | "Mahjong_136" | "Mahjong_148" | "Mahjong_152" | "Mahjong_160" | "Domino_double6_plus_double12" | "Domino_double9_plus_double12" | "Stripped_35" | "Stripped_30" | "Stripped_28" | "Stripped_26" | "Stripped_16" | "Xiangqi_pieces" | "Four_color_pieces" | "Gnav_ranks" | "Goita_pieces" | "Rook_1_14" | "Treikort_27" | "Tiddlywink_pieces" | "Hols_der_Geier_1_15" | "Numbered_1_104";
    }[];
    cardTemplates: z.objectOutputType<{
        resourceEntryType: z.ZodOptional<z.ZodString>;
        guid: z.ZodOptional<z.ZodString>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    } & {
        path: z.ZodEffects<z.ZodString, string, string>;
        assetType: z.ZodLiteral<"Card">;
        displayName: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
    }, z.ZodTypeAny, "passthrough">[];
    cardComposition: {
        cardTemplate: {
            assetType: "Card";
            displayName: string;
            path: string;
            guid?: string | undefined;
            resourceEntryType?: string | undefined;
            variant?: string | null | undefined;
        } & {
            [k: string]: unknown;
        };
        copies: number;
    }[];
    imageSourceFolderPath: string;
    cardOutputPath: string;
    backCardSourceFolderPath: string;
    backCardHash: string;
}, {
    cardRankingAsset: {
        assetType: "CardRanking";
        guid: string;
        path: string;
        displayName?: string | undefined;
        resourceEntryType?: string | undefined;
        variant?: string | null | undefined;
    } & {
        [k: string]: unknown;
    };
    name: string;
    supportedTriples: {
        deckType: "Standard 52" | "Standard 52 + Joker(s)" | "Standard 48" | "Standard 40" | "Standard 36" | "Standard 32" | "Standard 32 + Joker(s)" | "Standard 44" | "Standard 24" | "Double 52" | "Double 52 + 4 Jokers" | "Double 32" | "Double 24" | "Quad 36" | "Quad 40" | "Oct 40" | "Quad 52 + 8 Jokers" | "Triple 52 + 6 Jokers" | "Gnav 42" | "Goita 32" | "Rook 56" | "Xiangqi 32" | "Four Color 112" | "Tarot 78" | "Tarot 62" | "Minchiate 97" | "Tarot 54" | "Tarot 40" | "Tarot 66" | "Tarot 42" | "Cego 38" | "Tarocco Bolognese 62" | "Tarocco Siciliano 64" | "500 deck 63" | "Double-6 Dominoes" | "Double-6 Dominoes x2" | "Double-6 Dominoes x4" | "Double-8 Dominoes" | "Double-9 Dominoes" | "Double-12 Dominoes" | "Double-15 Dominoes" | "Double-6 + Double-12 Dominoes" | "Double-9 + Double-12 Dominoes" | "Chinese domino 32" | "Chinese domino 84" | "Hanafuda 48" | "Hanafuda 52" | "Kabufuda 40" | "Mahjong 136" | "Mahjong 144" | "Mahjong 148" | "Mahjong 152" | "Mahjong 160" | "Khorol 60" | "Daaluu 64" | "Money-suited 39" | "Money-suited 38" | "Ganjifa" | "Whot 54" | "Okey 106" | "Unsun Karuta 75" | "Komatsufuda 48" | "Uta-garuta 200" | "Iroha Karuta 96" | "Ceki 60" | "To_tom 120" | "Bai_choi 33" | "Madiao 40" | "Khanhoo 30" | "Tehonbiki 48" | "Stripped 35" | "Standard 30" | "Standard 28" | "Standard 26" | "Standard 16" | "Treikort 27" | "Tiddlywink" | "Hols der Geier 75" | "Numbered 104";
        suitSet: "Ganjifa" | "French" | "Italian" | "Spanish" | "Portuguese" | "German" | "Tarot_minor" | "French_tarock" | "Tarot_de_Marseille" | "Swiss_1JJ" | "Industrie_und_Glueck" | "Tarocco_Piemontese" | "Minchiate" | "Dominoes" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Hanafuda_snow" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Cego" | "Xiangqi_red_black" | "Four_color" | "Rook_colors" | "Uta_garuta" | "Tiddlywink_colors" | "Gnav" | "Goita" | "Hols_der_Geier_colors" | "Numbered_104";
        rankSet: "Ganjifa" | "Khorol" | "E_awase" | "Chinese_domino" | "Hanafuda" | "Kabufuda" | "Mahjong" | "Daaluu" | "Money-suited" | "Whot" | "Okey" | "Bai_choi" | "Iroha_karuta" | "Ceki" | "Komatsufuda" | "Madiao" | "Khanhoo" | "Tehonbiki" | "To_tom" | "Unsun_karuta" | "Uta_garuta" | "Standard_52" | "Pinochle_48" | "Stripped_48" | "Stripped_40" | "Stripped_36" | "Stripped_32" | "Stripped_44" | "Stripped_24" | "Tarot_78" | "Tarot_62" | "Minchiate_97" | "Tarot_54" | "Tarot_40" | "Tarot_66" | "Tarot_42" | "Tarocco_Bolognese_62" | "Tarocco_Sicilian_64" | "FiveHundred_63" | "Cego_38" | "Domino_double6" | "Domino_double8" | "Domino_double9" | "Domino_double12" | "Domino_double15" | "Mahjong_136" | "Mahjong_148" | "Mahjong_152" | "Mahjong_160" | "Domino_double6_plus_double12" | "Domino_double9_plus_double12" | "Stripped_35" | "Stripped_30" | "Stripped_28" | "Stripped_26" | "Stripped_16" | "Xiangqi_pieces" | "Four_color_pieces" | "Gnav_ranks" | "Goita_pieces" | "Rook_1_14" | "Treikort_27" | "Tiddlywink_pieces" | "Hols_der_Geier_1_15" | "Numbered_1_104";
    }[];
    imageSourceFolderPath: string;
    cardOutputPath: string;
    backCardSourceFolderPath: string;
    backCardHash: string;
    cardTemplates?: z.objectInputType<{
        resourceEntryType: z.ZodOptional<z.ZodString>;
        guid: z.ZodOptional<z.ZodString>;
        variant: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    } & {
        path: z.ZodEffects<z.ZodString, string, string>;
        assetType: z.ZodLiteral<"Card">;
        displayName: z.ZodIntersection<z.ZodString, z.ZodEffects<z.ZodString, string, string>>;
    }, z.ZodTypeAny, "passthrough">[] | undefined;
    cardComposition?: {
        cardTemplate: {
            assetType: "Card";
            displayName: string;
            path: string;
            guid?: string | undefined;
            resourceEntryType?: string | undefined;
            variant?: string | null | undefined;
        } & {
            [k: string]: unknown;
        };
        copies: number;
    }[] | undefined;
}>;
