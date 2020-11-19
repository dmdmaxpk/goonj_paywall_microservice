const express = require('express');
const router = express.Router();
const controller = require('../controllers/billingProducerController');

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

router.route('/getPackage')
    .get(controller.getPackage);


module.exports = router;
