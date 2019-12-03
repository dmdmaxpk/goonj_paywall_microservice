const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guestController');


router.route('/')
    .get(guestController.get)
    .post(guestController.post)
    .put(guestController.put)
    .delete(guestController.delete);

    
module.exports = router;
