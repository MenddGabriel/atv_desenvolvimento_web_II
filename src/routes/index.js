const express = require('express');
const router = express.Router();

router.use('/usuarios', require('./usuariosRoutes'));
router.use('/empresas', require('./empresasRoutes'));

module.exports = router;