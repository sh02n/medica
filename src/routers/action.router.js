const express = require('express');
const router = express.Router();
const { listActionsByCustomer, createAction, updateAction } = require('../models/Action.model');
const jwtMiddleware = require('../middlewares/jwtMiddleware');

router.get('/customers/:id/actions', jwtMiddleware.verifyToken, async (req, res) => {
  try {
    const actions = await listActionsByCustomer(req.params.id);
    res.json(actions);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to list actions' });
  }
});

router.post('/customers/:id/actions', jwtMiddleware.verifyToken, async (req, res) => {
  try {
    const ownerId = req.user?.id; // depends on your jwtMiddleware setting req.user
    const { type, dueDate, priority, status, notes } = req.body;

    if (!ownerId) return res.status(401).json({ error: 'Unauthenticated' });
    if (!type || !dueDate) return res.status(400).json({ error: 'type and dueDate are required' });

    const created = await createAction(req.params.id, ownerId, { type, dueDate, priority, status, notes });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create action' });
  }
});

router.patch('/actions/:id', jwtMiddleware.verifyToken, async (req, res) => {
  try {
    const { status, outcome } = req.body;

    if (status === 'DONE' && !outcome) {
      return res.status(400).json({ error: 'outcome is required when marking DONE' });
    }

    const updated = await updateAction(req.params.id, req.body);
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update action' });
  }
});

module.exports = router;
