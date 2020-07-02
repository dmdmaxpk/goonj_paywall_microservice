const express = require('express');
const router = express.Router();
const controller = require('../controllers/systemUserController');
const authMiddleWare = require('../middlewares/auth.middleware');

router.route('/login')
    .post( controller.login);

router.route('/unsubscribe')
    .post(authMiddleWare.checkToken, controller.unsubscribe);

module.exports = router;
