import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins/admin';
import { account, session, user, verification } from '@/lib/db/auth-schema';
import { db } from '@/lib/db/client';
import {
  assertAuthConfig,
  isAdminEmail,
  isAllowedEmail,
} from '@/lib/auth/allowlist';

assertAuthConfig();

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (process.env.NODE_ENV === 'production' && (!googleClientId || !googleClientSecret)) {
  console.warn(
    '[auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are missing. Google sign-in will not work.'
  );
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            prompt: 'select_account',
          },
        }
      : {},
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
    // Deliberately no cookie cache: `role`, `banned`, and the allowlist are
    // re-read on every request. With a handful of accounts the extra query is
    // free, and it removes a window where a revoked or newly promoted account
    // would keep acting on stale session data.
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          if (!isAllowedEmail(newUser.email)) {
            throw new APIError('FORBIDDEN', {
              message: 'This account is not authorized to use Maison.',
            });
          }

          return {
            data: {
              ...newUser,
              role: isAdminEmail(newUser.email) ? 'admin' : 'user',
            },
          };
        },
      },
    },
  },
  plugins: [
    admin({
      adminRoles: ['admin'],
      defaultRole: 'user',
      impersonationSessionDuration: 60 * 60,
    }),
    // Must stay last so Server Actions and Route Handlers set cookies.
    nextCookies(),
  ],
});
