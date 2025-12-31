import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './app/db/schema.ts',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.EPHEMERA_DB_HOST!,
    port: Number(process.env.EPHEMERA_DB_PORT!),
    user: process.env.EPHEMERA_DB_USER!,
    password: process.env.EPHEMERA_DB_PASSWORD!,
    database: process.env.EPHEMERA_DB_NAME!,
  },
});