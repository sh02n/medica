const prisma = require('./prismaClient');
const { computeHealthAndDrivers, computeFatigue } = require('../services/healthScore.service');

async function listCustomers({ search, risk, fatigue, segment, ownerId }) {
  const where = {};

  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (segment) where.segment = segment;
  if (ownerId) where.ownerId = Number(ownerId);

  // Fetch with events so we can compute score/fatigue
  const customers = await prisma.customer.findMany({
    where,
    include: {
      owner: true,
      events: true,
    },
    orderBy: { id: 'asc' },
  });

  const computed = customers.map(c => {
    const health = computeHealthAndDrivers(c.events);
    const fat = computeFatigue(c.events);
    return {
      id: c.id,
      name: c.name,
      segment: c.segment,
      tier: c.tier,
      owner: { id: c.owner.id, name: c.owner.name },
      ...health,
      ...fat,
    };
  });

  // Apply computed filters (risk/fatigue)
  let filtered = computed;
  if (risk) filtered = filtered.filter(c => c.riskLabel === risk);
  if (fatigue) filtered = filtered.filter(c => c.fatigueRisk === fatigue);

  // default sort: lowest health first
  filtered.sort((a, b) => a.healthScore - b.healthScore);

  return filtered;
}

async function getCustomerDetail(customerId) {
  const c = await prisma.customer.findUnique({
    where: { id: Number(customerId) },
    include: {
      owner: true,
      events: { orderBy: { occurredAt: 'desc' } },
      actions: { orderBy: { dueDate: 'asc' }, include: { owner: true } },
    },
  });

  if (!c) return null;

  const health = computeHealthAndDrivers(c.events);
  const fat = computeFatigue(c.events);

  return {
    id: c.id,
    name: c.name,
    segment: c.segment,
    tier: c.tier,
    owner: { id: c.owner.id, name: c.owner.name },
    ...health,
    ...fat,
    events: c.events,
    actions: c.actions.map(a => ({
      ...a,
      owner: { id: a.owner.id, name: a.owner.name },
    })),
  };
}

module.exports = { listCustomers, getCustomerDetail };
