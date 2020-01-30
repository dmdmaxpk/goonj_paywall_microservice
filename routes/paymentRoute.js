const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentController')


router.route('/otp/send')
    .post(controller.sendOtp);

router.route('/otp/verify')
    .post(controller.verifyOtp);

router.route('/subscribe')
    .post(controller.subscribe);

router.route('/unsubscribe')
    .post(controller.unsubscribe);

router.route('/status')
    .post(controller.status);

// TESTING
router.route('/bulksms')
    .get(controller.sendBulkMessage);

router.route('/bulksub')
    .get(controller.sendBulkSub);

router.route('/bill/directly')
    .get(controller.subscribeDirectly);

module.exports = router;
