/**
 * mkid - Generate match ID (UUID v4)
 * Per spec Section 12, line 583: "Create match id: cargo run --bin mkid"
 */

use uuid::Uuid;

fn main() {
    let match_id = Uuid::new_v4();
    println!("{}", match_id);
}

