// routes/users.routes.js
const express = require("express");
const router = express.Router();
const prisma = require("../models/prismaClient");
const jwtMiddleware = require("../middlewares/jwtMiddleware");

// ✅ NEW: GET /users/me
router.get("/me", jwtMiddleware.verifyToken, async (req, res) => {
  try {
    // depends on your jwtMiddleware:
    // common patterns: req.user, res.locals.user, or req.locals
    const userId =
      req.user?.id ??
      res.locals.user?.id ??
      res.locals.id;

    if (!userId) return res.status(401).json({ error: "Unauthenticated" });

    const me = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        // if you add team later: team: true
      },
    });

    if (!me) return res.status(404).json({ error: "User not found" });
    res.json(me);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// existing GET /users?role=CSA ...
router.get("/", jwtMiddleware.verifyToken, async (req, res) => {
  try {
    const { role } = req.query;

    const where = {};
    if (role) where.role = role;

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });

    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list users" });
  }
});

module.exports = router;
