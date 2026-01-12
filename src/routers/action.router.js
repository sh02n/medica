const express = require('express');
const router = express.Router();
const { listActionsByCustomer, createAction, updateAction } = require('../models/Action.model');
const ActionModel = require("../models/Action.model");
const ActionNoteModel = require("../models/ActionNote.model");

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
    const ownerId = res.locals.id; 
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


router.get("/actions/:id", jwtMiddleware.verifyToken, async (req, res, next) => {
  try {
    const actionId = Number(req.params.id);

    const action = await ActionModel.getActionDetail(actionId);
    if (!action) return res.status(404).json({ error: "Action not found" });

    // Optional security: only owner or manager can view
    // if (res.locals.role === "CSA" && action.ownerId !== res.locals.id) {
    //   return res.status(403).json({ error: "Forbidden" });
    // }

    res.json(action);
  } catch (err) {
    next(err);
  }
});

router.post("/actions/:id/notes", jwtMiddleware.verifyToken, async (req, res, next) => {
  try {
    const actionId = Number(req.params.id);
    const authorId = res.locals.id;
    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ error: "Note is required" });
    }

    const action = await ActionModel.getActionDetail(actionId);
    if (!action) return res.status(404).json({ error: "Action not found" });

    const created = await ActionNoteModel.addActionNote(actionId, authorId, note.trim());

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
