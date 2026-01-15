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

async function getCustomerHealthHistory(customerId, days = 14) {
  const c = await prisma.customer.findUnique({
    where: { id: Number(customerId) },
    include: { events: true }
  });
  if (!c) return null;

  // Build daily snapshots: for each day, compute health score using events up to that date.
  const now = new Date();
  const points = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    date.setHours(23, 59, 59, 999);

    const eventsUpToThatDay = c.events.filter(e => new Date(e.occurredAt) <= date);
    const health = computeHealthAndDrivers(eventsUpToThatDay);

    points.push({
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString(),
      score: health.healthScore
    });
  }

  // Momentum vs 7 days ago (or earliest available)
  const last = points[points.length - 1]?.score ?? 0;
  const idx7 = Math.max(points.length - 1 - 7, 0);
  const prev7 = points[idx7]?.score ?? last;
  const delta = last - prev7;

  let direction = "Stable";
  if (delta >= 5) direction = "Improving";
  else if (delta <= -5) direction = "Declining";

  return { points, delta, direction };
}

module.exports = { listCustomers, getCustomerDetail, getCustomerHealthHistory };
