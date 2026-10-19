import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { pack, unpack, lazy } from 'slimjson';

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);

function generateCustomerData(count) {
  const cities = ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Makassar', 'Denpasar', 'Yogyakarta'];
  const firstNames = ['Budi', 'Siti', 'Andi', 'Dewi', 'Reza', 'Maya', 'Eko', 'Rina', 'Fajar', 'Putri'];
  const lastNames = ['Santoso', 'Rahma', 'Wijaya', 'Kusuma', 'Siregar', 'Hidayat', 'Pratama', 'Lestari'];

  const records = [];
  for (let i = 1; i <= count; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    const city = cities[i % cities.length];

    records.push({
      customer_id: 100000 + i,
      customer_name: `${fn} ${ln}`,
      customer_address: `Jl. Merdeka No. ${i % 150 + 1}, ${city}`,
      email_address: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`,
      phone_number: `+62812${String(1000000 + i).slice(1)}`,
      is_premium_member: i % 3 === 0,
      account_balance: parseFloat(((i * 73.25) % 50000).toFixed(2)),
      last_transaction_at: new Date(Date.now() - (i * 3600000)).toISOString()
    });
  }
  return records;
}

async function runBenchmark() {
  const RECORD_COUNT = 5000;
  console.log(`\n======================================================`);
  console.log(`🚀 SlimJSON Benchmark Suite`);
  console.log(`Dataset: ${RECORD_COUNT.toLocaleString()} Customer Records`);
  console.log(`======================================================\n`);

  const rawData = generateCustomerData(RECORD_COUNT);

  // 1. Raw JSON stringify
  const standardJson = JSON.stringify(rawData);
  const slimDoc = pack(rawData);
  const slimJson = JSON.stringify(slimDoc);

  const rawStandardBytes = Buffer.byteLength(standardJson, 'utf8');
  const rawSlimBytes = Buffer.byteLength(slimJson, 'utf8');
  const rawSavings = ((1 - rawSlimBytes / rawStandardBytes) * 100).toFixed(1);

  // 2. Gzip compression
  const [gzipStandard, gzipSlim] = await Promise.all([
    gzip(standardJson),
    gzip(slimJson)
  ]);
  const gzipStandardBytes = gzipStandard.length;
  const gzipSlimBytes = gzipSlim.length;
  const gzipSavings = ((1 - gzipSlimBytes / gzipStandardBytes) * 100).toFixed(1);

  // 3. Brotli compression
  const [brotliStandard, brotliSlim] = await Promise.all([
    brotli(standardJson),
    brotli(slimJson)
  ]);
  const brotliStandardBytes = brotliStandard.length;
  const brotliSlimBytes = brotliSlim.length;
  const brotliSavings = ((1 - brotliSlimBytes / brotliStandardBytes) * 100).toFixed(1);

  // 4. Performance: Parse and Read
  const iterations = 50;

  // Standard JSON.parse
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    const parsed = JSON.parse(standardJson);
    // Access property
    const _ = parsed[RECORD_COUNT - 1].customer_name;
  }
  const standardParseTime = (performance.now() - t0) / iterations;

  // SlimJSON.parse + unpack
  const t1 = performance.now();
  for (let i = 0; i < iterations; i++) {
    const parsed = JSON.parse(slimJson);
    const unpacked = unpack(parsed);
    const _ = unpacked[RECORD_COUNT - 1].customer_name;
  }
  const slimUnpackTime = (performance.now() - t1) / iterations;

  // SlimJSON.parse + lazy proxy
  const t2 = performance.now();
  for (let i = 0; i < iterations; i++) {
    const parsed = JSON.parse(slimJson);
    const lazyList = lazy(parsed);
    const _ = lazyList[RECORD_COUNT - 1].customer_name;
  }
  const slimLazyTime = (performance.now() - t2) / iterations;

  // Print results
  console.log(`📦 PAYLOAD SIZE COMPARISON:`);
  console.table([
    {
      Metric: 'Raw Uncompressed',
      'Standard JSON': `${(rawStandardBytes / 1024).toFixed(1)} KB`,
      'SlimJSON': `${(rawSlimBytes / 1024).toFixed(1)} KB`,
      'Bandwidth Saved': `${rawSavings}%`
    },
    {
      Metric: 'HTTP Gzip',
      'Standard JSON': `${(gzipStandardBytes / 1024).toFixed(1)} KB`,
      'SlimJSON': `${(gzipSlimBytes / 1024).toFixed(1)} KB`,
      'Bandwidth Saved': `${gzipSavings}%`
    },
    {
      Metric: 'HTTP Brotli',
      'Standard JSON': `${(brotliStandardBytes / 1024).toFixed(1)} KB`,
      'SlimJSON': `${(brotliSlimBytes / 1024).toFixed(1)} KB`,
      'Bandwidth Saved': `${brotliSavings}%`
    }
  ]);

  console.log(`⚡ PARSING & ACCESS TIME (Average per run):`);
  console.table([
    {
      Method: 'Standard JSON.parse()',
      'Time (ms)': `${standardParseTime.toFixed(2)} ms`,
      Notes: 'Allocates N objects upfront'
    },
    {
      Method: 'SlimJSON JSON.parse() + lazy()',
      'Time (ms)': `${slimLazyTime.toFixed(2)} ms`,
      Notes: 'Zero-copy proxy reader (no upfront row allocation)'
    },
    {
      Method: 'SlimJSON JSON.parse() + unpack()',
      'Time (ms)': `${slimUnpackTime.toFixed(2)} ms`,
      Notes: 'Full eager reconstitution'
    }
  ]);

  console.log(`✅ Benchmark completed successfully.\n`);
}

runBenchmark().catch(console.error);
