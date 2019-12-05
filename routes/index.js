const express = require('express');
const router = express.Router();

// Service Label
router.get('/', (req, res) => res.send("User Microservice"));

router.use('/user',    require('./userRoutes'));
router.use('/package',    require('./packageRoutes'));

module.exports = router;