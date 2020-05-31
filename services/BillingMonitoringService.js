const container = require('../configurations/container');
const billingHistoryRepo = container.resolve("billingHistoryRepository");
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    host: "mail.dmdmax.com.pk",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'reports@goonj.pk', // generated ethereal user
      pass: 'YiVmeCPtzJn39Mu' // generated ethereal password
    }
  });

billingInLastHour = async() => {
    try {
        let billingCountThisHour = await billingHistoryRepo.billingInLastHour();
        console.log('billingCountThisHour',billingCountThisHour);
        if(billingCountThisHour < 50){
            // Shoot an email
            var info = await transporter.sendMail({
                from: ['paywall@dmdmax.com.pk'], // sender address
                to:  ["paywall@dmdmax.com.pk"], // list of receivers
                subject: `Billing Count for this hour`, // Subject line
                text: `Number of billing and graced count for this hour(${new Date()}) is ${billingCountThisHour}. `, // plain text bodyday
            });
            console.log("[billingInLastHour][EmailSent][info]",info);
        }
    }catch(err) {
        console.log(err);
    }
}



module.exports = {
    billingInLastHour: billingInLastHour
}