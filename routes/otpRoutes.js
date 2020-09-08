const express = require('express');
const router = express.Router();
const controller = require('../controllers/otpController')
const authMiddleWare = require('../middlewares/auth.middleware');

router.route('/')
    .post(authMiddleWare.authenticateToken, controller.post)
    .get(authMiddleWare.authenticateToken, controller.get);

// Update on the basis of user msisdn
router.route('/:msisdn')
    .put(authMiddleWare.authenticateToken, controller.put)

module.exports = router;
