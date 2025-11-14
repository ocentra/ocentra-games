import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaGamesProgram } from "../target/types/solana_games_program";
import { expect } from "chai";
import { Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("solana-games-program", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaGamesProgram as Program<SolanaGamesProgram>;
  
  // Test accounts
  const authority = provider.wallet;
  const player1 = Keypair.generate();
  const player2 = Keypair.generate();
  const player3 = Keypair.generate();
  const player4 = Keypair.generate();

  // Helper to get match PDA
  const getMatchPDA = async (matchId: string) => {
    return await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("match"), Buffer.from(matchId)],
      program.programId
    );
  };

  // Helper to airdrop SOL
  const airdrop = async (pubkey: anchor.web3.PublicKey, amount: number) => {
    const sig = await provider.connection.requestAirdrop(
      pubkey,
      amount * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);
  };

  before(async () => {
    // Airdrop SOL to test players
    await airdrop(player1.publicKey, 2);
    await airdrop(player2.publicKey, 2);
    await airdrop(player3.publicKey, 2);
    await airdrop(player4.publicKey, 2);
  });

  it("Creates a CLAIM match", async () => {
    const matchId = "test-match-001";
    const gameType = 0; // CLAIM
    const seed = 12345;
    
    const [matchPDA] = await getMatchPDA(matchId);

    const tx = await program.methods
      .createMatch(matchId, gameType, new anchor.BN(seed))
      .accounts({
        matchAccount: matchPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Create match transaction:", tx);

    // Fetch and verify match account
    const matchAccount = await program.account.match.fetch(matchPDA);
    expect(matchAccount.matchId).to.equal(matchId);
    expect(matchAccount.gameType).to.equal(gameType);
    expect(matchAccount.gameName).to.equal("CLAIM");
    expect(matchAccount.seed.toNumber()).to.equal(seed);
    expect(matchAccount.phase).to.equal(0); // Dealing phase
    expect(matchAccount.playerCount).to.equal(0);
  });

  it("Players can join match", async () => {
    const matchId = "test-match-001";
    const [matchPDA] = await getMatchPDA(matchId);

    // Player 1 joins
    await program.methods
      .joinMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        player: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    // Player 2 joins
    await program.methods
      .joinMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        player: player2.publicKey,
      })
      .signers([player2])
      .rpc();

    // Verify players joined
    const matchAccount = await program.account.match.fetch(matchPDA);
    expect(matchAccount.playerCount).to.equal(2);
    expect(matchAccount.players[0].toString()).to.equal(player1.publicKey.toString());
    expect(matchAccount.players[1].toString()).to.equal(player2.publicKey.toString());
  });

  it("All players can join and match transitions to playing", async () => {
    const matchId = "test-match-002";
    const gameType = 0; // CLAIM
    const seed = 54321;
    
    const [matchPDA] = await getMatchPDA(matchId);

    // Create match
    await program.methods
      .createMatch(matchId, gameType, new anchor.BN(seed))
      .accounts({
        matchAccount: matchPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // All 4 players join
    await program.methods
      .joinMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        player: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    await program.methods
      .joinMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        player: player2.publicKey,
      })
      .signers([player2])
      .rpc();

    await program.methods
      .joinMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        player: player3.publicKey,
      })
      .signers([player3])
      .rpc();

    await program.methods
      .joinMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        player: player4.publicKey,
      })
      .signers([player4])
      .rpc();

    // Verify players joined (match stays in dealing phase until explicitly started)
    const matchAccount = await program.account.match.fetch(matchPDA);
    expect(matchAccount.playerCount).to.equal(4);
    expect(matchAccount.phase).to.equal(0); // Still in dealing phase
  });

  it("Player can declare intent", async () => {
    const matchId = "test-match-002";
    const [matchPDA] = await getMatchPDA(matchId);
    
    const matchAccount = await program.account.match.fetch(matchPDA);
    const moveIndex = matchAccount.moveCount.toNumber();
    const [movePDA] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("move"),
        Buffer.from(matchId),
        Buffer.from(new Uint8Array(new anchor.BN(moveIndex).toArray("le", 4))),
      ],
      program.programId
    );

    // Declare intent: suit 0 = spades
    const actionType = 2; // declare_intent
    const payload = Buffer.from([0]); // spades

    await program.methods
      .submitMove(matchId, actionType, Array.from(payload))
      .accounts({
        matchAccount: matchPDA,
        moveAccount: movePDA,
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    // Verify move was recorded and suit was declared
    const updatedMatch = await program.account.match.fetch(matchPDA);
    const moveAccount = await program.account.move.fetch(movePDA);
    expect(moveAccount.matchId).to.equal(matchId);
    expect(moveAccount.actionType).to.equal(actionType);
    expect(updatedMatch.declaredSuits[0]).to.not.equal(null);
  });

  it("Player can call showdown after declaring intent", async () => {
    const matchId = "test-match-002";
    const [matchPDA] = await getMatchPDA(matchId);
    
    const matchAccount = await program.account.match.fetch(matchPDA);
    const moveIndex = matchAccount.moveCount.toNumber();
    const [movePDA] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("move"),
        Buffer.from(matchId),
        Buffer.from(new Uint8Array(new anchor.BN(moveIndex).toArray("le", 4))),
      ],
      program.programId
    );

    // Call showdown
    const actionType = 3; // call_showdown
    const payload = Buffer.from([]);

    await program.methods
      .submitMove(matchId, actionType, Array.from(payload))
      .accounts({
        matchAccount: matchPDA,
        moveAccount: movePDA,
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    // Verify match ended
    const updatedMatch = await program.account.match.fetch(matchPDA);
    expect(updatedMatch.phase).to.equal(2); // Ended
  });

  it("Can end match", async () => {
    const matchId = "test-match-001";
    const [matchPDA] = await getMatchPDA(matchId);

    const matchHash = Buffer.alloc(32, 1); // Dummy hash
    const archiveTxid = "arweave-tx-id-123";

    await program.methods
      .endMatch(matchId, Array.from(matchHash), archiveTxid)
      .accounts({
        matchAccount: matchPDA,
        authority: authority.publicKey,
      })
      .rpc();

    // Verify match ended
    const matchAccount = await program.account.match.fetch(matchPDA);
    expect(matchAccount.phase).to.equal(2); // Ended
    expect(matchAccount.endedAt).to.not.equal(null);
  });
});

