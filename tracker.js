#!/usr/bin/env node
/**
 * Airdrop Tracker v2 — Multi-chain Balance Monitor
 * Tracks balances, tokens, and protocol interactions across EVM chains
 * 
 * Usage: node tracker.js | node format.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));
const STATE_FILE = path.join(__dirname, CONFIG.stateFile);

function httpReq(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: opts.method || 'GET',
      headers: { 'User-Agent': 'AirdropTracker/2.0', ...(opts.headers || {}) },
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
  return httpReq(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
  }).then(r => { try { return JSON.parse(r.body); } catch(e) { throw new Error(`RPC parse error: ${e.message}`); } });
}

async function getNativeBalance(chainConfig, wallet) {
  try {
    const res = await rpcPost(chainConfig.rpc, 'eth_getBalance', [wallet, 'latest']);
    if (res.result) return Number(BigInt(res.result)) / 1e18;
  } catch(e) {}
  return null;
}

async function getTokenBalance(chainConfig, wallet, tokenAddress, decimals) {
  try {
    const data = '0x70a08231' + wallet.toLowerCase().slice(2).padStart(64, '0');
    const res = await rpcPost(chainConfig.rpc, 'eth_call', [{ to: tokenAddress, data }, 'latest']);
    if (res.result && res.result !== '0x' && res.result !== '0x0') {
      return Number(BigInt(res.result)) / Math.pow(10, decimals || 18);
    }
  } catch(e) {}
  return 0;
}

function isScamToken(name, symbol, patterns) {
  const text = `${name} ${symbol}`.toLowerCase();
  return patterns.some(p => text.includes(p.replace(/\.\*/g, '')));
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
  catch(e) { return { knownTokens: [], lastCheck: null, nativeBalances: {}, protocolBalances: {} }; }
}

function saveState(state) { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); }

async function main() {
  const state = loadState();
  const now = new Date().toISOString();
  const wallet = CONFIG.wallet;
  
  const report = {
    timestamp: now, wallet, chains: {}, activeChains: [], inactiveChains: [],
    newTokens: [], balanceChanges: [], protocolInteractions: [],
    watchlist: CONFIG.watchlist, scamAlerts: [],
    summary: { activeChains: 0 }
  };

  // Check all chains
  await Promise.allSettled(Object.entries(CONFIG.chains).map(async ([name, config]) => {
    const balance = await getNativeBalance(config, wallet);
    if (balance !== null) {
      const prev = state.nativeBalances?.[name] || 0;
      report.chains[name] = { balance: balance.toFixed(6), symbol: config.symbol };
      if (balance > 0.0001) { report.activeChains.push(name); report.summary.activeChains++; }
      else { report.inactiveChains.push(name); }
      if (prev > 0.0001 && Math.abs(balance - prev) / prev > 0.05) {
        report.balanceChanges.push({
          chain: name, previous: prev.toFixed(6), current: balance.toFixed(6),
          diff: (balance - prev).toFixed(6), pctChange: (((balance - prev) / prev) * 100).toFixed(1)
        });
      }
      if (!state.nativeBalances) state.nativeBalances = {};
      state.nativeBalances[name] = balance;
    }
  }));

  // Token transfers (Ethereum via Ethplorer)
  try {
    const url = `https://api.ethplorer.io/getAddressHistory/${wallet}?apiKey=freekey&type=transfer&limit=30`;
    const res = await httpReq(url);
    if (res.status === 200) {
      let data;
      try { data = JSON.parse(res.body); } catch(e) { console.error('Failed to parse Ethplorer response:', e.message); return; }
      const ops = data.operations || [];
      const knownSet = new Set(state.knownTokens || []);
      for (const op of ops) {
        if (op.type === 'transfer' && op.to?.toLowerCase() === wallet.toLowerCase()) {
          const key = `${op.tokenInfo?.symbol}:${op.timestamp}`;
          if (!knownSet.has(key)) {
            knownSet.add(key);
            const name = op.tokenInfo?.name || '', symbol = op.tokenInfo?.symbol || 'UNKNOWN';
            if (isScamToken(name, symbol, CONFIG.scamPatterns)) {
              report.scamAlerts.push({ token: symbol, name, warning: 'Likely scam/phishing — DO NOT interact' });
            } else {
              const decimals = parseInt(op.tokenInfo?.decimals || '18');
              const value = op.value / Math.pow(10, decimals);
              if (value > 0) report.newTokens.push({ token: symbol, name, value, receivedAt: new Date(op.timestamp * 1000).toISOString() });
            }
          }
        }
      }
      state.knownTokens = [...knownSet];
    }
  } catch(e) {}

  state.lastCheck = now;
  saveState(state);
  console.log(JSON.stringify(report, null, 2));
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
