let jwt = require('jsonwebtoken');
const config = require('../config.js');
const acl = require('../configurations/acl');
const container = require('../configurations/container');
const systemUserRepository = container.resolve('systemUserRepository');
var url = require('url');

let checkRole = async (req, res, next) => {
  if (req.decoded) {
    let user_type = req.decoded.type;
    if (user_type === 'system_user') {
      let user = await systemUserRepository.getUserById(req.decoded._id);
      let role = user.role;
      let allowed_routes = acl[role].allowed;
      console.log("originalUrl",url.parse(req.originalUrl).pathname);
      let current_route_url = url.parse(req.originalUrl).pathname;
      if (allowed_routes.indexOf(current_route_url) > -1) {
          next();
      } else {
          res.status(403).send("Access Denied")
      }
    } else {
      res.status(403).send("Access Denied")
    }
  } else {
    res.status(403).send("Access Denied")
  }
};

module.exports = {
    checkRole: checkRole
}