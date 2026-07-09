const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.users.findMany();
  const profiles = await prisma.profiles.findMany();
  console.log("USERS:", users);
  console.log("PROFILES:", profiles);
  process.exit(0);
}

check();
