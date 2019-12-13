const mongoose = require('mongoose');
const Package = mongoose.model('Package');

createPackage = async(postData) => {
    let package = new Package (postData);
    let result = await package.save();
    return result;
}

getPackage = async(query) => {
    query.active = true;
	result = await Package.find(query);
	return result;
}

updatePackage = async(id, postData) => {
    const query = { _id: id };
    postBody.last_modified = new Date();
    
    const result = await Package.updateOne(query, postData);
    if (result.nModified === 0) {
        return undefined;
    }else{
        let package = await getPackage(msisdn);
        return package;
    }
}

deletePackage = async(id) => {
    const result = await Package.deleteOne({_id: id});
    return result;
}

module.exports = {
    createPackage: createPackage,
    getPackage: getPackage,
    updatePackage: updatePackage,
    deletePackage: deletePackage
}