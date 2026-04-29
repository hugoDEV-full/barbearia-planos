const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/transacaoController');
const { authenticate } = require('../middleware/auth');

router.get('/', ctrl.list);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
