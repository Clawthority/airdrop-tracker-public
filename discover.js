#!/usr/bin/env node
/**
 * Airdrop Discovery Engine
 * Auto-discovers chains, tokens, and protocol interactions
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');
let CONFIG;
try {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Config not found: ${CONFIG_PATH}`);
    console.error('Copy config.example.json to config.json and edit it.');
    process.exit(1);
  }
  CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
} catch (e) {
  console.error(`Failed to load config: ${e.message}`);
  process.exit(1);
}
const WALLET = CONFIG.wallet;

const CHAIN_RPCS = {};
for (const [name, config] of Object.entries(CONFIG.chains)) {
  CHAIN_RPCS[config.chainId] = { name, rpc: config.rpc, symbol: config.symbol };
}

function httpReq(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search, method: opts.method || 'GET',
      headers: { 'User-Agent': 'AirdropDiscovery/1.0', ...(opts.headers || {}) },
      timeout: opts.timeout || 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function rpcPost(url, method, params) {
  return httpReq(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
  }).then(r => { try { return JSON.parse(r.body); } catch(e) { return {}; } });
}

async function discoverActiveChains() {
  const results = [];
  await Promise.allSettled(Object.entries(CHAIN_RPCS).map(async ([chainId, chain]) => {
    try {
      const res = await rpcPost(chain.rpc, 'eth_getBalance', [WALLET, 'latest']);
      if (res.result) {
        const balance = Number(BigInt(res.result)) / 1e18;
        if (balance > 0.00001) results.push({ chainId: parseInt(chainId), ...chain, balance });
      }
    } catch(e) {}
  }));
  return results.sort((a, b) => b.balance - a.balance);
}

async function discoverTokens(chainRpc) {
  const topic0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const paddedAddr = WALLET.toLowerCase().slice(2).padStart(64, '0');
  try {
    const blockRes = await rpcPost(chainRpc, 'eth_blockNumber', []);
    const currentBlock = parseInt(blockRes.result, 16);
    const fromBlock = '0x' + Math.max(0, currentBlock - 10000).toString(16);
    const res = await rpcPost(chainRpc, 'eth_getLogs', [{
      fromBlock, toBlock: 'latest', topics: [topic0, null, '0x' + paddedAddr]
    }]);
    if (res.result && Array.isArray(res.result)) {
      const tokens = new Map();
      for (const log of res.result) tokens.set(log.address, { address: log.address });
      return [...tokens.values()];
    }
  } catch(e) {}
  return [];
}

async function fetchAirdropNews() {
  const news = [];
  try {
    const res = await httpReq('https://airdrops.io/feed/');
    if (res.status === 200) {
      const titles = (res.body.match(/<title[^>]*>([^<]+)<\/title>/gi) || [])
        .map(t => t.replace(/<[^>]+>/g, '').trim())
        .filter(t => /airdrop|claim|token|TGE/i.test(t)).slice(0, 8);
      for (const t of titles) news.push({ source: 'Airdrops.io', title: t });
    }
  } catch(e) {}
  return news;
}

async function main() {
  const report = { timestamp: new Date().toISOString(), wallet: WALLET,
    activeChains: [], discoveredTokens: {}, airdropNews: [], summary: {} };
  
  report.activeChains = await discoverActiveChains();
  
  for (const chain of report.activeChains) {
    const tokens = await discoverTokens(chain.rpc);
    if (tokens.length > 0) report.discoveredTokens[chain.name] = tokens;
  }
  
  report.airdropNews = await fetchAirdropNews();
  report.summary = {
    chainsWithActivity: report.activeChains.length,
    totalTokensDiscovered: Object.values(report.discoveredTokens).reduce((s, t) => s + t.length, 0),
    newsItems: report.airdropNews.length
  };
  
  console.log(JSON.stringify(report, null, 2));
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
