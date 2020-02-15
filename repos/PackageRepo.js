const mongoose = require('mongoose');
const Package = mongoose.model('Package');

createPackage = async(postData) => {
    let package = new Package (postData);
    let result = await package.save();
    return result;
}

getPackage = async(query) => {
    query.active = true;
    let result = await Package.find(query);
    if(result && result.length == 1){
        return result[0];
    }
	return undefined;
}

getAllPackages = async(query) => {
    query.active = true;
    let result = await Package.find(query);
	return result;
}

updatePackage = async(id, postData) => {
    const query = { _id: id };
    postBody.last_modified = new Date();
    
    const result = await Package.updateOne(query, postData);
    if (result.nModified === 0) {
        return undefined;
    }else{
        let package = await getPackage({_id: id});
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
    getAllPackages: getAllPackages,
    updatePackage: updatePackage,
    deletePackage: deletePackage
}