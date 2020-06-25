const container = require("../configurations/container");
const paywallService = container.resolve("paywallService");

exports.getAllPaywalls = async (req,res) =>  {
    try {
        let result = await paywallService.getAllPackagesAndPaywalls();
        res.status(200).json({data: result});
    } catch(err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}

