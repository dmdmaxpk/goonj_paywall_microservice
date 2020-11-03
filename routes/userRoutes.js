const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController')


router.route('/graylist/:msisdn')
    .get(userController.isgraylisted);

router.route('/mark-black-listed')
    .post(userController.markBlackListed);

router.route('/update_package')
    .post(userController.update_subscribed_package_id);

module.exports = router;
