const prisma = require('./prismaClient');

async function listEvents(customerId) {
  return prisma.engagementEvent.findMany({
    where: { customerId: Number(customerId) },
    orderBy: { occurredAt: 'desc' },
  });
}

async function createEvent(customerId, data) {
  return prisma.engagementEvent.create({
    data: {
      customerId: Number(customerId),
      type: data.type,
      occurredAt: new Date(data.occurredAt),
      notes: data.notes || null,
    },
  });
}

module.exports = { listEvents, createEvent };
