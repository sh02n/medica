const prisma = require("./prismaClient");

async function listActionsByCustomer(customerId) {
  return prisma.actionItem.findMany({
    where: { customerId: Number(customerId) },
    orderBy: { dueDate: "asc" },
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
      status: data.status ?? "TODO",
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

  if (data.status === "DONE") {
    patch.outcome = data.outcome;
    patch.nextStep = data.nextStep || null;
    patch.completedAt = new Date();
  }

  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

  return prisma.actionItem.update({
    where: { id: Number(actionId) },
    data: patch,
  });
}

async function getActionDetail(actionId) {
  return prisma.actionItem.findUnique({
    where: { id: Number(actionId) },
    include: {
      customer: { select: { id: true, name: true, segment: true, tier: true } },
      owner: { select: { id: true, name: true, role: true } },
      notesLog: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
    },
  });
}

module.exports = {
  listActionsByCustomer,
  createAction,
  updateAction,
  getActionDetail,
};
