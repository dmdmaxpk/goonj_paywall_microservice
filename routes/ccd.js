const express = require('express');
const router = express.Router();
const authMiddleWare = require('../middlewares/auth.middleware');
const aclMiddleWare = require('../middlewares/acl.middleware');
const subscriptionController = require('../controllers/SubscriptionController');

router.route('/details').get(authMiddleWare.authenticateToken, aclMiddleWare.checkRole,
    subscriptionController.getSubscriptionDetails);
    
module.exports = router;