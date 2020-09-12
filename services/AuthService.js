const container = require('../configurations/container');
const repo = container.resolve("authRepository");

const authMiddleWare = require('../middlewares/auth.middleware');

generateAccessToken = (msisdn) => {
    let accessToken = authMiddleWare.generateAccessToken(msisdn);
    return accessToken;
}

generateRefreshToken = (msisdn) => {
    let refreshToken = authMiddleWare.getRefreshToken(msisdn);
    repo.createOrUpdate({msisdn: msisdn, auth_token: refreshToken});
    return refreshToken;
}

module.exports = {
    generateAccessToken: generateAccessToken,
    generateRefreshToken: generateRefreshToken
}