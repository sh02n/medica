const prisma = require("./prismaClient");

module.exports.addActionNote = async function addActionNote(actionId, authorId, note) {
  return prisma.actionNote.create({
    data: {
      actionId: Number(actionId),
      authorId: Number(authorId),
      note,
    },
  });
};

module.exports.getNotesForAction = async function getNotesForAction(actionId) {
  return prisma.actionNote.findMany({
    where: { actionId: Number(actionId) },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, role: true } },
    },
  });
};
