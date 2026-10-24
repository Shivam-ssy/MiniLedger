import { PrismaClient, LoanStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const phone = '+919876543210';

  // Create or retrieve demo user
  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: {
      phone,
    },
  });

  // Clear existing seed loans for this user to ensure idempotency
  await prisma.loan.deleteMany({
    where: { userId: user.id },
  });

  const now = new Date();

  // Due in 7 days (Pending, not overdue)
  const futureDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7));

  // Due 3 days ago (Pending, overdue)
  const pastDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 3));

  // Due 10 days ago (Repaid)
  const repaidDueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 10));
  const repaidAtDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 5));

  await prisma.loan.createMany({
    data: [
      {
        userId: user.id,
        friendName: 'Rahul Sharma',
        amount: 500000, // ₹5,000.00
        dueDate: futureDate,
        status: LoanStatus.PENDING,
      },
      {
        userId: user.id,
        friendName: 'Priya Patel',
        amount: 250000, // ₹2,500.00
        dueDate: pastDate,
        status: LoanStatus.PENDING,
      },
      {
        userId: user.id,
        friendName: 'Amit Verma',
        amount: 100000, // ₹1,000.00
        dueDate: repaidDueDate,
        status: LoanStatus.REPAID,
        repaidAt: repaidAtDate,
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log(`Seed data populated successfully for user ${phone} (User ID: ${user.id})`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('Seed script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
