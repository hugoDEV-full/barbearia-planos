const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/assinaturaController');
const { authenticate } = require('../middleware/auth');

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
