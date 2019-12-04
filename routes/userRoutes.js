const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController')


router.route('/')
    .post(userController.post)
    .get(userController.get);

// Update on the basis of user id
router.route('/:id')
    .put(userController.put)
    .delete(userController.delete);

module.exports = router;
