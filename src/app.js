const express = require('express');
const createError = require('http-errors');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});


const customerRouter = require('./routers/customer.router');
const eventRouter = require('./routers/event.router');
const actionRouter = require('./routers/action.router');
const dashboardRouter = require('./routers/dashboard.router');
const authRouter = require('./routers/auth.router');

app.use('/auth', authRouter);
app.use('/customers', customerRouter);     // GET /customers, GET /customers/:id
app.use('/', eventRouter);                // /customers/:id/events
app.use('/', actionRouter);               // /customers/:id/actions, PATCH /actions/:id
app.use('/dashboard', dashboardRouter);   // /dashboard/summary

// 404
app.use((req, res, next) => {
  next(createError(404, `Unknown resource ${req.method} ${req.originalUrl}`));
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Server error'
  });
});

module.exports = app;
