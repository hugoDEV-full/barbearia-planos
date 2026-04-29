const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/corteUsadoController');
const { authenticate } = require('../middleware/auth');

router.get('/', ctrl.list);
router.post('/', authenticate, ctrl.create);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
