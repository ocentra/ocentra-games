use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum GameType {
    Claim = 0,
    ThreeCardBrag = 1,
    Poker = 2,
    Bridge = 3,
    Rummy = 4,
    Scrabble = 5,
    WordSearch = 6,
    Crosswords = 7,
    // Add more games as needed
}

pub struct GameConfig {
    pub min_players: u8,
    pub max_players: u8,
}

impl GameType {
    pub fn get_config(&self) -> GameConfig {
        match self {
            GameType::Claim => GameConfig {
                min_players: 2,
                max_players: 4,
            },
            GameType::ThreeCardBrag => GameConfig {
                min_players: 2,
                max_players: 6,
            },
            GameType::Poker => GameConfig {
                min_players: 2,
                max_players: 10,
            },
            GameType::Bridge => GameConfig {
                min_players: 4,
                max_players: 4,
            },
            GameType::Rummy => GameConfig {
                min_players: 2,
                max_players: 6,
            },
            GameType::Scrabble => GameConfig {
                min_players: 2,
                max_players: 4,
            },
            GameType::WordSearch => GameConfig {
                min_players: 1,
                max_players: 10,
            },
            GameType::Crosswords => GameConfig {
                min_players: 1,
                max_players: 10,
            },
        }
    }

    pub fn get_name(&self) -> &'static str {
        match self {
            GameType::Claim => "CLAIM",
            GameType::ThreeCardBrag => "THREECARDBRAG",
            GameType::Poker => "POKER",
            GameType::Bridge => "BRIDGE",
            GameType::Rummy => "RUMMY",
            GameType::Scrabble => "SCRABBLE",
            GameType::WordSearch => "WORDSEARCH",
            GameType::Crosswords => "CROSSWORDS",
        }
    }
}

