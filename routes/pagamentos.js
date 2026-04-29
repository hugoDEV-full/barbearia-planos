const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pagamentoController');
const { authenticate } = require('../middleware/auth');

router.post('/pix', authenticate, ctrl.criarPix);
router.post('/preferencia', authenticate, ctrl.criarPreferencia);
router.get('/status/:cobranca_id', authenticate, ctrl.verificarStatus);
router.post('/webhook', ctrl.webhook);
router.post('/confirmar/:cobranca_id', authenticate, ctrl.confirmarSimulacao);
router.get('/simular-cartao/:cobranca_id', ctrl.simularCartao);

module.exports = router;
