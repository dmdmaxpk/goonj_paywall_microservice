const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController')


router.route('/')
    .get(videoController.get)
    .post(videoController.post)
    .put(videoController.put)
    .delete(videoController.delete);


module.exports = router;
