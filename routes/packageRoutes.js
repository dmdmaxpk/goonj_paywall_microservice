const express = require('express');
const router = express.Router();
const controller = require('../controllers/packageController');
const authMiddleWare = require('../middlewares/auth.middleware');


router.route('/')
    .get(controller.get)
    .post(controller.post)
    .get(controller.getAll);

// Update on the basis of user id
router.route('/:id')
    .put(controller.put)

module.exports = router;
