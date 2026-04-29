const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, ctrl.list);
router.get('/me', authenticate, ctrl.me || ((req,res)=>res.json(req.user))); // me já está no auth
router.get('/:id', authenticate, ctrl.getOne);
router.post('/', authenticate, requireAdmin, ctrl.create);
router.put('/:id', authenticate, requireAdmin, ctrl.update);
router.put('/me/perfil', authenticate, ctrl.updateProfile);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

module.exports = router;
