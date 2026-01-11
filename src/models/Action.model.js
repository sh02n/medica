const prisma = require('./prismaClient');

async function listActionsByCustomer(customerId) {
  return prisma.actionItem.findMany({
    where: { customerId: Number(customerId) },
    orderBy: { dueDate: 'asc' },
  });
}

async function createAction(customerId, ownerId, data) {
  return prisma.actionItem.create({
    data: {
      customerId: Number(customerId),
      ownerId: Number(ownerId),
      type: data.type,
      dueDate: new Date(data.dueDate),
      priority: Number(data.priority ?? 2),
      status: data.status ?? 'TODO',
      notes: data.notes || null,
    },
  });
}

async function updateAction(actionId, data) {
  const patch = {
    status: data.status,
    priority: data.priority !== undefined ? Number(data.priority) : undefined,
    notes: data.notes !== undefined ? data.notes : undefined,
  };

  // If DONE: require outcome
  if (data.status === 'DONE') {
    patch.outcome = data.outcome;
    patch.nextStep = data.nextStep || null;
    patch.completedAt = new Date();
  }

  // Remove undefined keys (Prisma doesn’t like them in some setups)
  Object.keys(patch).forEach(k => patch[k] === undefined && delete patch[k]);

  return prisma.actionItem.update({
    where: { id: Number(actionId) },
    data: patch,
  });
}

module.exports = { listActionsByCustomer, createAction, updateAction };
