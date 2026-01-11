const express = require('express');
const router = express.Router();
const { listCustomers, getCustomerDetail } = require('../models/Customer.model');
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.get("/", jwtMiddleware.verifyToken, async (req, res) => {
  try {
    const { search, risk, fatigue, segment, ownerId } = req.query;
    const customers = await listCustomers({ search, risk, fatigue, segment, ownerId });
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


module.exports = router;
