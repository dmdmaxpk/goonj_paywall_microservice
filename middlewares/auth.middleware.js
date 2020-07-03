let jwt = require('jsonwebtoken');
const config = require('../config.js');

let checkToken = (req, res, next) => {
  let token = req.headers['x-access-token'] || req.headers['authorization']; // Express headers are auto converted to lowercase
  if (!token) {
    next();
    return;
  }
  if (token.startsWith('Bearer ')) {
    // Remove Bearer from string
    token = token.slice(7, token.length);
  }

  if (token) {
    jwt.verify(token, config.secret, (err, decoded) => {
      if (err) {
        return res.json({
          code: config.codes.code_auth_failed,
          message: 'Authentication Failed'
        });
      } else {
        console.log("decoded",decoded);

        req.decoded = decoded;
        next();
      }
    });
  } else {
    return res.json({
      code: config.codes.code_auth_token_not_supplied,
      message: 'Auth token is not supplied'
    });
  }
};

module.exports = {
  checkToken: checkToken
}