const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/syncController');

router.get('/', authenticate, ctrl.sync);

module.exports = router;
