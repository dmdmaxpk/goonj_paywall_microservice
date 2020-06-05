const express = require('express');
const router = express.Router();
const controller = require('../controllers/paywallController');
const authMiddleWare = require('../middlewares/auth.middleware');

router.route('/')
    .get( controller.getAllPaywalls);


module.exports = router;
