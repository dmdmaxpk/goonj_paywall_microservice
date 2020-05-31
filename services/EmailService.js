const config = require("../config");
var nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: config.emailhost,
            port: config.emailPort,
            secure: config.emailSecure, // true for 465, false for other ports
            auth: {
              user: config.emailUsername, // generated ethereal user
              pass: config.emailPassword // generated ethereal password
            }
        });

    }
    
    async sendEmail(){
        return new Promise(async  (resolve,reject) => {
            try{
                let response = await this.transporter.sendMail({
                    from: 'paywall@dmdmax.com.pk',
                    to: "paywall@dmdmax.com.pk",
                    subject: "User Billing Exceeded",
                    text: `Subscription id ${subscription_id} has exceeded its billing limit. Please check on priority.`,
                });
                resolve(response);
            } catch(error) {
                console.error(error);
                reject(error);
            }
        }); 
    }
}

module.exports = EmailService;