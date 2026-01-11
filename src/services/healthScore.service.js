const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(a, b) {
  return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
}

function isOutreach(type) {
  return type === 'OUTREACH_EMAIL' || type === 'OUTREACH_CALL';
}

// MVP rules (simple + explainable)
function computeHealthAndDrivers(events) {
  const now = new Date();
  let score = 100;
  const drivers = [];

  // Last activity (ACTIVITY or POSITIVE)
  const activityEvents = events
    .filter(e => e.type === 'ACTIVITY' || e.type === 'POSITIVE')
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));

  const lastActivity = activityEvents[0]?.occurredAt ? new Date(activityEvents[0].occurredAt) : null;

  if (!lastActivity) {
    score -= 30;
    drivers.push({ text: 'No recorded activity', impact: 30 });
  } else {
    const inactivityDays = daysBetween(now, lastActivity);
    if (inactivityDays >= 21) {
      score -= 25;
      drivers.push({ text: `No activity for ${inactivityDays} days`, impact: 25 });
    } else if (inactivityDays >= 14) {
      score -= 15;
      drivers.push({ text: `Low activity: ${inactivityDays} days since last activity`, impact: 15 });
    } else if (inactivityDays >= 7) {
      score -= 8;
      drivers.push({ text: `Reduced activity: ${inactivityDays} days`, impact: 8 });
    } else {
      score += 2; // small bonus
    }
  }

  // Open tickets count (ticket opened not resolved)
  const ticketOpened = events.filter(e => e.type === 'TICKET_OPENED').length;
  const ticketResolved = events.filter(e => e.type === 'TICKET_RESOLVED').length;
  const openTickets = Math.max(ticketOpened - ticketResolved, 0);

  if (openTickets > 0) {
    const penalty = Math.min(10 + openTickets * 5, 25);
    score -= penalty;
    drivers.push({ text: `${openTickets} unresolved support ticket(s)`, impact: penalty });
  }

  // Complaints / unsubscribe
  const complaints = events.filter(e => e.type === 'COMPLAINT').length;
  if (complaints > 0) {
    const penalty = Math.min(15 + complaints * 5, 30);
    score -= penalty;
    drivers.push({ text: `${complaints} complaint(s) recorded`, impact: penalty });
  }

  const unsubs = events.filter(e => e.type === 'UNSUBSCRIBE').length;
  if (unsubs > 0) {
    score -= 30;
    drivers.push({ text: 'Unsubscribe / opt-out signal recorded', impact: 30 });
  }

  // Recent positive event bonus (last 7 days)
  const positives7d = events.filter(e => e.type === 'POSITIVE' && daysBetween(now, new Date(e.occurredAt)) <= 7).length;
  if (positives7d > 0) {
    const bonus = Math.min(10, positives7d * 4);
    score += bonus;
    drivers.push({ text: `Recent positive activity (${positives7d} event(s))`, impact: -bonus });
  }

  // clamp
  score = Math.max(0, Math.min(100, score));

  // risk label
  let riskLabel = 'Healthy';
  if (score <= 39) riskLabel = 'At-Risk';
  else if (score <= 69) riskLabel = 'Watch';

  // top 3 drivers (highest impact first; negative impact = bonus)
  const topDrivers = drivers
    .filter(d => d.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
    .map(d => d.text);

  return {
    healthScore: score,
    riskLabel,
    lastActivityDate: lastActivity,
    drivers: topDrivers,
  };
}

function computeFatigue(events) {
  const now = new Date();

  const touches7d = events.filter(e =>
    isOutreach(e.type) && daysBetween(now, new Date(e.occurredAt)) <= 7
  ).length;

  const complaintOrUnsub = events.some(e => e.type === 'COMPLAINT' || e.type === 'UNSUBSCRIBE');

  let fatigueRisk = 'Low';
  if (touches7d >= 5) fatigueRisk = 'High';
  else if (touches7d >= 3) fatigueRisk = 'Medium';

  // bump if complaint/unsub exists
  if (complaintOrUnsub && fatigueRisk === 'Low') fatigueRisk = 'Medium';
  if (complaintOrUnsub && fatigueRisk === 'Medium' && touches7d >= 3) fatigueRisk = 'High';

  return { fatigueRisk, touches7d };
}

module.exports = { computeHealthAndDrivers, computeFatigue };
