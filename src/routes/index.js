const express = require('express');
const router = express.Router();

router.use('/usuarios', require('./usuariosRoutes'));
router.use('/empresas', require('./empresasRoutes'));
router.use('/espacos', require('./espacosRoutes'));
router.use('/disponibilidades', require('./disponibilidadesRoutes'));
router.use('/reservas', require('./reservasRoutes'));

module.exports = router;