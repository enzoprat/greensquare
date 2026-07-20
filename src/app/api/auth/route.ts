import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword, createSession, destroySession } from '@/lib/auth';

const loginSchema = z.object({ action: z.literal('login'), email: z.string().email(), password: z.string().min(1) });
const registerSchema = z.object({
  action: z.literal('register'),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});
const logoutSchema = z.object({ action: z.literal('logout') });

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const schema = z.union([loginSchema, registerSchema, logoutSchema]);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const data = parsed.data;

  if (data.action === 'logout') {
    await destroySession();
    return NextResponse.json({ ok: true });
  }

  if (data.action === 'register') {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return NextResponse.json({ error: 'Un compte existe déjà avec cet e-mail.' }, { status: 409 });
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: await hashPassword(data.password),
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        role: 'VISITOR', // prices hidden until validated
      },
    });
    await createSession(user.id);
    return NextResponse.json({ ok: true, role: user.role });
  }

  // login
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
    return NextResponse.json({ error: 'Identifiants invalides.' }, { status: 401 });
  }
  await createSession(user.id);
  return NextResponse.json({ ok: true, role: user.role });
}
