const express = require('express');
const router = express.Router();
const controller = require('../controllers/otpController')
const authMiddleWare = require('../middlewares/auth.middleware');

router.route('/')
    .post(authMiddleWare.checkToken, controller.post)
    .get(authMiddleWare.checkToken, controller.get);

// Update on the basis of user msisdn
router.route('/:msisdn')
    .put(authMiddleWare.checkToken, controller.put)

module.exports = router;
