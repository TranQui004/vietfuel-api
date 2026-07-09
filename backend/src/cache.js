/**
 * [KV CACHE SYSTEM] - Quản lý lưu trữ qua Cloudflare KV
 * Thay thế node-cache và cache.json cũ.
 */

// Định nghĩa mã nguồn để tiện gọi KV
const KEYS = {
  petrolimex: 'fuel:petrolimex',
  kv2_petrolimex: 'fuel:kv2_petrolimex',
  saigon_petrolimex: 'fuel:saigon_petrolimex',
  vungtau_petrolimex: 'fuel:vungtau_petrolimex',
  pvoil: 'fuel:pvoil',
  mipec: 'fuel:mipec',
  webgia: 'fuel:webgia',
  giaxanghomnay: 'fuel:giaxanghomnay',
  saigonpetro: 'fuel:saigonpetro',
  comeco: 'fuel:comeco',
  petrotimes: 'fuel:petrotimes',
};

const TTL_SECONDS = 3600; // Mặc định 1 giờ sống cho cache
const PROVINCE_TTL_SECONDS = 3600; 

// Để hoạt động với KV trong Cloudflare Worker, ta cần truyền instance env.FUEL_CACHE vào
// Do đó, mọi hàm cache sẽ nhận thêm tham số `kv` (chính là env.FUEL_CACHE)

export async function getFuelPrices(kv, source) {
  try {
    return await kv.get(KEYS[source], { type: 'json' });
  } catch (e) {
    return null;
  }
}

export async function deleteFuelPrices(kv, source) {
  try {
    if (KEYS[source]) await kv.delete(KEYS[source]);
  } catch (e) { /* ignore */ }
}

export async function updateFuelPrices(kv, source, data) {
  await kv.put(KEYS[source], JSON.stringify(data));
}

export async function getCacheStats(kv, source) {
  const data = await getFuelPrices(kv, source);
  if (!data) return { hit: false, scrapedAt: null, ttlRemaining: null, isStale: false };
  
  const ageMs = Date.now() - new Date(data.scrapedAt).getTime();
  const ttlRemaining = Math.max(0, TTL_SECONDS - Math.round(ageMs / 1000));
  const isStale = ageMs > (TTL_SECONDS * 1000);

  return { hit: true, scrapedAt: data.scrapedAt, ttlRemaining, isStale };
}

export async function getProvincePrice(kv, slug) {
  try {
    return await kv.get(`province:${slug}`, { type: 'json' });
  } catch(e) {
    return null;
  }
}

export async function updateProvincePrice(kv, slug, data) {
  // Gắn TTL cho cache KV để tự xóa sau 1 giờ
  await kv.put(`province:${slug}`, JSON.stringify(data), { expirationTtl: PROVINCE_TTL_SECONDS });
}

export async function getProvinceCacheStats(kv, slug) {
  const data = await getProvincePrice(kv, slug);
  if (!data) return { hit: false, scrapedAt: null, ttlRemaining: null, isStale: false };
  
  const ageMs = Date.now() - new Date(data.scrapedAt).getTime();
  const ttlRemaining = Math.max(0, PROVINCE_TTL_SECONDS - Math.round(ageMs / 1000));
  const isStale = ageMs > (PROVINCE_TTL_SECONDS * 1000);

  return { hit: true, scrapedAt: data.scrapedAt, ttlRemaining, isStale };
}
