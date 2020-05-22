const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportConrtoller')




// Update on the basis of user msisdn
router.route('/gdn')
    .post(controller.gdn_report)

module.exports = router;
