#!/usr/bin/env node
const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  const raw = chunks.join('').trim();
  if (!raw) { console.error('No input received'); process.exit(1); }
  let r;
  try { r = JSON.parse(raw); } catch (e) { console.error(`Invalid JSON input: ${e.message}`); process.exit(1); }
  const lines = [];
  lines.push(`🔍 **Airdrop Tracker**`);
  lines.push(`📅 ${new Date(r.timestamp).toLocaleString()}`);
  lines.push(`💼 ${r.wallet.slice(0, 6)}...${r.wallet.slice(-4)}`);
  lines.push('');
  if (r.activeChains.length > 0) {
    lines.push(`**🟢 Active Chains (${r.activeChains.length}/${Object.keys(r.chains).length}):**`);
    for (const chain of r.activeChains) { const c = r.chains[chain]; lines.push(`  ✅ ${chain}: ${c.balance} ${c.symbol}`); }
    lines.push('');
  }
  if (r.inactiveChains.length > 0) { lines.push(`**⬜ No Activity:** ${r.inactiveChains.join(', ')}`); lines.push(''); }
  if (r.balanceChanges.length > 0) {
    lines.push('**⚡ Balance Changes:**');
    for (const c of r.balanceChanges) {
      const dir = parseFloat(c.diff) > 0 ? '📈' : '📉';
      lines.push(`  ${dir} ${c.chain}: ${c.previous} → ${c.current} (${c.pctChange}%)`);
    }
    lines.push('');
  }
  if (r.newTokens.length > 0) {
    lines.push('**🪙 New Tokens Received:**');
    for (const t of r.newTokens) { lines.push(`  • **${t.token}** — ${t.name} | ${t.value} | ${t.receivedAt.slice(0, 10)}`); }
    lines.push('');
  }
  if (r.scamAlerts.length > 0) {
    lines.push('**🚨 Scam Alerts:**');
    for (const s of r.scamAlerts) { lines.push(`  ⛔ ${s.token} — ${s.name}`); }
    lines.push('');
  }
  if (r.watchlist.length > 0) {
    lines.push('**📋 Watchlist:**');
    for (const w of r.watchlist) { lines.push(`  • **${w.name}** (${w.chain}) — ${w.url}`); }
  }
  if (r.newTokens.length === 0 && r.scamAlerts.length === 0 && r.balanceChanges.length === 0) {
    lines.push(''); lines.push('_No new activity. All quiet._ 🌙');
  }
  console.log(lines.join('\n'));
});
