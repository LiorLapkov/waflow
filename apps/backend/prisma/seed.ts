import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

/**
 * Создаёт первого администратора из ADMIN_USERNAME/ADMIN_PASSWORD.
 * Идемпотентно: если пользователь уже есть — ничего не делает.
 */
async function main(): Promise<void> {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error('Заданы не все переменные: ADMIN_USERNAME, ADMIN_PASSWORD');
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      console.log(`Админ "${username}" уже существует — пропускаем.`);
      return;
    }
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await prisma.user.create({
      data: { username, passwordHash, role: UserRole.admin },
    });
    console.log(`Создан администратор "${username}".`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
