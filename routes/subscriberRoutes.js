const express = require('express');
const router = express.Router();
const controller = require('../controllers/subscriberController')

// Update on the basis of subscriber msisdn
// router.route('/:msisdn')
//     .put(controller.put)
//     .get(controller.get);

router.route('/migrate')
    .get(controller.migrateSubs);

module.exports = router;
