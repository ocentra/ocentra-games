import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { OcentraGames } from '../target/types/ocentra_games'
import { expect } from 'chai'

describe('ocentra-games', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.OcentraGames as Program<OcentraGames>

  it('Program is loaded', async () => {
    // Verify program is loaded correctly
    expect(program.programId.toString()).to.equal(
      '7eWx3H8bXMif7SDyPS1j5LZw1yUGDNZY592WzEKNf696'
    )
    console.log('Program ID:', program.programId.toString())
  })
})
