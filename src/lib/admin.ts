import { redirect } from 'next/navigation';
import { getCurrentUser, type SessionUser } from './auth';

/**
 * Gate for the whole /admin space and every admin server action.
 * Redirects non-admins away. Returns the admin SessionUser when authorized.
 * Call this at the top of admin layouts AND every mutating server action
 * (defense-in-depth: the layout is not a security boundary for actions).
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion?next=/admin');
  if (user.role !== 'ADMIN') redirect('/');
  return user;
}
