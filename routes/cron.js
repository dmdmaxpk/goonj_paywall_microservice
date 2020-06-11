const express = require('express');
const router = express.Router();
const controller = require('../controllers/cron');
const migrationService = require('../services/SubscriberToSubscriptionMigration');

//

router.route('/markRenewableUsers')
    .get(controller.markRenewableUsers);

router.route('/subscriptionRenewal')
    .get(controller.subscriptionRenewal);

// router.route('/postPSLUserMigration')
//     .get(controller.postPSLUserMigration);

// router.route('/postPSLPOnlyUserMigration')
//     .get(controller.postPSLOnlyUserMigration);

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

router.route('/migrate')
    .get(migrationService.execute);

module.exports = router;
