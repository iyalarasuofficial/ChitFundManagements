// Database configuration with Prisma 7 and pg adapter
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { parse } from 'pg-connection-string';
import 'dotenv/config';

// Verify DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

// Parse the DATABASE_URL to properly handle URL-encoded passwords
const config = parse(process.env.DATABASE_URL);

if (!config.password) {
  throw new Error('Database password is missing from DATABASE_URL');
}

const pool = new Pool({
  host: config.host || 'db.vdqnkmqsvtohwluckmze.supabase.co',
  port: config.port ? parseInt(config.port) : 5432,
  database: config.database ?? undefined,
  user: config.user ?? undefined,
  password: config.password, // This will be properly decoded from URL encoding
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });