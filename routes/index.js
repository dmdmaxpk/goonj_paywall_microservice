const express = require('express');
const router = express.Router();

// Service Label
router.get('/', (req, res) => res.send("User Microservice"));

/*router.use('/video',    require('./videoRoutes'));
router.use('/category', require('./categoryRoutes'));
router.use('/program',  require('./programRoutes'));
router.use('/anchor',   require('./anchorRoutes'));
router.use('/guest',    require('./guestRoutes'));
router.use('/topic',    require('./topicRoutes'));
router.use('/channel',  require('./channelRoutes'));

// For Views
router.use('/videoViews',  require('./videoViewsCountRoutes'));
router.use('/channelViews',  require('./channelViewsCountRoutes'));*/

module.exports = router;