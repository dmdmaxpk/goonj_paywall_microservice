const express = require('express');
const router = express.Router();

const controller = require('../controllers/authController');

const authMiddleWare = require('../middlewares/auth.middleware');

router.route('/he/token')
    .post(authMiddleWare.authenticateHardToken, controller.token);

router.route('/refresh')
    .post(authMiddleWare.authenticateToken, controller.refresh);

router.route('/delete')
    .delete(authMiddleWare.authenticateToken, controller.delete);

module.exports = router;
