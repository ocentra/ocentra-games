# Solana Wallet Setup Guide (First Time)

## Step 1: Install Phantom Wallet (Recommended)

**Option A: Browser Extension (Easiest)**
1. Go to: https://phantom.app/
2. Click "Download" → Choose your browser (Chrome, Firefox, Edge, Brave)
3. Install the extension
4. Click the extension icon in your browser
5. Click "Create New Wallet"
6. **Write down your seed phrase** (12 words) - KEEP THIS SECRET!
7. Set a password
8. Done! Your wallet is created

**Option B: Mobile App**
1. Download Phantom from App Store (iOS) or Google Play (Android)
2. Open app → "Create New Wallet"
3. Save seed phrase securely
4. Set password

---

## Step 2: Get SOL for Devnet (Free Test Tokens)

**For Development/Testing:**

**IMPORTANT:** On devnet, everything is 100% FREE. Transaction fees are paid with free devnet SOL (worthless test tokens).

1. **Switch to Devnet:**
   - Open Phantom wallet
   - Click settings (gear icon)
   - Go to "Developer Settings"
   - Enable "Testnet Mode" or switch network to "Devnet"

2. **Get Free Devnet SOL:**
   - Copy your wallet address (click on your address, it copies)
   - Go to: https://faucet.solana.com/
   - Paste your address
   - Click "Airdrop 2 SOL"
   - Wait ~30 seconds
   - Check your wallet - you should see 2 SOL
   - **This is FREE test money - not real SOL**

**How Transaction Fees Work:**

- **Devnet:** 
  - Transaction fee: ~0.000005 SOL per transaction
  - You get FREE devnet SOL from faucet
  - **Result: Transactions are FREE** (you pay with free test tokens)
  
- **Mainnet (when you release):**
  - Transaction fee: ~0.000005 SOL per transaction
  - You need REAL SOL (buy with real money)
  - **Result: Each transaction costs ~$0.00025** (very cheap, but not free)

**For Development:** Use devnet - everything is free!

**Alternative Faucets:**
- https://solfaucet.com/ (if main one is down)
- Or use Solana CLI: `solana airdrop 2 <your-address> --url devnet`

---

## Step 3: Get SOL for Mainnet (Real Money - Later)

**Only when ready for production (NOT for development):**

**Mainnet Costs:**
- Each transaction: ~$0.00025 (0.000005 SOL)
- Creating a match: 1 transaction = $0.00025
- Submitting a move: 1 transaction = $0.00025
- Ending a match: 1 transaction = $0.00025
- **Total per match: ~$0.001-0.002** (very cheap, but not free)

**To get mainnet SOL:**

1. **Buy SOL:**
   - Use an exchange (Coinbase, Binance, etc.)
   - Buy SOL (minimum ~$5-10 for testing)
   - Send to your Phantom wallet address

2. **Or use a bridge:**
   - Use a service like Jupiter or Wormhole
   - Bridge from another chain

**Note:** 
- **For development:** Use DEVNET (100% free)
- **For production:** Use mainnet (real money, but very cheap)

---

## Why Not Use Devnet Forever?

**Short answer:** Devnet is for testing only. It's not suitable for production.

**Key Differences:**

| Feature | Devnet | Mainnet |
|---------|--------|---------|
| **Cost** | Free | ~$0.00025 per transaction |
| **Permanence** | ❌ Can be reset/cleared | ✅ Permanent, immutable |
| **Trust** | ❌ Users know it's fake | ✅ Real, verifiable records |
| **Stability** | ⚠️ Can have downtime | ✅ Production-grade |
| **Data Loss** | ⚠️ Can happen | ✅ Never (immutable) |
| **User Confidence** | ❌ "This is just a test" | ✅ "This is real" |

**Why Mainnet Matters for Your Game:**

1. **Verifiability:** Players need to trust that match records are permanent and can't be tampered with. Devnet can be reset.

2. **User Trust:** If you tell users "your matches are on devnet," they'll know it's not real. Mainnet = real, verifiable history.

3. **Permanence:** Devnet can be wiped. If a player's match history disappears, they'll lose trust. Mainnet is permanent.

4. **Economic Value:** Even if small, real SOL transactions create real economic stakes and trust.

5. **Production Ready:** Mainnet is battle-tested, stable, and designed for real applications.

**When to Use Each:**

- **Devnet:** Development, testing, demos, learning
- **Mainnet:** Production, real users, verifiable records, permanent history

**Cost Reality Check:**
- Devnet: Free (but fake/untrusted)
- Mainnet: ~$0.001-0.002 per match (very cheap, but real)

**Bottom Line:** For a verifiable multiplayer game, you need mainnet. The cost is negligible (~$0.001 per match), but the trust and permanence are essential.

---

## Step 4: Connect Wallet to Your App

**Your app already has wallet integration!**

1. **Open your app** (when running)
2. **Click "Connect Wallet"** button (if you have one)
3. **Phantom popup appears** → Click "Connect"
4. **Wallet connected!**

The app uses `@solana/wallet-adapter-react` which automatically detects Phantom/Solflare.

---

## Step 5: Check Your Wallet Balance

**In Phantom:**
- Open Phantom extension
- Your SOL balance is shown at the top
- For devnet: Should show "SOL" with "Devnet" badge

**Via CLI (optional):**
```bash
solana balance <your-address> --url devnet
```

---

## Common Issues & Solutions

### "Insufficient funds" error
- **Problem:** Not enough SOL for transaction fees
- **Solution:** Get more devnet SOL from faucet (Step 2)

### Wallet not connecting
- **Problem:** Extension not installed or not unlocked
- **Solution:** 
  - Make sure Phantom is installed
  - Unlock wallet with password
  - Refresh your app

### Wrong network
- **Problem:** Wallet on mainnet but app on devnet
- **Solution:** Switch Phantom to Devnet (Settings → Developer Settings → Testnet Mode)

### Transaction fails
- **Problem:** Program not deployed or wrong Program ID
- **Solution:** Make sure you've deployed the Rust program first

---

## Security Tips

1. **NEVER share your seed phrase** - Anyone with it can steal your funds
2. **Use devnet for testing** - Free tokens, no real money
3. **Double-check network** - Make sure you're on devnet when testing
4. **Verify transactions** - Check transaction signatures on Solana Explorer

---

## Quick Commands Reference

```bash
# Check wallet balance (devnet)
solana balance --url devnet

# Get free devnet SOL
solana airdrop 2 --url devnet

# Check your wallet address
solana address

# Switch to devnet
solana config set --url devnet
```

---

## Next Steps

Once you have:
- ✅ Phantom wallet installed
- ✅ Devnet SOL in wallet
- ✅ Wallet connected to app

You can:
1. Create a match → Calls `createMatch()` → Creates account on Solana
2. Join a match → Calls `joinMatch()` → Adds you to match
3. Submit moves → Calls `submitMove()` → Stores move on-chain

**Everything is automatic - no manual account creation needed!**

