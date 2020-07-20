const express = require('express');
const router = express.Router();
const controller = require('../controllers/EasypaisaAccountController');
const authMiddleWare = require('../middlewares/auth.middleware');

router.route('/easypaisa/opt/:msisdn')
    .post(authMiddleWare.checkToken, controller.bootOptScript);

router.route('/easypaisa/opt/:opt/charge/:msisdn/transaction-mount/:amount')
    .post(authMiddleWare.checkToken, controller.bootTransactionScript);

module.exports = router;
