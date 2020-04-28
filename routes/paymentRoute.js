const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentController');


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

router.route('/recharge')
    .post(controller.recharge);

// TESTING
router.route('/bulksms')
    .get(controller.sendBulkMessage);

router.route('/bulksub')
    .get(controller.sendBulkSub);

router.route('/bill/directly')
    .get(controller.subscribeDirectly);


// THIS IS ONLY ALLOWED FOR NAUMAN QA TO TEST, THESE SHOULD BE REMOVED ONCE QA IS OVER
// Todo: remove following route.
router.route('/fetchStatus')
    .get(controller.fetchStatus);

router.route('/delete')
    .get(controller.delete);

module.exports = router;
