const express = require('express');
const router = express.Router();

// Service Label
router.get('/', (req, res) => res.send("User Microservice"));

router.use('/user',    require('./userRoutes'));
router.use('/package',    require('./packageRoutes'));
router.use('/otp',    require('./otpRoutes'));

router.use('/balance',    require('./balanceCheckRoute'));

// Payment routes
router.use('/payment',    require('./paymentRoute'));

router.use('/cron',    require('./cron'));

module.exports = router;