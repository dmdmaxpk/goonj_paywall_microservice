const express = require('express');
const router = express.Router();
const channelViewsCountController = require('../controllers/channelViewsCountController')


router.route('/')
    .post(channelViewsCountController.post)
    .get(channelViewsCountController.get);


module.exports = router;
