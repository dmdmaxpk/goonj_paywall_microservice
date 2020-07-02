const express = require('express');
const router = express.Router();

const subscriptionController = require('../controllers/SubscriptionController');
router.route('/details').get(subscriptionController.getSubscriptionDetails);

module.exports = router;