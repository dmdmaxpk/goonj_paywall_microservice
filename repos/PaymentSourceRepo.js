const mongoose = require('mongoose');
const PaymentSource = mongoose.model('PaymentSource');

class PaymentSourceRepo {
    constructor({}){
        
    }

    async getSources() {
        let result = await PaymentSource.find({active:true});
        return result;
    }
}


module.exports = PaymentSourceRepo;