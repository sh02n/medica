const prisma = require('./prismaClient');
const { computeHealthAndDrivers, computeFatigue } = require('../services/healthScore.service');

// helper: YYYY-MM-DD
function toYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function getHealthTrend(days = 14) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  // Pull events for customers within the window
  const customers = await prisma.customer.findMany({
    include: {
      events: {
        where: { createdAt: { gte: start } }, // adjust field name if yours differs
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Map day -> list of health scores for that day
  const map = new Map(); // dateStr -> number[]
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    map.set(toYMD(d), []);
  }

  // For each day, we compute each customer's health from events up to that day (simple approach)
  // If your computeHealth needs all-time events, remove the filter above and compute using all events.
  for (let i = 0; i < days; i++) {
    const dayEnd = new Date(start);
    dayEnd.setDate(start.getDate() + i);
    dayEnd.setHours(23, 59, 59, 999);

    const dateKey = toYMD(dayEnd);

    for (const c of customers) {
      // events up to dayEnd
      const eventsUpToDay = (c.events || []).filter(e => new Date(e.createdAt) <= dayEnd);
      const { healthScore } = computeHealthAndDrivers(eventsUpToDay);
      map.get(dateKey).push(Number(healthScore || 0));
    }
  }

  // Convert to avg per day
  const result = [];
  for (const [date, arr] of map.entries()) {
    const avg =
      arr.length === 0 ? 0 : Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
    result.push({ date, avgHealthScore: avg });
  }

  return result;
}

async function getDashboardSummary() {
  const customers = await prisma.customer.findMany({
    include: { events: true, owner: true },
  });

  const computedCustomers = customers.map(c => {
    const health = computeHealthAndDrivers(c.events);
    const fat = computeFatigue(c.events);

    return {
      id: c.id,
      name: c.name,
      segment: c.segment,
      ownerId: c.ownerId,
      owner: c.owner,

      // computed
      healthScore: health.healthScore,
      riskLabel: health.riskLabel,
      drivers: health.drivers,

      fatigueRisk: fat.fatigueRisk,
      touches7d: fat.touches7d,
      lastActivityDate: fat.lastActivityDate, // if your computeFatigue returns this
    };
  });

  const riskCounts = computedCustomers.reduce((acc, c) => {
    acc[c.riskLabel] = (acc[c.riskLabel] || 0) + 1;
    return acc;
  }, {});

  const fatigueCounts = computedCustomers.reduce((acc, c) => {
    acc[c.fatigueRisk] = (acc[c.fatigueRisk] || 0) + 1;
    return acc;
  }, {});

  // Top drivers across all customers
  const driverCounts = {};
  for (const c of computedCustomers) {
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

  const dueCount = due.length;
  const overdueCount = overdue.length;

  const actionStatusCounts = actions.reduce(
    (acc, a) => {
      const status = String(a.status || "TODO").toUpperCase();

      if (status === "DONE") acc.DONE++;
      else if (status === "IN_PROGRESS") acc.IN_PROGRESS++;
      else acc.TODO++;

      // Overdue = not done + dueDate < now
      if (status !== "DONE" && a.dueDate && new Date(a.dueDate) < now) acc.OVERDUE++;

      return acc;
    },
    { TODO: 0, IN_PROGRESS: 0, DONE: 0, OVERDUE: 0 }
  );

  const customersByOwner = new Map(); // ownerId -> { owner, customers: [], atRisk: number }

  for (const c of computedCustomers) {
    const ownerId = c.owner?.id || c.ownerId;
    if (!ownerId) continue;

    if (!customersByOwner.has(ownerId)) {
      customersByOwner.set(ownerId, {
        ownerId,
        ownerName: c.owner?.name || "Unknown",
        customers: 0,
        atRisk: 0,
      });
    }

    const row = customersByOwner.get(ownerId);
    row.customers += 1;
    if (String(c.riskLabel || "").toLowerCase().includes("at")) row.atRisk += 1;
  }

  const actionsByOwner = new Map(); // ownerId -> { activeActions, overdue }

  for (const a of actions) {
    const ownerId = a.owner?.id || a.ownerId;
    if (!ownerId) continue;

    if (!actionsByOwner.has(ownerId)) {
      actionsByOwner.set(ownerId, { activeActions: 0, overdue: 0 });
    }

    const isDone = String(a.status || "").toUpperCase() === "DONE";
    const isActive = !isDone; // TODO + IN_PROGRESS, and any other non-DONE
    const isOverdue = isActive && a.dueDate && new Date(a.dueDate) < now;

    const row = actionsByOwner.get(ownerId);
    if (isActive) row.activeActions += 1;
    if (isOverdue) row.overdue += 1;
  }

  // 3) Merge into final workload rows
  const teamWorkload = [];
  const ownerIds = new Set([
    ...customersByOwner.keys(),
    ...actionsByOwner.keys(),
  ]);

  for (const ownerId of ownerIds) {
    const cRow = customersByOwner.get(ownerId) || {
      ownerId,
      ownerName: "Unknown",
      customers: 0,
      atRisk: 0,
    };

    const aRow = actionsByOwner.get(ownerId) || {
      activeActions: 0,
      overdue: 0,
    };

    teamWorkload.push({
      owner: cRow.ownerName,
      customers: cRow.customers,
      atRisk: cRow.atRisk,
      activeActions: aRow.activeActions,
      overdue: aRow.overdue,
    });
  }

  // sort: most overdue first, then most at-risk, then most customers
  teamWorkload.sort((x, y) =>
    (y.overdue - x.overdue) ||
    (y.atRisk - x.atRisk) ||
    (y.customers - x.customers)
  );

  // ✅ Top At-Risk Customers (show 5 lowest healthScore in At-Risk)
  const topAtRisk = computedCustomers
    .filter(c => c.riskLabel === "At-Risk")
    .sort((a, b) => (a.healthScore ?? 999) - (b.healthScore ?? 999))
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      name: c.name,
      healthScore: c.healthScore,
      segment: c.segment,
      owner: c.owner ? { id: c.owner.id, name: c.owner.name } : null
    }));

    // ------------------------------
  // Action Effectiveness (by type)
  // ------------------------------
  const SUCCESS_OUTCOMES = new Set([
    "IMPROVED",
    "ISSUE_RESOLVED",
  ]);

  const effectivenessMap = new Map(); // type -> { type, completed, improved }

  for (const a of actions) {
    const type = String(a.type || "UNKNOWN").toUpperCase();
    const status = String(a.status || "TODO").toUpperCase();

    if (!effectivenessMap.has(type)) {
      effectivenessMap.set(type, { type, completed: 0, improved: 0 });
    }

    // only count DONE actions for effectiveness
    if (status === "DONE") {
      const row = effectivenessMap.get(type);
      row.completed += 1;

      const outcome = String(a.outcome || "").toUpperCase();
      if (SUCCESS_OUTCOMES.has(outcome)) row.improved += 1;
    }
  }

  // Convert to array + sort (most completed first)
  const effectiveness = Array.from(effectivenessMap.values())
    .filter(r => r.completed > 0)   // optional: hide types with 0 done
    .sort((a, b) => b.completed - a.completed);

 // customers needing attention today
const overdueCustomerIds = new Set(
  overdue.map(a => a.customerId).filter(Boolean)
);

const attentionToday = computedCustomers
  .filter(c => {
    const isAtRisk =
      String(c.riskLabel || "").trim().toLowerCase() === "at-risk" ||
      String(c.riskLabel || "").trim().toLowerCase() === "at risk";
    const isHighFatigue = String(c.fatigueRisk || "").toLowerCase() === "high";
    return isAtRisk || isHighFatigue;
  })
  .sort((a, b) => (a.healthScore ?? 999) - (b.healthScore ?? 999))
  .slice(0, 8)
  .map(c => ({
    id: c.id,
    name: c.name,
    segment: c.segment,
    healthScore: c.healthScore,
    riskLabel: c.riskLabel,
    fatigueRisk: c.fatigueRisk,
    owner: c.owner ? { id: c.owner.id, name: c.owner.name } : null,
  }));

  return {
    riskCounts,
    fatigueCounts,
    topDrivers,

    dueCount,
    overdueCount,
    due: due.slice(0, 20),
    overdue: overdue.slice(0, 20),

    topAtRisk,
    actionStatusCounts,
    teamWorkload,
    effectiveness,
    attentionToday,            
    attentionTodayCount: attentionToday.length, 
  };

}

module.exports = { getHealthTrend, getDashboardSummary };
