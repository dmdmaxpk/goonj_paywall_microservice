let jwt = require('jsonwebtoken');
const config = require('../config.js');

authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if(token == null){
      return res.sendStatus(401);
  }

  jwt.verify(token, config.ACCESS_TOKEN_SECRET, (err, decodedUser) => {
      if(err) return res.sendStatus(403);
      req.decoded = decodedUser;
      next();
  });
}


generateAccessToken = (msisdn) => {
  const accessToken = jwt.sign({msisdn: msisdn}, config.ACCESS_TOKEN_SECRET, {expiresIn: '2m'});
  return accessToken;
}

getRefreshToken = (msisdn) => {
  const token = jwt.sign({msisdn: msisdn}, config.REFRESH_TOKEN_SECRET);
  return token;
}

module.exports = {
  authenticateToken: authenticateToken,
  generateAccessToken: generateAccessToken,
  getRefreshToken: getRefreshToken
}