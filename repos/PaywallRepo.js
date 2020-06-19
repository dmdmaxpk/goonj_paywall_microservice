const mongoose = require('mongoose');
const Paywall = mongoose.model('Paywall');

class PaywallRepository {
    constructor({packageRepository}){
        this.packageRepository = packageRepository;
        console.log("Paywall Repository");
    }

    async getAllPaywalls(){
        let paywalls = await Paywall.find({active: true});
        return paywalls;
    }

    async getPaywallById(paywall_id){
        if (paywallId) {
            let paywall = await Paywall.findOne({active: true,_id: paywall_id });
            return paywall;
        } else {
            return undefined;
        }
    }

    async getPaywallsBySlug(slug){
        if (slug) {
            console.log("slug",slug);
            let paywall = await Paywall.findOne({active: true,slug: slug });
            console.log("paywall",paywall);
            return paywall;
        } else {
            return undefined;
        }
    }

    async getPaywallsAndPackages() {
        try {
            let paywalls = await this.getAllPaywalls();

            for(let i = 0; i < paywalls.length; i++){
                let packages = await this.packageRepository.getAllPackages({paywall_id: paywalls[i]._id});
                paywalls[i].packages = packages;
            }
            return paywalls;
        } catch(err){
            throw err;
        }
    }

}


module.exports = PaywallRepository;