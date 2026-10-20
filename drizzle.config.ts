import { defineConfig } from 'drizzle-kit';

// drizzle-kit does not read .env.local on its own, so load it here. The app
// only needs DATABASE_URL, which lives in .env.local alongside the rest.
try {
  process.loadEnvFile('.env.local');
} catch {
  // No .env.local — fall back to whatever is already in the environment.
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
