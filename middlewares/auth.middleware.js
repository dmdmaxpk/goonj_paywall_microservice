let jwt = require('jsonwebtoken');
const config = require('../config.js');

authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if(token == null){
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
  authenticateHardToken: authenticateHardToken
}