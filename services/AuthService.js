const container = require('../configurations/container');
const repo = container.resolve("authRepository");

const authMiddleWare = require('../middlewares/auth.middleware');

generateAccessToken = (msisdn) => {
    let accessToken = authMiddleWare.generateAccessToken(msisdn);
    repo.createOrUpdate({msisdn: msisdn, auth_token: accessToken});
    return accessToken;
}

module.exports = {
    generateAccessToken: generateAccessToken
}