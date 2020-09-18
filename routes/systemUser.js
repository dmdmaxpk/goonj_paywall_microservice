const express = require('express');
const router = express.Router();
const controller = require('../controllers/systemUserController');
const authMiddleWare = require('../middlewares/auth.middleware');
const aclMiddleWare = require('../middlewares/acl.middleware');

router.route('/login')
    .post( controller.login);

router.route('/unsubscribe')
    .post(controller.unsubscribe);

module.exports = router;
