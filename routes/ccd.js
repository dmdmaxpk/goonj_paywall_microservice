const express = require('express');
const router = express.Router();
const authMiddleWare = require('../middlewares/auth.middleware');
const aclMiddleWare = require('../middlewares/acl.middleware');

const subscriptionController = require('../controllers/SubscriptionController');
const systemUserController = require('../controllers/systemUserController');

router.route('/details').get(authMiddleWare.checkToken,aclMiddleWare.checkRole,
    subscriptionController.getSubscriptionDetails);

router.route('/goonj/unsubscribe').post(authMiddleWare.checkToken,aclMiddleWare.checkRole,
    systemUserController.unsubscribe);

router.route('/goonj/login').post(systemUserController.login);
    

module.exports = router;