const express = require('express');
const router = express.Router();
const { listEvents, createEvent } = require('../models/Event.model');
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.get('/customers/:id/events', jwtMiddleware.verifyToken, async (req, res) => {
  try {
    const events = await listEvents(req.params.id);
    res.json(events);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to list events' });
  }
});

router.post('/customers/:id/events', jwtMiddleware.verifyToken, async (req, res) => {
  try {
    const { type, occurredAt, notes } = req.body;

    if (!type || !occurredAt) {
      return res.status(400).json({ error: 'type and occurredAt are required' });
    }

    const created = await createEvent(req.params.id, { type, occurredAt, notes });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

module.exports = router;
