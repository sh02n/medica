const prisma = require('../src/models/prismaClient');
const bcrypt = require('bcrypt');

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  // --- Users (CSA/CSM)
  const usersRaw = [
    { name: 'Alice CSA', email: 'alice.csa@example.com', password: '1234', role: 'CSA' },
    { name: 'Ben CSA', email: 'ben.csa@example.com', password: '1234', role: 'CSA' },
    { name: 'Mia CSM', email: 'mia.csm@example.com', password: '1234', role: 'CSM' },
  ];

  const users = [];
  for (const u of usersRaw) {
    const hashed = await bcrypt.hash(u.password, 10);
    users.push({ ...u, password: hashed });
  }

  // Clean insert (optional: wipe tables)
  await prisma.actionItem.deleteMany();
  await prisma.engagementEvent.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  const insertedUsers = await Promise.all(
    users.map(u => prisma.user.create({ data: u }))
  );

  const csas = insertedUsers.filter(u => u.role === 'CSA');

  // --- Customers
  const segments = ['SMB', 'Mid-Market', 'Enterprise'];
  const tiers = ['Standard', 'Pro', 'VIP'];

  const customerData = Array.from({ length: 20 }).map((_, i) => {
    const owner = pick(csas);
    return {
      name: `Customer ${i + 1}`,
      segment: pick(segments),
      tier: pick(tiers),
      ownerId: owner.id,
    };
  });

  const customers = await Promise.all(
    customerData.map(c => prisma.customer.create({ data: c }))
  );

  // --- Events
  const eventTypes = [
    'ACTIVITY',
    'POSITIVE',
    'TICKET_OPENED',
    'TICKET_RESOLVED',
    'COMPLAINT',
    'OUTREACH_EMAIL',
    'OUTREACH_CALL',
  ];

  const eventsToCreate = [];
  for (const c of customers) {
    const numEvents = randInt(6, 18);

    for (let j = 0; j < numEvents; j++) {
      const type = pick(eventTypes);
      const occurredAt = daysAgo(randInt(0, 40));
      eventsToCreate.push({
        customerId: c.id,
        type,
        occurredAt,
        notes: `${type} event`,
      });
    }
  }

  // Force a few “high fatigue” customers
  const highFatigueCustomer = customers[0];
  for (let k = 0; k < 6; k++) {
    eventsToCreate.push({
      customerId: highFatigueCustomer.id,
      type: pick(['OUTREACH_EMAIL', 'OUTREACH_CALL']),
      occurredAt: daysAgo(randInt(0, 6)),
      notes: 'Extra outreach for fatigue demo',
    });
  }

  await prisma.engagementEvent.createMany({ data: eventsToCreate });

  // --- Actions
  const actionTypes = ['CALL', 'EMAIL', 'OFFER_DISCOUNT', 'RESOLVE_TICKET', 'ESCALATE'];

  const actionsToCreate = [];
  for (const c of customers) {
    const owner = pick(csas);

    const numActions = randInt(1, 4);
    for (let a = 0; a < numActions; a++) {
      const dueInDays = randInt(-5, 10); // negative -> overdue
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueInDays);

      actionsToCreate.push({
        customerId: c.id,
        ownerId: owner.id,
        type: pick(actionTypes),
        dueDate,
        priority: pick([1, 2, 2, 3]),
        status: pick(['TODO', 'IN_PROGRESS', 'TODO']),
        notes: 'Follow-up action',
      });
    }
  }

  await prisma.actionItem.createMany({ data: actionsToCreate });

  console.log('✅ Seed completed');
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
