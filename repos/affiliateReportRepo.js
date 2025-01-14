const mongoose = require('mongoose');
const container = require("../configurations/container")
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
var nodemailer = require('nodemailer');
var usersRepo = container.resolve("userRepository");
const config = require("../config");
const axios = require('axios');

const pageViews = require('../controllers/PageViews');

var transporter = nodemailer.createTransport({
    host: "mail.dmdmax.com.pk",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'reports@goonj.pk', // generated ethereal user
      pass: 'YiVmeCPtzJn39Mu' // generated ethereal password
    }
});

function getCurrentDate(){
    var dateObj = new Date();
    var month = dateObj.getMonth() + 1; //months from 1-12
    var day = dateObj.getDate();
    var year = dateObj.getFullYear();
    let newdate = day + "-" + month + "-" + year;
    return newdate;
}

let currentDate = null;
currentDate = getCurrentDate();

let gdnReportF = currentDate+"_affiliate_gdn_report.csv";
let gdnReportFilePath = `./${gdnReportF}`;

let keys = ["gdn", "1569", "goonj", "aff3"];

let headers = [];
for(let i = 0; i < keys.length; i++){
    headers.push({title: keys[i].toUpperCase(), id: keys[i]});
}

const csvReportWriter = createCsvWriter({
    path: gdnReportFilePath,
    header: headers
});

gdnReport = async(from , to) => {
    /*let rows = ["HE", "Unique Success HE", "Page Views", "Subscription Click", "Subsscriptions", "Trial", "Daily", "Weekly"];
    let csvData = [];

    for(let j = 0; j < rows.length; j++){
        let singleRow = {};
        singleRow.
        for(let k = 0; k < keys.length; k++){
            let heLogs = pageViews.getHeLogs(keys[k], from, to);
        }   
    }

    
    axios({
        method: 'post',
        url: config.logger_url + 'report/affiliate_page',
        Content_Type: "application/json"
    }).then(async (responsegdnReport) => {
        let response = responsegdnReport.data;
        let trials = await usersRepo.gdnTrial();
        let paidUsers = await usersRepo.gdnPaidUsers();
        trials.forEach(element => {
		console.log("prod debug",element);
            response['result'][element['dateFormat']]['trialsActivated'] = element['count'];
        });
        paidUsers.forEach(element => {
            response['result'][element['dateFormat']]['usersBilled'] = element['count'];
        });
        let toWrite = [];
        Object.keys(response['result']).forEach(element => {
            toWrite.push(response['result'][element]);
        });
        csvReportWriter.writeRecords(toWrite).then(async (data) => {
            console.log("data",data);
            let sendersList = [];
            if (isManual) {
                sendersList = ["paywall@dmdmax.com.pk","hamza@dmdmax.com.pk"];
            }  else {
                sendersList = ["paywall@dmdmax.com.pk","usama@dmdmax.com.pk"];
            }
            var info = await transporter.sendMail({
                from: 'paywall@dmdmax.com.pk', // sender address
                // to:  ["hamza@dmdmax.com"],
                to: sendersList , // list of receivers
                subject: `GDN Affiliate Report`, // Subject line
                text: `GDN Funnel - ${(new Date()).toDateString()}`, // plain text bodyday
                attachments:[
                    {
                        filename: gdnReportF,
                        path: gdnReportFilePath
                    }
                ]
            });
            fs.unlink(gdnReportFilePath,function(err,data) {
                if (err) {
                    console.log("File not deleted");
                }
                console.log("data");
            });
        }).catch(err => {
            console.error(err);
        })
    }).catch(function(err){
        console.log(err);
    })
    console.log("2");*/
}


module.exports = {
    gdnReport: gdnReport,
}
