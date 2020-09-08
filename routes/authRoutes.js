const express = require('express');
const router = express.Router();

const controller = require('../controllers/authController');

const authMiddleWare = require('../middlewares/auth.middleware');

router.post('/token')
    .get(authMiddleWare.authenticateToken, controller.token);

router.post('/refresh')
    .post(authMiddleWare.authenticateToken, controller.refresh);

router.delete('/delete')
    .get(authMiddleWare.authenticateToken, controller.delete);

module.exports = router;
