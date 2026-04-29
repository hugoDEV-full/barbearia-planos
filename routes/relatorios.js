const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/relatorioController');
const { authenticate } = require('../middleware/auth');

router.get('/dashboard', authenticate, ctrl.dashboard);
router.get('/comissoes', authenticate, ctrl.comissoes);
router.get('/ocupacao', authenticate, ctrl.ocupacao);
router.get('/evolucao-mensal', authenticate, ctrl.evolucaoMensal);

module.exports = router;
