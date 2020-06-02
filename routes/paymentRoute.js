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
    .get(authMiddleWare.checkToken, controller.fetchStatus);

router.route('/delete')
    .get(authMiddleWare.checkToken, controller.delete);

module.exports = router;
