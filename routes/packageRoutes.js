const express = require('express');
const router = express.Router();
const controller = require('../controllers/packageController')


router.route('/')
    .post(controller.post)
    .get(controller.get);

// Update on the basis of user id
router.route('/:id')
    .put(controller.put)
    .delete(controller.delete);

module.exports = router;
