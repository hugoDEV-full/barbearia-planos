const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/movimentacaoController');
const { authenticate } = require('../middleware/auth');

router.get('/', ctrl.list);
router.post('/', authenticate, ctrl.create);

module.exports = router;
