const express = require('express');
const router = express.Router();
const controller = require('../controllers/otpController')


router.route('/')
    .post(controller.post)
    .get(controller.get);

// Update on the basis of user msisdn
router.route('/:msisdn')
    .put(controller.put)

module.exports = router;
