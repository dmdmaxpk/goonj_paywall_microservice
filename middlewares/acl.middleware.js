let jwt = require('jsonwebtoken');
const config = require('../config.js');
const acl = require('../configurations/acl');
const container = require('../configurations/container');
const systemUserRepository = container.resolve('systemUserRepository');

let checkRole = async (req, res, next) => {
  let user_type = req.decoded.type;
  if (user_type === 'system_user') {
    let user = await systemUserRepository.getUserById(req.decoded._id);
    let role = user.role;
    let allowed_routes = acl[role].allowed;
    let current_route_url = req.originalUrl;
    if (allowed_routes.indexOf(current_route_url) > -1) {
        next();
    } else {
        res.status(403).send("Access Denied")
    }
  } else {
    next();
  }
};

module.exports = {
    checkRole: checkRole
}