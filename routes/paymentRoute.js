const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentController');
const authMiddleWare = require('../middlewares/auth.middleware');

router.route('/sources')
    .get(authMiddleWare.authenticateToken, controller.paymentSources);

router.route('/otp/send').post(controller.sendOtp);

router.route('/delink') 
    .post(authMiddleWare.authenticateToken, controller.deLink);

router.route('/otp/verify').post(controller.verifyOtp);

router.route('/subscribe')
    .post(authMiddleWare.authenticateToken, controller.subscribe);

router.route('/unsubscribe')
    .post(authMiddleWare.authenticateToken, controller.unsubscribe);

router.route('/sms-unsub').post(controller.unsubscribe);

router.route('/ccd-unsubscribe')
    .post(authMiddleWare.authenticateCcdToken, controller.unsubscribe);

router.route('/status').post(controller.status);

router.route('/getAllSubs')
    .get(authMiddleWare.authenticateCcdToken, controller.getAllSubscriptions);

router.route('/recharge')
    .post(authMiddleWare.authenticateToken, controller.recharge);

router.route('/delete')
    .get(authMiddleWare.authenticateToken, controller.delete);

router.route('/linkTransaction')
    .post(authMiddleWare.authenticateToken, controller.linkTransaction);

module.exports = router;
