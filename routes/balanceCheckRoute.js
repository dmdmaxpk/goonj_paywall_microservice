const express = require('express');
const router = express.Router();
const controller = require('../controllers/balanceCheckController');

// 
router.route('/check/:msisdn')
    .get(controller.get);

module.exports = router;
