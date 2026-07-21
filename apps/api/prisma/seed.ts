import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.workspace.deleteMany();

  await prisma.workspace.create({
    data: {
      name: 'Demo Workspace',
      boards: {
        create: {
          title: 'Product Development',
          position: 0,
          columns: {
            create: [
              { title: 'Backlog', position: 0 },
              { title: 'In Progress', position: 1 },
              { title: 'Done', position: 2 },
            ],
          },
        },
      },
    },
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });