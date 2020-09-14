const container = require("../configurations/container");
const repo = container.resolve("authRepository");

const authService = require('../services/AuthService');

const jwt = require("jsonwebtoken");
const config = require("../config");

exports.refresh = async (req, res) => {
    const refreshToken = req.body.token;
    if (refreshToken == null) {
        return res.sendStatus(401);
    }
    let token = await repo.getByAuthToken(refreshToken);
    if (!token) {
        return res.sendStatus(403);
    }

    jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) {
            console.log(err);
            return res.sendStatus(403);
        }

        const at = authService.generateAccessToken(user.msisdn);
        const rt = authService.generateRefreshToken(user.msisdn);

        res.json({
            access_token: at,
            refresh_token: rt
        });
    });
}

exports.token = async (req, res) => {
    const accessToken = authService.generateAccessToken(req.body.msisdn);
    const refreshToken = authService.generateRefreshToken(req.body.msisdn);
    res.send({access_token: accessToken, refresh_token: refreshToken});
}

exports.delete = async (req, res) => {

}