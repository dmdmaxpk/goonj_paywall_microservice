const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentController')


router.route('/otp/send')
    .post(controller.sendOtp);

router.route('/otp/verify')
    .post(controller.verifyOtp);

router.route('/subscribe')
    .post(controller.subscribe);

module.exports = router;
