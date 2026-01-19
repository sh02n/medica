const express = require('express');
const router = express.Router();
const { listCustomers, getCustomerDetail, getCustomerHealthHistory } = require('../models/Customer.model');
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.get("/", jwtMiddleware.verifyToken, async (req, res) => {
  try {
    const { search, risk, fatigue, segment } = req.query;

    const role = res.locals.role;
    const userId = res.locals.id;

    let ownerId = req.query.ownerId;

    if (role === "CSA") {  ownerId = userId;  }

    const customers = await listCustomers({ search, risk, fatigue, segment, ownerId});

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

module.exports = router;
