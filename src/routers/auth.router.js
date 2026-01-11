const express = require('express');
const studentModel = require('../models/User.model');
const bcryptMiddleware = require('../middlewares/bcryptMiddleware');
const jwtMiddleware = require('../middlewares/jwtMiddleware');
const validation = require('../validation/validationFn');
const router = express.Router();

router.post('/login', studentModel.login, bcryptMiddleware.comparePassword, jwtMiddleware.generateToken, jwtMiddleware.sendToken);
router.post('/register', validation.validateRegister, bcryptMiddleware.hashPassword, studentModel.register);
module.exports = router;
