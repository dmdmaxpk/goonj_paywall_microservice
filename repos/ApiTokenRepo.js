const mongoose = require('mongoose');
const ApiToken = mongoose.model('ApiToken');

createToken = async(postData) => {
    let token = new ApiToken(postData);
    let result = await token.save();
    return result;
}

getToken = async() => {
    results = await ApiToken.find();
    if(results && results.length > 0){
        return results[0];
    }else{
        return undefined;
    }
}

updateToken = async(token) => {
    let postBody = {};
    postBody.token = token;
    postBody.last_modified = new Date();
    
    const result = await ApiToken.update(postBody);
    if (result.nModified === 0) {
        return undefined;
    }else{
        let tkn = await getToken(token);
        return tkn;
    }
}

module.exports = {
    createToken: createToken,
    getToken: getToken,
    updateToken: updateToken
}