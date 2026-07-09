/**
 * VietFuel API Console Dashboard
 * Copyright (c) 2026 TranQui
 * Github: https://github.com/TranQui004
 */

import readline from 'readline';

const API_BASE = 'http://localhost:3000';

// ANSI terminal color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  whiteBg: '\x1b[47m\x1b[30m',
  cyanBg: '\x1b[46m\x1b[30m'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Short headers for compact table display
const SOURCE_SHORTS = {
  petrolimex: 'PLX',
  kv2_petrolimex: 'KV2',
  saigon_petrolimex: 'SGP-M',
  vungtau_petrolimex: 'VT-M',
  pvoil: 'PVO',
  mipec: 'MIP',
  comeco: 'COM',
  saigonpetro: 'SGP',
  petrotimes: 'PTT',
  giaxanghomnay: 'GXH',
  webgia: 'WEG'
};

const SOURCE_LABELS = {
  PLX: 'Petrolimex',
  KV2: 'Petrolimex KV2',
  'SGP-M': 'Petrolimex Saigon (Mirror)',
  'VT-M': 'Petrolimex Vung Tau (Mirror)',
  PVO: 'PVOil',
  MIP: 'Mipec',
  COM: 'COMECO',
  SGP: 'Saigon Petro',
  PTT: 'Petro Times',
  GXH: 'GiaXangHomNay',
  WEG: 'WebGia'
};

// Main execution entry point
async function start() {
  showMenu();
}

function clearScreen() {
  process.stdout.write('\x1Bc');
}

function printBanner() {
  console.log(`${colors.cyan}${colors.bold}`);
  console.log('  ██╗   ██╗██╗███████╗████████╗███████╗██╗   ██╗███████╗██╗     ');
  console.log('  ██║   ██║██║██╔════╝╚══██╔══╝██╔════╝██║   ██║██╔════╝██║     ');
  console.log('  ██║   ██║██║█████╗     ██║   █████╗  ██║   ██║█████╗  ██║     ');
  console.log('  ╚██╗ ██╔╝██║██╔══╝     ██║   ██╔══╝  ██║   ██║██╔══╝  ██║     ');
  console.log('   ╚████╔╝ ██║███████╗   ██║   ██║     ╚██████╔╝███████╗███████╗');
  console.log('    ╚═══╝  ╚═╝╚══════╝   ╚═╝   ╚═╝      ╚═════╝ ╚══════╝╚══════╝');
  console.log(`                       ${colors.yellow}VIETFUEL API CONSOLE v1.1.0${colors.reset}\n`);
}

async function apiFetch(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    throw new Error(`Could not connect to VietFuel API server at ${API_BASE}.\nPlease make sure the server is running (e.g. npm run dev or node-server.js).`);
  }
}

function waitReturn() {
  console.log(`\n${colors.dim}─────────────────────────────────────────────────────────────────────────────${colors.reset}`);
  rl.question(`Press ${colors.green}[Enter]${colors.reset} to return to main menu... `, () => {
    showMenu();
  });
}

function showMenu() {
  clearScreen();
  printBanner();
  
  console.log(`${colors.cyan}${colors.bold}  === FUNCTION MENU ===${colors.reset}`);
  console.log(`  ${colors.green}1.${colors.reset} View Live Fuel Prices (Aggregated Table)`);
  console.log(`  ${colors.green}2.${colors.reset} View Database Price History Logs`);
  console.log(`  ${colors.green}3.${colors.reset} Check Health Status & Storage Paths`);
  console.log(`  ${colors.green}4.${colors.reset} Manage System Cache (Clear cache)`);
  console.log(`  ${colors.green}5.${colors.reset} Force Refresh All Price Scraping`);
  console.log(`  ${colors.green}6.${colors.reset} Exit`);
  console.log();
  
  rl.question(`${colors.bold}Select option (1-6): ${colors.reset}`, async (choice) => {
    switch (choice.trim()) {
      case '1':
        await handleViewPrices();
        break;
      case '2':
        await handleViewHistory();
        break;
      case '3':
        await handleViewHealth();
        break;
      case '4':
        await handleClearCache();
        break;
      case '5':
        await handleForceRefresh();
        break;
      case '6':
        console.log(`\nGoodbye! Have a nice day.`);
        rl.close();
        process.exit(0);
      default:
        console.log(`${colors.red}Invalid option. Please choose 1-6.${colors.reset}`);
        setTimeout(showMenu, 1200);
        break;
    }
  });
}

async function handleViewPrices() {
  clearScreen();
  console.log(`${colors.cyan}${colors.bold}>>> LIVE FUEL PRICES COMPARISON <<<${colors.reset}\n`);
  
  try {
    console.log(`${colors.dim}Fetching data from API...${colors.reset}\n`);
    const payload = await apiFetch('/api/fuel-prices');
    if (!payload.success) {
      console.log(`${colors.red}API returned failure: ${payload.message || 'Unknown error'}${colors.reset}`);
      waitReturn();
      return;
    }

    const data = payload.data || [];
    const meta = payload.meta || {};
    
    console.log(`${colors.bold}Price Date:${colors.reset} ${colors.green}${meta.priceDateDisplay || meta.priceDate || 'N/A'}${colors.reset}  |  ${colors.bold}Scraped At:${colors.reset} ${meta.scrapedAt || 'N/A'}`);
    console.log(`${colors.bold}Primary Source:${colors.reset} ${meta.primarySource || 'N/A'}  |  ${colors.bold}Cache TTL:${colors.reset} ${meta.cacheTtlRemainingSeconds ?? 0}s\n`);

    // We compile active sources across all products
    const sourcesInResponse = new Set();
    data.forEach(item => {
      (item.sources || []).forEach(src => sourcesInResponse.add(src.source));
    });

    const activeSources = Array.from(sourcesInResponse).sort();
    
    // Build Table Header
    // Product Name (28 chars) | Source 1 (6 chars) | Source 2 (6) ...
    let headerLine = `┌──────────────────────────────`;
    activeSources.forEach(() => {
      headerLine += `┬────────`;
    });
    headerLine += `┐`;
    console.log(`${colors.cyan}${headerLine}${colors.reset}`);

    let titleLine = `│ ${colors.bold}${'Fuel Product'.padEnd(28)}${colors.reset}`;
    activeSources.forEach(src => {
      const short = SOURCE_SHORTS[src] || src.substring(0, 6).toUpperCase();
      titleLine += `│ ${colors.bold}${short.padStart(6)}${colors.reset} `;
    });
    titleLine += `│`;
    console.log(titleLine);

    let midDivider = `├──────────────────────────────`;
    activeSources.forEach(() => {
      midDivider += `┼────────`;
    });
    midDivider += `┤`;
    console.log(`${colors.cyan}${midDivider}${colors.reset}`);

    // Build Rows
    data.forEach(item => {
      let rowLine = `│ ${colors.green}${item.name.padEnd(28)}${colors.reset}`;
      activeSources.forEach(srcName => {
        const srcPrice = item.sources.find(s => s.source === srcName);
        if (srcPrice) {
          // If distributor provides specific region prices
          const p = srcPrice.price !== null ? srcPrice.price : srcPrice.region1;
          if (p) {
            const formatted = String(p).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            rowLine += `│ ${colors.bold}${formatted.padStart(6)}${colors.reset} `;
          } else {
            rowLine += `│ ${colors.red}${'N/A'.padStart(6)}${colors.reset} `;
          }
        } else {
          rowLine += `│ ${colors.red}${'N/A'.padStart(6)}${colors.reset} `;
        }
      });
      rowLine += `│`;
      console.log(rowLine);
    });

    let bottomLine = `└──────────────────────────────`;
    activeSources.forEach(() => {
      bottomLine += `┴────────`;
    });
    bottomLine += `┘`;
    console.log(`${colors.cyan}${bottomLine}${colors.reset}`);

    // Print Legend
    console.log(`\n${colors.bold}Legend:${colors.reset}`);
    activeSources.forEach(src => {
      const short = SOURCE_SHORTS[src] || src.substring(0, 6).toUpperCase();
      const label = SOURCE_LABELS[short] || src;
      console.log(`  ${colors.cyan}${colors.bold}${short.padStart(5)}${colors.reset} : ${label}`);
    });

  } catch (err) {
    console.log(`${colors.red}Error: ${err.message}${colors.reset}`);
  }
  
  waitReturn();
}

async function handleViewHistory() {
  clearScreen();
  console.log(`${colors.cyan}${colors.bold}>>> DATABASE PRICE HISTORY LOGS <<<${colors.reset}\n`);

  rl.question(`Enter fuel product name to filter (press Enter to show all): `, async (filter) => {
    try {
      console.log(`\n${colors.dim}Fetching logs...${colors.reset}`);
      const payload = await apiFetch('/api/history');
      if (!payload.success) {
        console.log(`${colors.red}API returned failure: ${payload.message || 'Unknown error'}${colors.reset}`);
        waitReturn();
        return;
      }

      let records = payload.data || [];
      const query = filter.trim().toLowerCase();
      if (query) {
        records = records.filter(r => r.fuel_name.toLowerCase().includes(query));
      }

      if (records.length === 0) {
        console.log(`\n${colors.yellow}No matching history records found in the SQLite database.${colors.reset}`);
        waitReturn();
        return;
      }

      console.log(`\nShowing latest ${colors.green}${Math.min(records.length, 15)}${colors.reset} matching records (Total: ${records.length}):\n`);

      // Draw table: Date (10) | Source (12) | Product Name (24) | Region 1 (8) | Region 2 (8)
      console.log(`${colors.cyan}┌────────────┬──────────────┬──────────────────────────┬──────────┬──────────┐${colors.reset}`);
      console.log(`│ ${colors.bold}${'Date'.padEnd(10)}${colors.reset} │ ${colors.bold}${'Source'.padEnd(12)}${colors.reset} │ ${colors.bold}${'Fuel Product'.padEnd(24)}${colors.reset} │ ${colors.bold}${'Region 1'.padStart(8)}${colors.reset} │ ${colors.bold}${'Region 2'.padStart(8)}${colors.reset} │`);
      console.log(`${colors.cyan}├────────────┼──────────────┼──────────────────────────┼──────────┼──────────┤${colors.reset}`);

      records.slice(0, 15).forEach(rec => {
        const date = rec.price_date || 'N/A';
        const src = SOURCE_SHORTS[rec.source] || rec.source.substring(0, 12);
        const name = rec.fuel_name.substring(0, 24);
        
        const r1 = rec.region1 ? String(rec.region1).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 'N/A';
        const r2 = rec.region2 ? String(rec.region2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 'N/A';
        
        console.log(`│ ${date.padEnd(10)} │ ${src.padEnd(12)} │ ${colors.green}${name.padEnd(24)}${colors.reset} │ ${colors.bold}${r1.padStart(8)}${colors.reset} │ ${colors.bold}${r2.padStart(8)}${colors.reset} │`);
      });

      console.log(`${colors.cyan}└────────────┴──────────────┴──────────────────────────┴──────────┴──────────┘${colors.reset}`);

    } catch (err) {
      console.log(`${colors.red}Error: ${err.message}${colors.reset}`);
    }

    waitReturn();
  });
}

async function handleViewHealth() {
  clearScreen();
  console.log(`${colors.cyan}${colors.bold}>>> SYSTEM HEALTH & STORAGE STATUS <<<${colors.reset}\n`);

  try {
    console.log(`${colors.dim}Fetching status...${colors.reset}\n`);
    const payload = await apiFetch('/api/health');
    if (!payload.success) {
      console.log(`${colors.red}API returned failure: ${payload.message || 'Unknown'}${colors.reset}`);
      waitReturn();
      return;
    }

    const storage = payload.storage || {};
    const sources = payload.sources || {};

    console.log(`${colors.bold}=== ACTIVE STORAGE ENGINE ===${colors.reset}`);
    console.log(`  ${colors.bold}Cache Location :${colors.reset} ${colors.green}${storage.cacheType || 'N/A'}${colors.reset}`);
    console.log(`  ${colors.bold}DB Location    :${colors.reset} ${colors.green}${storage.dbType || 'N/A'}${colors.reset}`);
    console.log();

    console.log(`${colors.bold}=== DISTRIBUTOR CRAWLER STATUS ===${colors.reset}`);
    
    // Draw Status table
    console.log(`${colors.cyan}┌──────────────────────┬─────────────┬──────────────────────┬──────────┐${colors.reset}`);
    console.log(`│ ${colors.bold}${'Distributor'.padEnd(20)}${colors.reset} │ ${colors.bold}${'State'.padEnd(11)}${colors.reset} │ ${colors.bold}${'Last Scraped'.padEnd(20)}${colors.reset} │ ${colors.bold}${'TTL'.padStart(8)}${colors.reset} │`);
    console.log(`${colors.cyan}├──────────────────────┼─────────────┼──────────────────────┼──────────┤${colors.reset}`);

    Object.entries(sources).forEach(([key, src]) => {
      const name = src.label || key;
      const state = src.populated ? `${colors.green}Populated${colors.reset}` : `${colors.red}Empty/Error${colors.reset}`;
      const time = src.scrapedAt ? new Date(src.scrapedAt).toLocaleTimeString() : 'Never';
      const ttl = src.ttlRemainingSeconds !== null ? `${src.ttlRemainingSeconds}s` : 'N/A';
      console.log(`│ ${name.padEnd(20)} │ ${state.padEnd(20)} │ ${time.padEnd(20)} │ ${ttl.padStart(8)} │`);
    });

    console.log(`${colors.cyan}└──────────────────────┴─────────────┴──────────────────────┴──────────┘${colors.reset}`);

  } catch (err) {
    console.log(`${colors.red}Error: ${err.message}${colors.reset}`);
  }

  waitReturn();
}

async function handleClearCache() {
  clearScreen();
  console.log(`${colors.cyan}${colors.bold}>>> CACHE MANAGEMENT <<<${colors.reset}\n`);

  rl.question(`${colors.bold}Are you sure you want to clear the entire cache? (y/N): ${colors.reset}`, async (ans) => {
    if (ans.trim().toLowerCase() !== 'y') {
      console.log(`\nOperation canceled.`);
      waitReturn();
      return;
    }

    try {
      console.log(`\n${colors.dim}Clearing cache on API server...${colors.reset}`);
      const payload = await apiFetch('/api/clear-cache');
      if (payload.success) {
        console.log(`\n${colors.green}✔ Success! All cache records cleared successfully.${colors.reset}`);
        console.log(`  Cleared Namespace Count : ${colors.bold}${payload.clearedCount || 0}${colors.reset}`);
        if (payload.clearedKeys && payload.clearedKeys.length > 0) {
          console.log(`  Cleared Cache Keys      : ${colors.dim}${payload.clearedKeys.join(', ')}${colors.reset}`);
        }
      } else {
        console.log(`\n${colors.red}✖ Cache clearing failed: ${payload.message || 'Unknown'}${colors.reset}`);
      }
    } catch (err) {
      console.log(`\n${colors.red}Error: ${err.message}${colors.reset}`);
    }

    waitReturn();
  });
}

async function handleForceRefresh() {
  clearScreen();
  console.log(`${colors.cyan}${colors.bold}>>> FORCE REFRESH ALL PRICE SCRAPING <<<${colors.reset}\n`);

  console.log(`${colors.yellow}Warning: This will clear the local cache and force-scrape all 11 sources.${colors.reset}`);
  console.log(`${colors.yellow}This might take up to 10-15 seconds to complete. Please wait...${colors.reset}\n`);

  try {
    console.log(`${colors.dim}Requesting refresh scrape...${colors.reset}`);
    const start = Date.now();
    const payload = await apiFetch('/api/fuel-prices?refresh=1');
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);

    if (payload.success) {
      console.log(`\n${colors.green}✔ Force refresh completed successfully in ${elapsed}s!${colors.reset}`);
      console.log(`  Total Items Parsed: ${colors.bold}${payload.meta?.totalItems || 0}${colors.reset}`);
      console.log(`  Data Sources Updated: ${colors.dim}${payload.meta?.dataSources?.join(', ')}${colors.reset}`);
    } else {
      console.log(`\n${colors.red}✖ Force refresh failed: ${payload.message || 'Unknown'}${colors.reset}`);
    }
  } catch (err) {
    console.log(`\n${colors.red}Error: ${err.message}${colors.reset}`);
  }

  waitReturn();
}

start();
