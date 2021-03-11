const express = require('express');
const router = express.Router();
const controller = require('../controllers/cron');
const migrationService = require('../services/SubscriberToSubscriptionMigration');

router.route('/markRenewableUsers')
    .get(controller.markRenewableUsers);

router.route('/markRenewableUserForcefully')
    .get(controller.markRenewableUserForcefully);

router.route('/subscriptionRenewal')
    .get(controller.subscriptionRenewal);

router.route('/rabbitMqMonitoring')
    .get(controller.rabbitMqMonitoring);

router.route('/tokenRefresh')
    .get(controller.refreshToken);

router.route('/purgeDueToInActivity')
    .get(controller.purgeDueToInActivity);

router.route('/addInBillingQueue')
    .get(controller.addInBillingQueue);

router.route('/tpsCountReset')
    .get(controller.tpsCountReset);

router.route('/dailyAmoutReset')
    .get(controller.dailyAmoutReset);

router.route('/checkLastSeenOfUsers')
    .get(controller.checkLastSeenOfUsers);

router.route('/grayListService')
    .get(controller.grayListService);

router.route('/generateWeeklyReport')
    .get(controller.generateWeeklyReports);    

router.route('/generateDailyReport')
    .get(controller.generateDailyReport);

router.route('/generateMonthlyReport')
    .get(controller.generateMonthlyReports);

router.route('/generateRandomReports')
    .get(controller.generateRandomReports);

router.route('/hourlyBillingReport')
    .get(controller.hourlyBillingReport);

router.route('/migrate')
    .get(migrationService.execute);

router.route('/removemsisdns')
    .get(controller.removeDuplicateMsisdns);

router.route('/preRenewalSubscriptions')
    .get(controller.preRenewalSubscriptions);

module.exports = router;
