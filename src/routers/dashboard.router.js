const express = require("express");
const router = express.Router();
const jwtMiddleware = require("../middlewares/jwtMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");
const { getDashboardSummary, getHealthTrend } = require("../models/Dashboard.model");

router.get("/summary", jwtMiddleware.verifyToken, requireRole("CSM"), async (req, res) => {
  try {
    const summary = await getDashboardSummary();
    res.json(summary);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

router.get("/health-trend", jwtMiddleware.verifyToken, requireRole("CSM"), async (req, res) => {
  try {
    const days = Math.max(1, Math.min(60, Number(req.query.days || 14))); // clamp
    const trend = await getHealthTrend(days);
    res.json(trend);
  } catch (e) {
    console.error("health-trend error:", e);
    res.status(500).json({ error: "Failed to load health trend" });
  }
});

module.exports = router;
