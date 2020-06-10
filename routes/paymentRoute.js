const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentController');
const authMiddleWare = require('../middlewares/auth.middleware');

router.route('/otp/send')
    .post(authMiddleWare.checkToken, controller.sendOtp);

router.route('/otp/verify')
    .post(authMiddleWare.checkToken, controller.verifyOtp);

router.route('/subscribe')
    .post(authMiddleWare.checkToken, controller.subscribe);

router.route('/unsubscribe')
    .post(authMiddleWare.checkToken, controller.unsubscribe);

router.route('/status')
    .post(authMiddleWare.checkToken, controller.status);

router.route('/recharge')
    .post(authMiddleWare.checkToken, controller.recharge);

router.route('/delete')
    .get(authMiddleWare.checkToken, controller.delete);

module.exports = router;
