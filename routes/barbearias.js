const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/barbeariaController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.post('/', authenticate, requireAdmin, ctrl.create);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.put('/:id', authenticate, requireAdmin, ctrl.update);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

module.exports = router;
