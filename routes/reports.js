const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportConrtoller')




// Update on the basis of user msisdn
router.route('/gdn')
    .post(controller.gdn_report)

router.route('/rev')
    .get(controller.rev_report)

router.route('/req-count')
    .get(controller.req_count)

module.exports = router;
