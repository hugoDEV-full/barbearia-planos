const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pagamentoController');
const { authenticate } = require('../middleware/auth');

router.post('/pix', authenticate, ctrl.criarPix);
router.post('/preferencia', authenticate, ctrl.criarPreferencia);
router.get('/status/:cobranca_id', authenticate, ctrl.verificarStatus);
router.post('/webhook', ctrl.webhook);

module.exports = router;
