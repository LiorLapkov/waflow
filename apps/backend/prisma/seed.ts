import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

/**
 * Creates the first administrator using ADMIN_USERNAME / ADMIN_PASSWORD.
 * Idempotent: skips when the user already exists.
 */
async function main(): Promise<void> {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error('Missing required env vars: ADMIN_USERNAME, ADMIN_PASSWORD');
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      console.log(`Admin "${username}" already exists — skipping.`);
      return;
    }
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await prisma.user.create({
      data: { username, passwordHash, role: UserRole.admin },
    });
    console.log(`Admin "${username}" created.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
