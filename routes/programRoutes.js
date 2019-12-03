const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController')


router.route('/')
    .get(programController.get)
    .post(programController.post)
    .put(programController.put)
    .delete(programController.delete);

    
module.exports = router;
