const express = require('express');
const router = express.Router();
const controller = require('../controllers/subscriberController')


router.route('/')
    .post(controller.post)

// Update on the basis of subscriber msisdn
router.route('/:msisdn')
    .put(controller.put)
    .get(controller.get);

module.exports = router;
