const express = require('express');
const router = express.Router();
const { listCustomers, getCustomerDetail, getCustomerHealthHistory, createCustomer, updateCustomer, updateCustomerOwner } = require('../models/Customer.model');
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.get("/", jwtMiddleware.verifyToken, async (req, res) => {
  try {
    const { search, risk, fatigue, segment } = req.query;

    // 1) normalize role/id safely
    const role = String(res.locals.role ?? req.user?.role ?? "").toUpperCase();
    const userIdRaw = res.locals.id ?? req.user?.id;
    const userId = Number(userIdRaw);

    // 2) normalize ownerId from query
    let ownerId;
    if (req.query.ownerId !== undefined && req.query.ownerId !== null && req.query.ownerId !== "") {
      const parsed = Number(req.query.ownerId);
      ownerId = Number.isFinite(parsed) ? parsed : undefined;
    }

    // 3) CSA always forced to own customers
    if (role === "CSA") {
      ownerId = Number.isFinite(userId) ? userId : undefined;
    }

    // ✅ TEMP DEBUG (remove after you confirm)
    console.log("[/customers] role=", role, "userId=", userId, "ownerId=", ownerId);

    const customers = await listCustomers({
      search,
      risk,
      fatigue,
      segment,
      ownerId, // pass number or undefined
    });

    res.json(customers);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list customers" });
  }
});


router.get('/:id', jwtMiddleware.verifyToken, async (req, res) => {
  try {
    const customer = await getCustomerDetail(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

router.get('/:id/health-history', jwtMiddleware.verifyToken, async (req, res) => {
  try {
    const days = Number(req.query.days || 14);
    const hist = await getCustomerHealthHistory(req.params.id, days);
    if (!hist) return res.status(404).json({ error: 'Customer not found' });
    res.json(hist);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get health history' });
  }
});

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!allowed.includes(res.locals.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

router.post(
  "/",
  jwtMiddleware.verifyToken,
  requireRole("CSM", "Admin"),
  async (req, res) => {
    try {
      const { name, ownerId, segment } = req.body;

      if (!name || !ownerId || !segment) {
        return res.status(400).json({ error: "name, segment, ownerId required" });
      }

      const customer = await createCustomer(req.body);
      res.status(201).json(customer);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create customer" });
    }
  }
);

router.patch(
  "/:id/owner",
  jwtMiddleware.verifyToken,
  requireRole("CSM", "Admin"),
  async (req, res) => {
    try {
      const { ownerId } = req.body;
      if (!ownerId) {
        return res.status(400).json({ error: "ownerId required" });
      }

      const updated = await updateCustomerOwner(req.params.id, ownerId);
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to reassign owner" });
    }
  }
);

router.patch(
  "/:id",
  jwtMiddleware.verifyToken,
  requireRole("CSM", "Admin"),
  async (req, res) => {
    try {
      const updated = await updateCustomer(req.params.id, req.body);
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update customer" });
    }
  }
);

module.exports = router;
