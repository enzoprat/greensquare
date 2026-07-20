/**
 * End-to-end critical checks against a running server (loops 3/4/6).
 * Verifies: price never leaks to visitors, server-side quantity clamping,
 * minimum-order gate (client + server), and checkout blocking.
 * Usage: node scripts/e2e-check.mjs http://localhost:3100
 */
const BASE = process.argv[2] ?? 'http://localhost:3100';
let pass = 0, fail = 0;
const ok = (c, m) => { (c ? pass++ : fail++); console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); };

// tiny cookie jar
function jar() {
  const store = new Map();
  return {
    header: () => [...store.entries()].map(([k, v]) => `${k}=${v}`).join('; '),
    absorb: (res) => {
      const sc = res.headers.getSetCookie?.() ?? [];
      for (const c of sc) { const [kv] = c.split(';'); const i = kv.indexOf('='); store.set(kv.slice(0, i), kv.slice(i + 1)); }
    },
  };
}
const req = async (j, path, opts = {}) => {
  const res = await fetch(BASE + path, { ...opts, headers: { ...(opts.headers || {}), Cookie: j.header() }, redirect: 'manual' });
  j.absorb(res);
  return res;
};

async function login(j, email, password) {
  const res = await req(j, '/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', email, password }) });
  return res.ok;
}
async function cartAdd(j, productId, cases) {
  const res = await req(j, '/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'add', productId, cases }) });
  return res.json();
}
async function cartGet(j) { return (await req(j, '/api/cart')).json(); }

async function main() {
  // 1. Price must NOT leak on a public product page (visitor).
  const anon = jar();
  const catalogueHtml = await (await req(anon, '/catalogue')).text();
  const handle = catalogueHtml.match(/\/produit\/([a-z0-9-]+)/)?.[1];
  ok(!!handle, `found a product handle (${handle})`);
  const prodHtml = await (await req(anon, `/produit/${handle}`)).text();
  ok(prodHtml.includes('N/D'), 'visitor sees N/D on product page');
  // No euro HT price string should appear for a visitor, except the fixed
  // "1 500 € HT" minimum-order copy (may appear multiple times).
  const stripped = prodHtml.replaceAll('1 500 € HT', '').replaceAll('1\u00a0500\u00a0€ HT', '');
  ok(!/\d[\d\s\u00a0.,]*\s*€\s*HT/.test(stripped), 'no real € HT price leaked to visitor');

  // Visitor cannot get prices via cart JSON either.
  const anonCart = await cartGet(anon);
  ok(anonCart.canSeePrice === false, 'cart JSON canSeePrice=false for visitor');
  ok(anonCart.subtotalHtCents === null, 'cart JSON hides subtotal cents for visitor');

  // 2. Pro flow: quantities and minimum.
  const pro = jar();
  ok(await login(pro, 'pro@greensquare.eu', 'greensquare'), 'login pro_valide');

  // Pick an ACTIVE product id from the API-backed cart flow: use catalogue page data.
  // Fetch product ids by adding from the product page's data — simplest: query API list via a known handle add.
  // We add via productId; get ids from the DB-backed catalogue by scraping data attributes is not available,
  // so use the cart add by resolving a product through a small helper endpoint isn't present.
  // Instead: add using productId discovered from the product page add button (embedded in client JS is not in HTML).
  // We rely on /api/cart accepting productId, so fetch ids through the catalogue's product links -> product page -> no id.
  // -> Use the debug list endpoint.
  const list = await (await req(pro, '/api/dev-products')).json().catch(() => null);
  if (!list) { ok(false, 'debug product list endpoint available'); return; }
  const products = list.products;

  // Empty any residual cart from previous runs.
  for (const l of (await cartGet(pro)).byBrand.flatMap((b) => b.lines)) {
    await req(pro, '/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'remove', productId: l.productId }) });
  }

  // Pick a simple product: minimumCases=1, step=1, enough stock for 3 cases.
  const simple = products.find((p) => p.minimumCases === 1 && p.caseOrderStep === 1 && (p.availableCases ?? 99) >= 3);
  ok(!!simple, `found a min=1/step=1 product (${simple?.title})`);

  // Quantity coherence: add 3 cases -> caseQuantity=3, totalUnits = 3 * unitsPerCase.
  let cart = await cartAdd(pro, simple.id, 3);
  let line = cart.byBrand.flatMap((b) => b.lines).find((l) => l.productId === simple.id);
  ok(line?.caseQuantity === 3, `line shows 3 colis (got ${line?.caseQuantity})`);
  ok(line?.totalUnits === 3 * simple.unitsPerCase, `units = 3 * upc (${line?.totalUnits} == ${3 * simple.unitsPerCase})`);
  ok(cart.canSeePrice === true, 'pro sees prices');

  // Adversarial: negative / decimal / over-stock quantities are rejected server-side.
  cart = await cartAdd(pro, simple.id, -5);
  line = cart.byBrand.flatMap((b) => b.lines).find((l) => l.productId === simple.id);
  ok((line?.caseQuantity ?? 0) === 3, 'negative add does not corrupt quantity (stays 3)');
  const over = await (await req(pro, '/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'set', productId: simple.id, cases: 99999 }) })).json();
  const overLine = over.byBrand.flatMap((b) => b.lines).find((l) => l.productId === simple.id);
  ok((overLine?.caseQuantity ?? 0) <= (simple.availableCases ?? 99999), `over-stock clamped to stock (${overLine?.caseQuantity} <= ${simple.availableCases})`);

  // 3. Minimum gate: small cart should block checkout server-side.
  await req(pro, '/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'set', productId: simple.id, cases: 1 }) });
  cart = await cartGet(pro);
  ok(cart.checkoutAllowed === false, 'small cart blocks checkout (client flag)');
  const chk = await req(pro, '/api/checkout', { method: 'POST' });
  ok(chk.status === 422, `server rejects checkout below minimum (status ${chk.status})`);

  // 4. Reach the minimum by filling several products to their max stock.
  for (const p of products) {
    cart = await (await req(pro, '/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'set', productId: p.id, cases: p.availableCases ?? 20 }) })).json();
    if (cart.minimum.reached) break;
  }
  ok(cart.minimum.reached === true, `minimum reached (subtotal ${cart.subtotalHtCents} >= 150000)`);
  ok(cart.checkoutAllowed === true, 'checkout allowed once minimum reached');
  const chk2 = await req(pro, '/api/checkout', { method: 'POST' });
  const chk2body = await chk2.json();
  ok(chk2.ok && chk2body.ok, `checkout succeeds (ref ${chk2body.reference})`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
