const express = require('express');
const router = express.Router();
const controller = require('../controllers/cron')

// 
router.route('/subscriptionRenewal')
    .get(controller.subscriptionRenewal);

router.route('/tokenRefresh')
    .get(controller.refreshToken);

router.route('/tpsCountReset')
    .get(controller.tpsCountReset);

router.route('/dailyAmoutReset')
    .get(controller.dailyAmoutReset);

router.route('/checkLastSeenOfUsers')
    .get(controller.dailyAmoutReset);

module.exports = router;
