const express = require('express');
const router = express.Router();
const controller = require('../controllers/cron')

// 
router.route('/subscriptionRenewal')
    .get(controller.subscriptionRenewal);

router.route('/postPSLUserMigration')
    .get(controller.postPSLUserMigration);

router.route('/tokenRefresh')
    .get(controller.refreshToken);

router.route('/tpsCountReset')
    .get(controller.tpsCountReset);

router.route('/dailyAmoutReset')
    .get(controller.dailyAmoutReset);

router.route('/checkLastSeenOfUsers')
    .get(controller.checkLastSeenOfUsers);

router.route('/grayListService')
    .get(controller.grayListService);

router.route('/generateDailyReport')
    .get(controller.generateDailyReport);

router.route('/hourlyBillingReport')
    .get(controller.hourlyBillingReport);

module.exports = router;
