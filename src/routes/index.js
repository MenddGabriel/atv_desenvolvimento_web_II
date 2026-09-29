const express = require('express');
const router = express.Router();

router.use('/usuarios', require('./usuariosRoutes'));
router.use('/empresas', require('./empresasRoutes'));
router.use('/espacos', require('./espacosRoutes.js'));

module.exports = router;