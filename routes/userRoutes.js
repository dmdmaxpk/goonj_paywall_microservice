const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController')


router.route('/graylist/:msisdn')
    .get(userController.isgraylisted);

router.route('/update_package')
    .post(userController.update_subscribed_package_id);

router.route('/')
    .put(userController.put);

router.route('/')
    .get(userController.get);

module.exports = router;
