const express = require('express');
const router = express.Router();
const videoViewCountController = require('../controllers/videoViewsCountController')


router.route('/')
    .post(videoViewCountController.post)
    .get(videoViewCountController.get);


module.exports = router;
