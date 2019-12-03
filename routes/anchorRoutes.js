const express = require('express');
const router = express.Router();
const anchorController = require('../controllers/anchorController');


router.route('/')
    .get(anchorController.get)
    .post(anchorController.post)
    .put(anchorController.put)
    .delete(anchorController.delete);


module.exports = router;
