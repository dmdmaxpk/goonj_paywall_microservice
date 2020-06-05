
class PaywallService {
    constructor({paywallRepository}){
        this.paywallRepository = paywallRepository;
    }

    async getAllPackagesAndPaywalls(){
        try {
            let paywallsAndPackages = await this.paywallRepository.getPaywallsAndPackages();
            return paywallsAndPackages;
        } catch(err){
            throw err;
        }
    }

    
    
}


module.exports = PaywallService;