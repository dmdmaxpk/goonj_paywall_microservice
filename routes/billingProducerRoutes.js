const express = require('express');
const router = express.Router();
const controller = require('../controllers/billingProducerController');

router.route('/createToken')
    .post(controller.createToken);

router.route('/getToken')
    .get(controller.getToken);

router.route('/updateToken')
    .post(controller.updateToken);

router.route('/createBillingHistory')
    .post(controller.createBillingHistory);

router.route('/getUserById')
    .get(controller.getUserById);

router.route('/getSubscriber')
    .get(controller.getSubscriber);

router.route('/getSubscription')
    .get(controller.getSubscription);

router.route('/getRenewableSubscriptions')
    .get(controller.getRenewableSubscriptions);

router.route('/updateSubscription')
    .post(controller.updateSubscription);

router.route('/updateAllSubscription')
    .post(controller.updateAllSubscriptions);

router.route('/getPackage')
    .post(controller.getPackage);


module.exports = router;
