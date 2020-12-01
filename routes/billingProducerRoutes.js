const express = require('express');
const router = express.Router();
const controller = require('../controllers/billingProducerController');


router.route('/getPackage').get(controller.getPackage);
router.route('/getRenewableSubscriptions').get(controller.getOnlyRenewableSubscriptions);
router.route('/updateAllSubscription').post(controller.updateAllSubscriptions);

module.exports = router;
