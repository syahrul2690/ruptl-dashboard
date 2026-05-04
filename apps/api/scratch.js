const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const projects = await prisma.project.findMany({ select: { name: true, lat: true, lng: true } });
  console.log(projects);
}
main().finally(() => prisma.$disconnect());
