const express = require('express');
const router = express.Router();
const controller = require('../controllers/packageController');
const authMiddelware = require('../middlewares/auth.middleware');


router.route('/')
    .post(controller.post)
    .get(authMiddelware.checkToken,controller.getAll);

// Update on the basis of user id
router.route('/:id')
    .put(controller.put)

module.exports = router;
