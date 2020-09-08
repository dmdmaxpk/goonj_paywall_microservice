const container = require("../configurations/container");
const repo = container.resolve("authRepository");

const jwt = require("jsonwebtoken");


exports.token = async (req,res) =>  {
    const refreshToken = req.body.token;
    if(refreshToken == null){
        return res.sendStatus(401);
    }

    let token = await repo.getByAuthToken(refreshToken);
    if(!token){
        return res.sendStatus(403);
    }

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if(err){
            return res.sendStatus(403);
        }

        console.log(user);
        const accessToken = generateAccessToken({user_id: user.user_id, msisdn: user.msisdn});
        res.json({access_token: accessToken});
    });
}

exports.refresh = async (req,res) =>  {

}

exports.delete = async (req,res) =>  {
    
}

exports.getToken = (user) => {

}

generateAccessToken = (user) => {

}

