# 🪂 Multi-Chain Airdrop Tracker

**The autonomous scanner that watches your wallet across 14+ EVM chains — so you never miss an airdrop you've already earned.**

You interact with protocols every day. Some of them will launch tokens and reward early users. But tracking which ones, across which chains, and when to claim? That's a full-time job. Airdrop Tracker automates it: monitors your on-chain activity, discovers new tokens hitting your wallet, identifies which protocols you've qualified for, and watches project blogs for claim announcements — all delivered to Telegram.

## How It Works

```
1. Configure your wallet address and chains to monitor
2. Tracker scans Transfer events to discover all ERC20 tokens
3. Maps your contract interactions to known protocols via DeFi Llama
4. Identifies contracts via verified source code on block explorers
5. Monitors project blogs/RSS for airdrop announcements
6. Delivers alerts to Telegram — claim windows, new tokens, yield opportunities
```

## Features

- **Multi-chain monitoring** — Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, Avalanche, zkSync, Scroll, Linea, Blast, Mantle, HyperEVM
- **Token discovery** — Finds all ERC20 tokens via Transfer event logs
- **Protocol identification** — Maps contract interactions to known DeFi protocols via DeFi Llama
- **Transaction intelligence** — Identifies contracts via Etherscan verified source code
- **Scam detection** — Flags phishing tokens automatically
- **Blog/RSS monitoring** — Watches project blogs for airdrop announcements
- **Money engine** — Finds yield opportunities, airdrop candidates, and testnet rewards

## Who It's For

- **Airdrop hunters** — Track eligibility across 14+ chains without manually checking each protocol. Know exactly what you qualify for.
- **DeFi power users** — If you're active on multiple chains, tokens appear in your wallet you didn't know about. This catches them.
- **Crypto traders** — Get early signals on token launches tied to protocols you've already used.
- **Alpha groups** — Share curated airdrop intel with your community. Automate the research everyone else does manually.
- **Multi-wallet users** — Monitor several wallets at once. No more switching between block explorers.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/airdrop-tracker.git
cd airdrop-tracker

# Install dependencies
npm install

# Configure your wallet
cp config.example.json config.json
# Edit config.json with your wallet address and chains

# Run the tracker
node tracker.js | node format.js

# Run the discovery engine
node discover.js | node format-discover.js

# Run the money engine
cd money-engine
node money-engine.js | node format.js
```

## Configuration

Edit `config.json`:

```json
{
  "wallet": "YOUR_WALLET_ADDRESS",
  "chains": {
    "ethereum": { "rpc": "https://ethereum-rpc.publicnode.com", "chainId": 1, "symbol": "ETH" }
  },
  "watchlist": [
    { "name": "Project Name", "chain": "ethereum", "url": "https://project.com", "blog": "https://project.com/rss" }
  ],
  "scamPatterns": ["visit.*to claim", "claim.*reward"]
}
```

## Components

| File | Description |
|------|-------------|
| `tracker.js` | Balance monitoring + scam detection |
| `discover.js` | Chain discovery + token scanning |
| `tx-intel.js` | Transaction intelligence + contract identification |
| `format.js` | Telegram-friendly output formatter |
| `money-engine/money-engine.js` | Yield + airdrop + testnet scanner |

## Cron Setup (OpenClaw)

```bash
openclaw cron add \
  --name "airdrop-tracker" \
  --cron "0 */6 * * *" \
  --message "Run the airdrop tracker: cd /path/to/tracker && node tracker.js | node format.js" \
  --announce --channel telegram
```

## Related Products

- **[Scam Academy](../scam-academy)** — Learn to spot scams with interactive simulations
- **[Scam Shield](../scam-shield)** — Check suspicious messages, links, and crypto addresses
- **[Crypto Alpha Feed](../crypto-alpha-feed)** — Blog/RSS monitoring for airdrop announcements

## License

MIT
