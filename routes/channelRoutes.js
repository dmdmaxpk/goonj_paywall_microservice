const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');


router.route('/')
    .get(channelController.get)
    .post(channelController.post)
    .put(channelController.put)
    .delete(channelController.delete);

    
module.exports = router;
