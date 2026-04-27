import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email    = process.env.ADMIN_EMAIL    || 'admin@pln.local';
  const password = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const name     = process.env.ADMIN_NAME     || 'Administrator';

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where:  { email },
    update: {},
    create: { email, passwordHash, name, role: Role.ADMIN },
  });

  console.log(`✔ Seeded admin: ${admin.email}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
