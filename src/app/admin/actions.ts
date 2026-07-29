'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { slugify } from '@/lib/text';

// Accepted logo/image types + size cap (stored inline as data-URL in the DB,
// so keep it small — Vercel's filesystem is read-only, no disk uploads).
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const IMAGE_MAX_BYTES = 512 * 1024; // 512 Ko

/**
 * If a file was uploaded under `field`, validate it and return a data-URL.
 * Returns undefined when no file was provided (caller keeps the URL text field).
 * Throws on an invalid type or an oversized file.
 */
async function uploadedImageDataUrl(formData: FormData, field: string): Promise<string | undefined> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Format d'image non supporté (${file.type}). Utilisez PNG, JPG, WEBP ou SVG.`);
  }
  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error(`Image trop lourde (${Math.round(file.size / 1024)} Ko). Maximum 512 Ko.`);
  }
  const b64 = Buffer.from(await file.arrayBuffer()).toString('base64');
  return `data:${file.type};base64,${b64}`;
}

// --------------------------------------------------------------------------
// Pro account requests
// --------------------------------------------------------------------------

/** Approve a pro request: user role -> PRO_VALIDE, request -> APPROVED. */
export async function approveProRequest(formData: FormData) {
  await requireAdmin();
  const requestId = String(formData.get('requestId') ?? '');
  const req = await prisma.proAccountRequest.findUnique({ where: { id: requestId } });
  if (!req) return;
  await prisma.$transaction([
    prisma.proAccountRequest.update({ where: { id: requestId }, data: { status: 'APPROVED', reviewedAt: new Date() } }),
    prisma.user.update({ where: { id: req.userId }, data: { role: 'PRO_VALIDE' } }),
  ]);
  revalidatePath('/admin/demandes');
  revalidatePath('/admin/clients');
}

/** Reject a pro request: user stays VISITOR, request -> REJECTED. */
export async function rejectProRequest(formData: FormData) {
  await requireAdmin();
  const requestId = String(formData.get('requestId') ?? '');
  const req = await prisma.proAccountRequest.findUnique({ where: { id: requestId } });
  if (!req) return;
  await prisma.$transaction([
    prisma.proAccountRequest.update({ where: { id: requestId }, data: { status: 'REJECTED', reviewedAt: new Date() } }),
    prisma.user.update({ where: { id: req.userId }, data: { role: 'VISITOR' } }),
  ]);
  revalidatePath('/admin/demandes');
  revalidatePath('/admin/clients');
}

// --------------------------------------------------------------------------
// Per-client merchant visibility (allowlist)
// --------------------------------------------------------------------------

/** Toggle whether a client can see a given merchant. Allowlist: default hidden. */
export async function setClientMerchantVisibility(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get('userId') ?? '');
  const merchantId = String(formData.get('merchantId') ?? '');
  const visible = formData.get('visible') === '1';
  if (!userId || !merchantId) return;
  await prisma.clientMerchantAccess.upsert({
    where: { userId_merchantId: { userId, merchantId } },
    update: { visible },
    create: { userId, merchantId, visible },
  });
  revalidatePath(`/admin/clients/${userId}`);
}

// --------------------------------------------------------------------------
// Orders
// --------------------------------------------------------------------------

export async function setOrderStatus(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get('orderId') ?? '');
  const status = String(formData.get('status') ?? '') as 'RECEIVED' | 'PROCESSED' | 'SENT_TO_EBP' | 'REJECTED';
  if (!orderId) return;
  await prisma.order.update({ where: { id: orderId }, data: { status } });
  revalidatePath('/admin/commandes');
  revalidatePath(`/admin/commandes/${orderId}`);
}

// --------------------------------------------------------------------------
// Merchants (mandants)
// --------------------------------------------------------------------------

export async function saveMerchant(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const uploadedLogo = await uploadedImageDataUrl(formData, 'logoFile');
  const logoUrl = uploadedLogo ?? (String(formData.get('logoUrl') ?? '').trim() || null);
  const description = String(formData.get('description') ?? '').trim() || null;
  const website = String(formData.get('website') ?? '').trim() || null;
  const active = formData.get('active') === 'on';
  const displayOrder = Number(formData.get('displayOrder') ?? 0) || 0;
  if (!name) return;

  if (id) {
    // Only overwrite the logo when a new file was uploaded (or a URL typed);
    // an empty upload keeps the existing logo.
    const data = uploadedLogo === undefined && !formData.get('logoUrl')
      ? { name, description, website, active, displayOrder }
      : { name, logoUrl, description, website, active, displayOrder };
    await prisma.merchant.update({ where: { id }, data });
  } else {
    const slug = await uniqueSlug('merchant', slugify(name));
    await prisma.merchant.create({ data: { slug, name, logoUrl, description, website, active, displayOrder } });
  }
  revalidatePath('/admin/mandants');
  redirect('/admin/mandants');
}

// --------------------------------------------------------------------------
// Brands
// --------------------------------------------------------------------------

export async function saveBrand(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const merchantId = String(formData.get('merchantId') ?? '') || null;
  const name = String(formData.get('name') ?? '').trim();
  const logoUrl = String(formData.get('logoUrl') ?? '').trim() || null;
  const active = formData.get('active') === 'on';
  if (!name) return;

  if (id) {
    await prisma.brand.update({ where: { id }, data: { name, logoUrl, active, merchantId } });
  } else {
    const slug = await uniqueSlug('brand', slugify(name));
    await prisma.brand.create({ data: { slug, name, logoUrl, active, merchantId } });
  }
  const backTo = String(formData.get('backTo') ?? '/admin/mandants');
  revalidatePath(backTo);
  redirect(backTo);
}

// --------------------------------------------------------------------------
// Products
// --------------------------------------------------------------------------

function intOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function saveProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const brandId = String(formData.get('brandId') ?? '');
  const category = String(formData.get('category') ?? '').trim() || null;
  const sku = String(formData.get('sku') ?? '').trim() || null;
  const ean = String(formData.get('ean') ?? '').trim() || null;
  const imageUrl = String(formData.get('imageUrl') ?? '').trim() || null;
  const shortDesc = String(formData.get('shortDesc') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim() || null;
  const storageType = String(formData.get('storageType') ?? '').trim() || null;
  const priceEuros = String(formData.get('unitPriceHtEuros') ?? '').trim();
  const unitPriceHtCents = priceEuros === '' ? null : Math.round(Number(priceEuros.replace(',', '.')) * 100);
  const stockUnits = intOrNull(formData.get('stockUnits'));
  const unitsPerCase = intOrNull(formData.get('unitsPerCase'));
  const casesPerPallet = intOrNull(formData.get('casesPerPallet'));
  const status = String(formData.get('status') ?? 'DRAFT') as 'DRAFT' | 'ACTIVE' | 'DORMANT';
  if (!title || !brandId) return;

  const data = {
    title, brandId, category, sku, ean, imageUrl, shortDesc, description,
    storageType, unitPriceHtCents, stockUnits, unitsPerCase, casesPerPallet, status,
  };

  if (id) {
    await prisma.product.update({ where: { id }, data });
  } else {
    const handle = await uniqueSlug('product', slugify(title));
    await prisma.product.create({ data: { ...data, handle } });
  }
  revalidatePath('/admin/produits');
  redirect('/admin/produits');
}

/** Quick status change from the list (activate / sommeil / draft). */
export async function setProductStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as 'DRAFT' | 'ACTIVE' | 'DORMANT';
  if (!id) return;
  await prisma.product.update({ where: { id }, data: { status } });
  revalidatePath('/admin/produits');
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  // Guard: keep referential integrity — a product in an order cannot be hard-deleted.
  const inOrder = await prisma.orderItem.count({ where: { productId: id } });
  if (inOrder > 0) {
    await prisma.product.update({ where: { id }, data: { status: 'DORMANT' } });
  } else {
    await prisma.cartItem.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
  }
  revalidatePath('/admin/produits');
  redirect('/admin/produits');
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Generate a slug unique within a table by appending -2, -3, … if needed. */
async function uniqueSlug(table: 'merchant' | 'brand' | 'product', base: string): Promise<string> {
  const root = base || 'item';
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists =
      table === 'merchant' ? await prisma.merchant.findUnique({ where: { slug } })
      : table === 'brand' ? await prisma.brand.findUnique({ where: { slug } })
      : await prisma.product.findUnique({ where: { handle: slug } });
    if (!exists) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}
