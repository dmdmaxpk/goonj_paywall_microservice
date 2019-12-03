const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topicController')


router.route('/')
    .get(topicController.get)
    .post(topicController.post)
    .put(topicController.put)
    .delete(topicController.delete);


module.exports = router;
