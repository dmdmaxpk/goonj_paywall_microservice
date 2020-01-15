const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController')


router.route('/graylist/:msisdn')
    .get(userController.isgraylisted);

module.exports = router;
