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
            let paywall = await Paywall.findOne({active: true,slug: slug });
            return paywall;
        } else {
            return undefined;
        }
    }

    async getPaywallsAndPackages() {
        try {
            let packages = await this.packageRepository.getAllPackages({});
            let paywalls = await this.getAllPaywalls();
            let resultsPaywall = [];
            paywalls.forEach(element => {
                let temp = JSON.parse(JSON.stringify(element) );
                let filtered_packages = packages.filter(p => {
                    return p.paywall_id === element._id;
                });
                temp.packages = filtered_packages;
                console.log("temp",temp);
                resultsPaywall.push(temp);
            });
            return resultsPaywall;
        } catch(err){
            throw err;
        }
    }

}


module.exports = PaywallRepository;