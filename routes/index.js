const express = require('express');
const router = express.Router();

// Service Label
router.get('/', (req, res) => res.send("User Microservice"));

router.use('/auth', require('./authRoutes'));

router.use('/user',    require('./userRoutes'));
router.use('/package',    require('./packageRoutes'));
router.use('/otp',    require('./otpRoutes'));

// Payment routes
router.use('/payment',    require('./paymentRoute'));

router.use('/report',    require('./reports'));

router.use('/cron',    require('./cron'));

router.use('/paywall',    require('./paywall'));

router.use('/goonj',    require('./systemUser'));

router.use('/ccd',    require('./ccd'));

router.use('/billing-producer',    require('./billingProducerRoutes'));

module.exports = router;