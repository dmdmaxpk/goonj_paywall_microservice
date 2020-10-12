let jwt = require('jsonwebtoken');
const config = require('../config.js');

authenticateToken = (req, res, next) => {
  console.log("HEADERS", JSON.stringify(req.headers));
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  console.log("TOKEN:", token);
  if(token === null){
      return res.send({code: 401, message: "Un-Authorized"});
  }

  jwt.verify(token, config.ACCESS_TOKEN_SECRET, (err, decodedUser) => {
      if(err){
        return res.send({code: 403, message: "Forbidden"});
      }
      req.decoded = decodedUser;
      next();
  });
}

authenticateCcdToken = (req, res, next) => {
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
}

authenticateHardToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if(token == null){
      return res.sendStatus(401);
  }

  if(config.HARD_TOKEN === token){
    next();
  }else{
    return res.sendStatus(403);
  }
}

generateAccessToken = (msisdn) => {
  const accessToken = jwt.sign({msisdn: msisdn}, config.ACCESS_TOKEN_SECRET, {expiresIn: '30s'});
  return accessToken;
}

getRefreshToken = (msisdn) => {
  const token = jwt.sign({msisdn: msisdn}, config.REFRESH_TOKEN_SECRET);
  return token;
}

module.exports = {
  authenticateToken: authenticateToken,
  generateAccessToken: generateAccessToken,
  getRefreshToken: getRefreshToken,
  authenticateHardToken: authenticateHardToken,
  authenticateCcdToken: authenticateCcdToken
}