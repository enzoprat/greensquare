import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const schema = z.object({
  companyName: z.string().min(1),
  tradeName: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  address: z.string().min(1),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  siret: z.string().min(1),
  vatNumber: z.string().optional(),
  activity: z.string().optional(),
  estimatedVolume: z.string().optional(),
  message: z.string().optional(),
  consent: z.literal(true),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Connectez-vous pour envoyer une demande.' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Formulaire incomplet.' }, { status: 400 });
  const { consent: _consent, ...d } = parsed.data;

  await prisma.proAccountRequest.upsert({
    where: { userId: user.id },
    update: { ...d, status: 'PENDING' },
    create: { userId: user.id, ...d },
  });
  return NextResponse.json({ ok: true });
}
