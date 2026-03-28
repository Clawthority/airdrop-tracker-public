# Changelog

## [1.0.0] - 2026-03-27

### Added
- Multi-chain wallet monitoring across 14+ EVM chains
- Token discovery via Transfer event logs
- Protocol identification via DeFi Llama mapping
- Transaction intelligence with Etherscan source verification
- Blog/RSS monitoring for claim announcements
- Telegram-formatted output with tier badges
- State persistence with auto-dedup across runs
- MIT license

### Infrastructure
- Zero-dependency core (Node.js built-ins)
- CLI pipeline: `tracker.js | format.js`
- Config-driven chain/source selection
