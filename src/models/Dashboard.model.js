const prisma = require('./prismaClient');
const { computeHealthAndDrivers, computeFatigue } = require('../services/healthScore.service');

async function getDashboardSummary() {
  const customers = await prisma.customer.findMany({
    include: { events: true, owner: true },
  });

  const computed = customers.map(c => {
    const health = computeHealthAndDrivers(c.events);
    const fat = computeFatigue(c.events);
    return { ...health, ...fat };
  });

  const riskCounts = computed.reduce((acc, c) => {
    acc[c.riskLabel] = (acc[c.riskLabel] || 0) + 1;
    return acc;
  }, {});

  const fatigueCounts = computed.reduce((acc, c) => {
    acc[c.fatigueRisk] = (acc[c.fatigueRisk] || 0) + 1;
    return acc;
  }, {});

  // Top drivers across all customers
  const driverCounts = {};
  for (const c of computed) {
    for (const d of (c.drivers || [])) {
      driverCounts[d] = (driverCounts[d] || 0) + 1;
    }
  }

  const topDrivers = Object.entries(driverCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([driver, count]) => ({ driver, count }));

  // Actions due/overdue
  const now = new Date();
  const actions = await prisma.actionItem.findMany({
    include: { owner: true, customer: true },
    orderBy: { dueDate: 'asc' },
  });

  const due = actions.filter(a => a.status !== 'DONE' && a.dueDate >= now);
  const overdue = actions.filter(a => a.status !== 'DONE' && a.dueDate < now);

  return {
    riskCounts,
    fatigueCounts,
    topDrivers,
    due: due.slice(0, 20),
    overdue: overdue.slice(0, 20),
  };
}

module.exports = { getDashboardSummary };
