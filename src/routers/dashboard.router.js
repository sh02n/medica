const express = require('express');
const router = express.Router();
const jwtMiddleware = require('../middlewares/jwtMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const { getDashboardSummary } = require('../models/Dashboard.model');

router.get('/summary', jwtMiddleware.verifyToken, requireRole('CSM'), async (req, res) => {
  try {
    const summary = await getDashboardSummary();
    res.json(summary);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;
