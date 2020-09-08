const express = require('express');
const router = express.Router();

const controller = require('../controllers/authController');

const authMiddleWare = require('../middlewares/auth.middleware');

router.route('/token')
    .get(authMiddleWare.checkToken, controller.paymentSources);

router.route('/refresh')
    .post(authMiddleWare.checkToken, controller.sendOtp);

router.route('/delete')
    .get(authMiddleWare.checkToken, controller.delete);

module.exports = router;
