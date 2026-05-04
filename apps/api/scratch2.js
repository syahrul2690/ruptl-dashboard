const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const projects = await prisma.project.findMany({ select: {
    id: true, lat: true, lng: true, status: true,
    type: true, subtype: true, issueType: true,
    name: true, island: true, province: true, urgencyCategory: true,
    lineFromId: true, lineToId: true,
  }});
  console.log(JSON.stringify(projects, null, 2));
}
main().finally(() => prisma.$disconnect());
