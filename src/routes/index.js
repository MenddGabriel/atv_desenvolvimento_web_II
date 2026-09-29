const express = require('express');
const router = express.Router();

router.use('/usuarios', require('./usuariosRoutes'));
// depois: router.use('/empresas', require('./empresasRoutes'));

module.exports = router;