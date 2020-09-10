const mongoose = require('mongoose');
const container = require("../configurations/container");
const Subscriber = mongoose.model('Subscriber');
const Subscription = mongoose.model('Subscription');
const BillingHistory = mongoose.model('BillingHistory');
const User = mongoose.model('User');

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const csvParser = require('csv-parser');

const billinghistoryRepo = container.resolve('billingHistoryRepository');
const subscriptionRepo = container.resolve('subscriptionRepository');

var nodemailer = require('nodemailer');
var usersRepo = container.resolve('userRepository');
var viewLogsRepo = require('../repos/ViewLogRepo');

var pageViews = require('../controllers/PageViews');
const SubscriberRepository = require('./SubscriberRepo');
const { resolve } = require('path');


let currentDate = null;
currentDate = getCurrentDate();

let paywallTotalBase = currentDate+"_PaywallTotalBase.csv";
let paywallTotalBaseFilePath = `./${paywallTotalBase}`;

let paywallExpiredBase = currentDate+"_PaywallExpiredBase.csv";
let paywallExpiredBaseFilePath = `./${paywallExpiredBase}`;

let paywallInActiveBase = currentDate+"_PaywallInActiveBase.csv";
let paywallInActiveBaseFilePath = `./${paywallInActiveBase}`;

let paywallRevFileName = currentDate+"_PaywallRevReport.csv";
let paywallRevFilePath = `./${paywallRevFileName}`;

let paywallUnsubReport = currentDate+"_UnsubReport.csv";
let paywallUnsubFilePath = `./${paywallUnsubReport}`;

let paywallChannelWiseUnsubReport = currentDate+"_ChannelWiseUnsub.csv";
let paywallChannelWiseUnsubReportFilePath = `./${paywallChannelWiseUnsubReport}`;

let paywallChannelWiseTrial = currentDate+"_ChannelWiseTrial.csv";
let paywallChannelWiseTrialFilePath = `./${paywallChannelWiseTrial}`;

let paywallErrorCountReport = currentDate+"_ErrorCountReport.csv";
let paywallErrorCountFilePath = `./${paywallErrorCountReport}`;

let paywallErrorCountReportBySource = currentDate+"_ErrorCountReportBySource.csv";
let paywallErrorCountBySourceFilePath = `./${paywallErrorCountReportBySource}`;

let paywallFullAndPartialChargedReport = currentDate+"_FullAndPartialCharged.csv";
let paywallFullAndPartialChargedReportFilePath = `./${paywallFullAndPartialChargedReport}`;

let paywallCallbackReport = currentDate+"_CallbackReport.csv";
let paywallCallbackFilePath = `./${paywallCallbackReport}`;

let paywallTrialToBilledUsers = currentDate+"_TrialToBilled.csv";
let paywallTrialToBilledUsersFilePath = `./${paywallTrialToBilledUsers}`;

let affiliatePvs = currentDate+"_AffiliatePageViews.csv";
let affiliatePvsFilePath = `./${affiliatePvs}`;

let dailyNetAdditionCsv = currentDate+"_DailyNetAdditions.csv";
let dailyNetAdditionFilePath = `./${dailyNetAdditionCsv}`;

let usersReportWithTrialAndBillingHistory = currentDate+"_UsersReportWithTrialAndBillingHistory.csv";
let usersReportWithTrialAndBillingHistoryFilePath = `./${usersReportWithTrialAndBillingHistory}`;


let randomReport = currentDate+"_RandomReport.csv";
let randomReportFilePath = `./${randomReport}`;

const csvWriter = createCsvWriter({
    path: paywallRevFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: 'newUser', title: 'Number Verified Users'},
        {id: 'newSubscriber', title: 'New Subscribers'},
        {id: 'totalSubscribers', title: 'Total Subscribers'},
        {id: 'trials', title: 'Trials Activated'},
        {id: 'tempTotalActiveSubscribers',title: 'Total Active Subscribers'},

        {id: 'liveOnlyCount', title: 'Live Daily'},
        {id: 'liveWeeklyCount', title: 'Live Weekly'},
        {id: 'comedyOnlyCount', title: 'Comedy Daily'},
        {id: 'comedyWeeklyCount', title: 'Comedy Weekly'},

        {id: 'liveOnlyRevenue', title: 'Live Daily Revenue'},
        {id: 'liveWeeklyRevenue', title: 'Live Weekly Revenue'},
        {id: 'comedyOnlyRevenue', title: 'Comedy Daily Revenue'},
        {id: 'comedyWeeklyRevenue', title: 'Comedy Weekly Revenue'},
        {id: 'totalRevenue',title: 'Total Revenue'}

    ]
});

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const dailyNetAdditionWriter = createCsvWriter({
    path: dailyNetAdditionFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: 'subs', title: 'Subscriptions'},
        {id: "unsubs",title: "Un-Subscriptions" },
        {id: "net",title: "Net Subscriptions" },
    ]
});

const csvReportWriter = createCsvWriter({
    path: paywallCallbackFilePath,
    header: [
        {id: 'tid', title: 'TID'},
        {id: 'mid', title: 'MID'},
        {id: "isValidUser",title: "Is Valid Telenor User" },
        {id: "isCallbAckSent",title: "IS CallBack Sent" },
        {id: 'added_dtm', title: 'User TIMESTAMP'},
        {id: 'callBackSentTime', title: 'TIMESTAMP'}
    ]
});

const csvTotalBase = createCsvWriter({
    path: paywallTotalBaseFilePath,
    header: [
        {id: 'msisdn', title: 'Msisdn'},
    ]
});

const csvExpiredBase = createCsvWriter({
    path: paywallExpiredBaseFilePath,
    header: [
        {id: 'msisdn', title: 'Msisdn'},
    ]
});

const csvInActiveBase = createCsvWriter({
    path: paywallInActiveBaseFilePath,
    header: [
        {id: 'msisdn', title: 'Msisdn'},
    ]
});

const csvFullAndPartialCharged = createCsvWriter({
    path: paywallFullAndPartialChargedReportFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: 'fully_charged_users', title: 'Fully Charged Users'},
        {id: "partially_charged_users",title: "Partially Charged Users" },
        {id: 'total', title: 'Total'}
    ]
});

const csvTrialToBilledUsers = createCsvWriter({
    path: paywallTrialToBilledUsersFilePath,
    header: [
        {id: 'trial_date', title: 'Trial Activation Date'},
        {id: 'billed_date', title: "Successfull Billing Date"},
        //{id: 'msisdn', title: 'List of MSISDNs'},
        {id: 'total', title: 'Total Count'}
    ]
});

const randomReportWriter = createCsvWriter({
    path: randomReportFilePath,
    header: [
        {id: 'msisdn', title: 'Msisdn'},
        {id: 'acquisition_source', title: 'Acquisition Source'},
        {id: 'acquisition_date', title: 'Acquisition Date'},
        {id: 'number_of_success_charging', title: 'No of time user successfully charged'},
        {id: "unsub_date",title: "Unsubscription Date" }
    ]
});

const csvAffiliatePvs = createCsvWriter({
    path: affiliatePvsFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: 'source',title: "Source"},
        {id: 'mid',title: "MID"},
        {id: 'count', title: "Page Views"},
    ]
});


const usersReportWithTrialAndBillingHistoryWriter = createCsvWriter({
    path: usersReportWithTrialAndBillingHistoryFilePath,
    header: [
        {id: 'mid', title: 'Mid'},
        {id: 'user_id',title: "Auto Generated Id"},
        {id: 'code',title: "Code"},
        {id: 'success_transactions', title: "Success Transactions"},
        {id: 'amount', title: "Amount"},
    ]
});

var transporter = nodemailer.createTransport({
    host: "mail.dmdmax.com.pk",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: 'reports@goonj.pk', // generated ethereal user
      pass: 'YiVmeCPtzJn39Mu' // generated ethereal password
    }
});


generateReportForAcquisitionSourceAndNoOfTimeUserBilled = async() => {
    console.log("=> generateReportForAcquisitionSourceAndNoOfTimeUserBilled");
    
    let finalResult = [];
    let inputData = ["03461468605","03494661092","03133769973","03452531080","03454155642","03458806134","03463945594","03403897387","03440025473","03449878471","03470726366","03465958493","03476718924","03412774528","03461500625","03416709766","03499342148","03494938428","03480430799","03434373728","03480731004","03457900879","03447410044","03457743076","03438944258","03454425645","03401040154","03005445190","03455435335","03454571841","03487186602","03322780733","03459666513","03475113891","03066626202","03404033231","03477367479","03453800378","03454969558","03447535902","03410683847","03459733896","03007776413","03410426961","03480366270","03470376786","03443322036","03400623503","03442676103","03426617086","03470981797","03477444250","03435454944","03425180785","03441731139","03457070332","03495545429","03405706581","03483057672","03439879567","03427433426","03470613369","03449001474","03495578590","03462402282","03463266595","03417703957","03444573646","03465785961","03439893882","03442045292","03435208250","03477542326","03419223358","03136668373","03457711808","03457434231","03444287976","03473814663","03408728041","03445718606","03456714931","03422544741","03452201888","03437519081","03440508855","03027537865","03443840704","03425517331","03065897887","03466864336","03468929277","03435767512","03436048116","03443695015","03467067185","03455685060","03450389837","03445558313","03496587930","03407758505","03492521929","03445161879","03411600526","03453971850","03455099177","03424797995","03471432938","03437081232","03476510543","03414162868","03446194311","03454762768","03446498350","03446447831","03454732021","03417836580","03455259344","03417646896","03453391675","03411880456","03463898552","03439475035","03447919706","03494372308","03486988784","03464588856","03476817516","03442773384","03486833912","03447396746","03466459161","03497460681","03464383503","03459155587","03479854361","03454686437","03457294863","03459455521","03431076991","03402099984","03469111927","03128996550","03139541034","03477492936","03459605040","03455086943","03450169001","03452625576","03423371278","03499114671","03439628209","03454566134","03414153523","03004967327","03460003797","03468651772","03427159864","03488950712","03454451544","03429798519","03430411204","03458492592","03464893732","03454120257","03410711335","03441921702","03454925080","03433161361","03474041799","03404209524","03466585713","03427771526","03408692699","03445500775","03425478655","03486874789","03451787791","03405977379","03454373134","03401165713","03456618387","03454124261","03435382170","03417767077","03478433843","03355975455","03460503139","03088979145","03419152075","03403711149","03464730985","03480066900","03499387890","03407977705","03448258701","03432961966","03474741435","03035258620","03469656172","03444869821","03424736894","03432894887","03489817554","03439898755","03403112115","03474563347","03470441215","03459590154","03478383425","03414502674","03457865930","03439353576","03477382300","03424691784","03458366330","03455841389","03466075786","03428675846","03480901940","03421802998","03432586001","03460492176","03350569886","03458867252","03454409022","03470615677","03417948039","03488642568","03433434410","03456382975","03467475949","03444691402","03458580956","03480486864","03457739569","03325386332","03480142145","03418230010","03469181216","03434437364","03452241428","03411317646","03448798781","03444416431","03466672289","03473555426","03428868811","03443496544","03118268891","03451136844","03495834098","03026483876","03494815145","03413114011","03454722039","03425837018","03415584657","03456814043","03458611095","03413225929","03456298406","03425786575","03466996535","03476654708","03406726098","03366664492","03422635929","03462020415","03439437484","03139174190","03012127926","03439907010","03476526512","03325672229","03471552497","03217143707","03454164580","03457865930","03458622413","03467764672","03404813422","03422494461","03405340396","03478339459","03426801380","03466591742","03417988693","03457842244","03491930104","03497530112","03469846150","03484128237","03464280458","03443102327","03404671071","03473341410","03442226781","03492942429","03421045953","03365227410","03404069725","03471044766","03447551260","03456356995","03468693074","03215008744","03452802505","03476843513","03481105008","03405746794","03134639447","03473537994","03453771104","03434546811","03474455410","03462224407","03466813775","03478902582","03463141844","03440942829","03435795756","03434030084","03455296453","03438348485","03492602850","03401872449","03457766497","03474087649","03441015723","03456436488","03424011650","03460029502","03447078312","03455001215","03447725238","03429191413","03446141252","03472605518","03453572276","03433382310","03450888697","03458347891","03486602562","03470073277","03448351286","03420327078","03402729863","03442201188","03424331223","03403129567","03486355547","03416301330","03468694363","03494339642","03444371473","03403410319","03410100438","03442467281","03464447286","03461594917","03447299800","03402667240","03462822582","03417337121","03429307606","03444254444","03457761775","03415100955","03476677998","03003648740","03466809252","03035042758","03439353576","03446101064","03465588377","03481005309","03421662223","03496436883","03467779650","03470438040","03478382344","03455969900","03216433342","03402860509","03470746812","03426613937","03495883218","03404949304","03478480392","03440424184","03444243069","03444285178","03456809879","03484619611","03476161020","03499603657","03450440400","03484342539","03415325503","03453413236","03486334643","03434092610","03446443439","03459581437","03454849294","03452902404","03407579973","03437376631","03454587045","03422029448","03453807690","03453436566","03459998781","03401007225","03469490131","03454229286","03453159713","03458472058","03447904068","03458650951","03481230551","03429750553","03415667622","03443867267","03452583475","03462291844","03214043834","03468131617","03006520841","03214269844","03463977603","03004913005","03407769088","03449599308","03426325703","03444274790","03406654600","03405253377","03451173073","03428878542","03454112023","03488080808","03469617635","03457064825","03456211521","03474137084","03485752878","03422075467","03491191151","03457941890","03436203805","03419156620","03471980210","03474524193","03427631906","03405688702","03455566413","03486232062","03478309783","03450467792","03414141032","03451652502","03451237075","03423751952","03467634771","03407525240","03484274997","03454843458","03435208250","03414680189","03456652263","03453411087","03469552213","03454305272","03407835950","03446417528","03477088864","03443940509","03478433190","03448362148","03421120833","03457747933","03425136924","03472266359","03447845318","03462200940","03454905505","03438112152","03451479942","03453638552","03445808330","03488792366","03469523629","03469523629","03448013622","03456726722","03455933537","03475759675","03456237924","03461814234","03454337923","03004879809","03459104496","03474072831","03426190509","03497377845","03435017339","03471736346","03409552962","03440479545","03495582471","03421996086","03450025025","03460142028","03420880905","03454137375","03468459118","03470696448","03452678471","03452325347","03413644733","03449397896","03458043117","03444403243","03436999065","03343007874","03404107653","03448921583","03466350441","03402000955","03442934050","03435541538","03331490267","03441031949","03476137078","03487495544","03475601161","03408610391","03448946098","03468666534","03426100561","03481501528","03442685696","03459292191","03466235514","03478140256","03458741948","03427477568","03479423516","03437748994","03462858512","03470801505","03477001340","03457541777","03469084752","03436842570","03430997073","03443322477","03472042013","03482099868","03494837192","03476211470","03497058640","03433769052","03478897857","03328027378","03447340514","03137115447","03436182232","03462711280","03455888989","03471902484","03473384387","03436423943","03468675596","03473309454","03423237548","03434577277","03459035381","03473537994","03448405076","03457923979","03491984493","03218182427","03496688618","03427935548","03430429874","03497456126","03459742588","03459456393","03454722612","03452105271","03437461531","03417904906","03458198251","03445533672","03418219381","03482342200","03463999789","03408760804","03404251500","03424134982","03446363313","03440505047","03466368343","03470438040","03488362512","03456294913","03459421258","03447414716","03488746761","03478914857","03335614712","03476403045","03455663336","03434546811","03473024808","03495919112","03443453832","03400800419","03458086480","03476251172","03449139114","03455886200","03456029260","03138866541","03496046476","03428283728","03491907308","03412022060","03467733268","03468097125","03461036647","03457595450","03467985973","03482269471","03468646243","03006411613","03467250098","03457805057","03416283780","03004700335","03434591621","03457655874","03474039070","03216220841","03455246783","03414971722","03451018114","03474824765","03442175056","03456486399","03455589239","03413427811","03455589239","03481395372","03474527789","03450912443","03431518322","03468707727","03480517149","03335413782","03405575492","03474489325","03438559592","03417546955","03414010950","03003509653","03491421385","03431654838","03484076220","03430707717","03444175493","03472210262","03416224717","03456761056","03408359066","03411560624","03481155842","03400584324","03445478767","03466169356","03429903925","03406301455","03456774731","03406248803","03444669705","03464196080","03451146661","03489257036","03428238628","03473325023","03464696590","03413271665","03476912441","03442594887","03481594389","03460769501","03417125593","03474111295","03461158856","03419757239","03429016507","03456572770","03478739944","03421335746","03469341304","03453222418",
    "03430942092","03423801825","03454723175","03441530533","03421634366","03499267090","03431077766","03493932377","03493492859","03453050266","03478783093","03479668360","03459336038","03494117128","03473407366","03476431283","03453935741","03435055226","03441412881","03474077430","03417500588","03447672469","03407210021","03414006470","03457348698","03425570228","03435773358","03069831181","03416259786","03403903428","03459600945","03464088040","03465638271","03479444850","03476744248","03444247277","03478276966","03480743937","03440819272","03454413516","03460550816","03444498877","03415419807","03423813384","03416224717","03436705324","03453186563","03416595242","03441509006","03475336370","03489012632","03467788199","03457591006","03480787731","03453361135","03017373150","03425358941","03452900661","03499267090","03434250181","03473624824","03436403696","03459520970","03452627194","03468646243","03451465138","03437860239","03468072692","03457536245","03469685069","03314649851","03416576003","03424217082","03406145220","03455163141","03466000920","03454541658","03465679983","03477614494","03485867107","03463308810","03455166507","03401264138","03454207891","03430747310","03425887899","03417328410","03466108195","03458533845","03442821712","03420071314","03456786238","03219760023","03422365385","03459413001","03443151752","03429565532","03468008546","03474441113","03419486198","03453726800","03491558509","03400131013","03434986055","03467936925","03456629137","03407236811","03409494824","03457697068","03473091753","03421659095","03036252795","03410600808","03441083944","03406118843","03426868295","03156801881","03414573785","03442453285","03424820510","03413364259","03453406528","03472986150","03029896587","03244333690","03494456304","03464677522","03452261742","03406899715","03434790987","03498439925","03448122998","03457553405","03456971731","03468690042","03216957707","03400590335","03450788143","03459177792","03009579757","03457508474","03458940681","03440201850","03497454152","03463350344","03462935851","03409728104","03403255306","03464436064","03428985645","03485017335","03417552174","03414840274","03451573143","03436227885","03455189406","03467112454","03471787087","03428234460","03405227148","03403733385","03458697914","03415542238","03467698688","03445628975","03431866700","03494097860","03454668585","03440140740","03480150127","03474092865","03487032546","03464675419","03456397499","03408761923","03422174925","03460476481","03476324220","03447534594","03453195921","03430312573","03434001945","03421363799","03317992349","03471039502","03412294123","03421810856","03454705396","03466095574","03474517262","03462515450","03445495957","03023455740","03461158856","03408984084","03433057570","03485623204","03457972855","03343613322","03416532913","03478037506","03478013917","03456624113","03441014400","03418402770","03425267789","03452253529","03468603515","03471898641","03400379633","03440158827","03487563762","03433794115","03457096322","03413058059","03427351696","03424587870","03455217289","03479503242","03448378330","03464642001","03448308586","03136907584","03435367440","03447514509","03438417988","03427311358","03354383460","03447044916","03487827133","03456528934","03459909538","03424038239","03461556157","03400231487","03414657131","03419066677","03499168471","03454517462","03466828553","03431081623","03415502412","03472122345","03458310133","03445668628","03440338128","03418863219","03490727194","03465021423","03441454838","03453236083","03413948461","03473583980","03429609285","03412087536","03433250146","03436093842","03465607200","03452035352","03416648266","03417584244","03431481195","03461555197","03449409298","03416990229","03496358837","03423638760","03005607819","03315854651","03411884736","03485179331","03345014759","03467912596","03458048945","03414405550","03469337515","03444967136","03448436616","03440680767","03457002122","03453489932","03433030322","03424801966","03427330324","03487949275","03400545143","03476321059","03446758456","03499369150","03453807690","03488506484"];
    
    try{
        for(let i = 0; i < inputData.length; i++){
            if(inputData[i] && inputData[i].length === 11){
                let singleRecord = await usersRepo.getData(inputData[i]);
                if(singleRecord.length > 0){
                    singleRecord = singleRecord[0];
                    let singObject = {
                        msisdn: singleRecord.msisdn,
                        acquisition_date: singleRecord.acquisition_date,
                        number_of_success_charging: singleRecord.total_successful_chargings
                    };
    
                    if(singleRecord.acquisition_mid){
                        singObject.acquisition_source = singleRecord.acquisition_mid;
                    }else{
                        if(singleRecord.acquisition_source === 'affiliate_web'){
                            singObject.acquisition_source = 'web';
                        }else{
                            singObject.acquisition_source = singleRecord.acquisition_source;
                        }
                        
                    }
            
                    let expiryHistory = {};
                    if(singleRecord.subscription_status === 'expired'){
                        expiryHistory = await billinghistoryRepo.getExpiryHistory(singleRecord.user_id);
                        if(expiryHistory.length >= 2){
                            expiryHistory.sort(function(a,b){
                                return new Date(b.billing_dtm) - new Date(a.billing_dtm);
                            });
                        }
            
                        singObject.unsub_date = expiryHistory[0].billing_dtm;
                    }
        
                    finalResult.push(singObject);
                    console.log("=> Data done for item ", i);
                }
            }else{
                console.log("=> Invalid number or number length");
            }
        }
    
        console.log("=> Sending email");
        await randomReportWriter.writeRecords(finalResult);
        let info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            to:  ["farhan.ali@dmdmax.com"],
            subject: `Complaint Data`, // Subject line
            text: `This report contains the details of msisdns being sent us over email from Zara`,
            attachments:[
                {
                    filename: randomReport,
                    path: randomReportFilePath
                }
            ]
        });
    
        console.log("=> [randomReport][emailSent]",info);
        fs.unlink(randomReportFilePath,function(err,data) {
            if (err) {
                console.log("=> File not deleted[randomReport]");
            }
            console.log("=> File deleted [randomReport]");
        });
    }catch(e){
        console.log("=> error - ",JSON.stringify(e));
    }
}

dailyReport = async(mode = 'prod') => {

    let resultToWriteToCsv= [];

    try{
        console.log("=> dailyReport");
        let today = new Date();
        let myToday = new Date(today.getFullYear(),today.getMonth(),today.getDate(),0,0,0);

        let dayBeforeYesterday = new Date(today.getFullYear(),today.getMonth(),today.getDate(),0,0,0);
        dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);
        let reportStartDate = new Date("2020-02-07T00:00:00.672Z");
        let susbcriberStats = await Subscription.aggregate([
            {
                "$match": 
                {
                    "added_dtm": { "$gte": reportStartDate ,$lt: myToday  },
                    "active": true
                }
            },
            {$group: {_id: {"day": {"$dayOfMonth" : "$added_dtm"}, "month": { "$month" : "$added_dtm" },"year":{ $year: "$added_dtm" } } , count:{ $sum: 1 } } },
            {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, "count": "$count",_id:-1 }} ,
            { $sort: {"date": -1}}
        ]);

        console.log("=> dailyReport 1");
        
        let subscription_status_stats = await Subscription.aggregate([
            {
                "$match": 
                {
                    "added_dtm": { "$gte": reportStartDate ,$lt: myToday  },
                    active:true
                }
            },
            {$group: {_id: {subscription_status: "$subscription_status" } , count:{ $sum: 1 } } },
            {$project: {  "count": "$count",_id: 1 }} ,
            { $sort: {"date": -1}}
        ]);

        console.log("=> dailyReport 2");

        let totalActiveSubscribers = subscription_status_stats.reduce((accum,elem) => {
            if (elem._id.subscription_status === "trial" || elem._id.subscription_status === "graced" || elem._id.subscription_status === "billed") {
                return accum = accum + elem.count; 
            }
            return accum;
        },0);

        console.log("=> dailyReport 3");

        let userStats = await User.aggregate([
                {
                    "$match": 
                    {
                        "added_dtm": { "$gte": reportStartDate ,$lt: myToday  },
                        active:true,
                        operator:"telenor"
                    }
                },
            {$group: {_id: {"day": {"$dayOfMonth" : "$added_dtm"}, "month": { "$month" : "$added_dtm" },
            "year":{ $year: "$added_dtm" }} , count:{ $sum: 1 } } },
            {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, "count": "$count",_id:-1 }},
            {$sort: {"date": -1}} 
        ]);

        console.log("=> dailyReport 4");

        let totalUserStats = await User.countDocuments({ "added_dtm": { "$gte": reportStartDate ,$lt: myToday  },active:true } );
        console.log("=> dailyReport 4.1");
        let totalSubscriberStats = await Subscription.countDocuments({ "added_dtm": { "$gte": reportStartDate ,$lt: myToday  },active:true } );
        console.log("=> dailyReport 4.2 - ", totalSubscriberStats);
        let totalExpiredCount = await BillingHistory.countDocuments({"billing_dtm": { "$gte": reportStartDate ,$lt: myToday  },billing_status: "expired"} );
        console.log("=> dailyReport 5 - ", totalExpiredCount);

        let billingStats = await BillingHistory.aggregate([
                { $match: { "billing_status": {$in : ["Success","expired"]}, "billing_dtm": { "$gte": reportStartDate ,$lt: myToday  } } },
                {$group: {_id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
                    "year":{ $year: "$billing_dtm" },billing_status: "$billing_status",package_id: "$package_id" } , revenue:{ $sum: "$price" },count:{$sum: 1} } },
                {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }},
                    "revenue": "$revenue","count":"$count",_id:-1 }},{$sort: {"date": -1}}
        ]);
        
        console.log("=> dailyReport 6");
        
        let trialStats = await BillingHistory.aggregate([
            { $match: { "billing_status": "trial","billing_dtm": { "$gte": reportStartDate ,$lt: myToday  }  } },
            {$group: {_id: {"day": {"$dayOfMonth" : "$billing_dtm"}, "month": { "$month" : "$billing_dtm" },
                "year":{ $year: "$billing_dtm" } } , trials:{ $sum: 1 } } },
            {$project: {  "date":{"$dateFromParts":{ year: "$_id.year","month":"$_id.month","day":"$_id.day" }}, 
                "trials": "$trials",_id:-1 }},{$sort: {"date": -1}}
        ]);
        
        console.log("=> dailyReport 7");

        let resultToWrite = {};
        userStats.forEach(userStat => {
            if(userStat.date){
                resultToWrite[userStat.date.toDateString()] =  {};
            }
        });

        console.log("=> dailyReport 8");

        let totalUsers = totalUserStats;
        userStats.forEach(userStat => {
            if(userStat.date){
                resultToWrite[userStat.date.toDateString()]['newUser'] = userStat.count;
                totalUsers = totalUsers - userStat.count;
                resultToWrite[userStat.date.toDateString()]['totalUsers'] = totalUsers;
            }
        });

        console.log("=> dailyReport 9");

        var totalSubscriber = totalSubscriberStats;
        susbcriberStats.forEach(subsc => {
            if(subsc.date){
                resultToWrite[subsc.date.toDateString()]['newSubscriber'] = subsc.count;
                totalSubscriber = totalSubscriber - subsc.count;
                resultToWrite[subsc.date.toDateString()]['totalSubscribers'] = totalSubscriber;
            }
        });

        console.log("=> dailyReport 10");

        let totalExpiredCountt = totalExpiredCount;

        billingStats.forEach(billingHistor => {
            // console.log(billingHistor);
            if(resultToWrite[billingHistor.date.toDateString()] && billingHistor._id["billing_status"] === "Success") {
                console.log("billingHistor",billingHistor);
                if (billingHistor._id.package_id === "QDfC") {
                    resultToWrite[billingHistor.date.toDateString()]['revenue-liveonly'] = billingHistor.revenue;
                    resultToWrite[billingHistor.date.toDateString()]['users-billed-liveonly'] = billingHistor.count;
                }
                if (billingHistor._id.package_id === "QDfG") {
                    resultToWrite[billingHistor.date.toDateString()]['revenue-liveweekly'] = billingHistor.revenue;
                    resultToWrite[billingHistor.date.toDateString()]['users-billed-liveweekly'] = billingHistor.count;
                }
                if (billingHistor._id.package_id === "QDfH") {
                    resultToWrite[billingHistor.date.toDateString()]['revenue-comedyonly'] = billingHistor.revenue;
                    resultToWrite[billingHistor.date.toDateString()]['users-billed-comedyonly'] = billingHistor.count;
                }
                if (billingHistor._id.package_id === "QDfI") {
                    resultToWrite[billingHistor.date.toDateString()]['revenue-comedyweekly'] = billingHistor.revenue;
                    resultToWrite[billingHistor.date.toDateString()]['users-billed-comedyweekly'] = billingHistor.count;
                }
            } else if (resultToWrite[billingHistor.date.toDateString()] && billingHistor._id["billing_status"] === "expired")  {
                console.log("[dailyReport]expired On the day",billingHistor.count);
                console.log("[dailyReport]date",billingHistor.date.toDateString());
                totalExpiredCountt = totalExpiredCountt - billingHistor.count;
                console.log("[dailyReport]totalExpiredCountt",totalExpiredCountt);
                resultToWrite[billingHistor.date.toDateString()]['users_expired'] = billingHistor.count;
                resultToWrite[billingHistor.date.toDateString()]['users_expired_till_today'] = totalExpiredCountt;
            }
        });
        console.log("=> dailyReport 11");

        trialStats.forEach(trialStat => {
            if(resultToWrite[trialStat.date.toDateString()]) {
                resultToWrite[trialStat.date.toDateString()]['trials'] = trialStat.trials;
            }
        });

        console.log("=> dailyReport 12");

        // console.log("myDate",dayBeforeYesterday.toDateString());
        // console.log("myToday",resultToWrite[dayBeforeYesterday.toDateString()]);
        resultToWrite[dayBeforeYesterday.toDateString()]["tempTotalActiveSubscribers"] = totalActiveSubscribers; 

        for (res in resultToWrite) {
            let liveOnlyRevenue = (resultToWrite[res]["revenue-liveonly"])?resultToWrite[res]["revenue-liveonly"]:0;
            let liveWeeklyRevenue = (resultToWrite[res]["revenue-liveweekly"])?resultToWrite[res]["revenue-liveweekly"]:0;
            let comedyOnlyRevenue = (resultToWrite[res]["revenue-comedyonly"])?resultToWrite[res]["revenue-comedyonly"]:0 ;
            let comedyWeeklyRevenue = (resultToWrite[res]["revenue-comedyweekly"])?resultToWrite[res]["revenue-comedyweekly"]:0 ;
            
            let totalRevenue = liveOnlyRevenue + liveWeeklyRevenue + comedyOnlyRevenue + comedyWeeklyRevenue;
            
            let temp = {date: res, newUser: resultToWrite[res].newUser , newSubscriber: resultToWrite[res].newSubscriber,
                liveOnlyCount: resultToWrite[res]["users-billed-liveonly"],
                liveOnlyRevenue: liveOnlyRevenue,
                
                liveWeeklyCount: resultToWrite[res]["users-billed-liveweekly"],
                liveWeeklyRevenue: liveWeeklyRevenue,
                
                comedyOnlyCount: resultToWrite[res]["users-billed-comedyonly"],
                comedyOnlyRevenue: comedyOnlyRevenue,
                
                comedyWeeklyCount: resultToWrite[res]["users-billed-comedyweekly"],
                comedyWeeklyRevenue: comedyWeeklyRevenue,
                
                users_billed: resultToWrite[res].users_billed, trials: resultToWrite[res].trials,tempTotalActiveSubscribers: (resultToWrite[res]["tempTotalActiveSubscribers"])?resultToWrite[res]["tempTotalActiveSubscribers"]:"",
                totalUsers : resultToWrite[res].totalUsers, totalSubscribers: resultToWrite[res].totalSubscribers, 
                totalActiveSubscribers : (resultToWrite[res].totalSubscribers - resultToWrite[res].users_expired_till_today < 0)? 0 : resultToWrite[res].totalSubscribers - resultToWrite[res].users_expired_till_today,
                totalRevenue:  totalRevenue       
            }
            resultToWriteToCsv.push(temp);
        } 

        console.log("=> dailyReport 13");

    }catch(err){
        console.log("=> catch ", err);
    }

    try {  
        csvWriter.writeRecords(resultToWriteToCsv).then(async (data) => {
            var info = await transporter.sendMail({
                from: 'paywall@dmdmax.com.pk', // sender address
                //to:  ['farhan.ali@dmdmax.com'],
                to:  ["yasir.rafique@dmdmax.com","paywall@dmdmax.com.pk","mikaeel@dmdmax.com","zara.naqi@telenor.com.pk", "fahad.shabbir@ideationtec.com","ceo@ideationtec.com","asad@ideationtec.com","usama.abbasi@ideationtec.com","wasif@dmdmax.com"], // list of receivers
                subject: `Paywall Report`, // Subject ne
                text: `PFA some basic stats for Paywall - ${(new Date()).toDateString()}`, // plain text bodyday
                attachments:[
                    {
                        filename: paywallRevFileName,
                        path: paywallRevFilePath
                    }
                ]
            });
            console.log("=> dailyReport 14",info);
            fs.unlink(paywallRevFilePath,function(err,data) {
                if (err) {
                    console.log("=> [dailyReport]File not deleted");
                }
                console.log("=> [dailyReport]data");
            });
            console.log("=> [dailyReport]info",info);
        }).catch(er => {
            console.log("=> [dailyReport]err",er)
        });
        console.log("=> [dailyReport]resultToWrite",resultToWriteToCsv)
    } catch(err) {
        console.log("=> [dailyReport]",err);
    }
}

callBacksReport =async() => {
    try { 
        let startDate = new Date("2020-06-19T00:00:00.000Z");
        let report =  await Subscription.aggregate([ 
            { 
                $match: {
                        $or:[{source: "HE"},{source: "affiliate_web"}],
                        added_dtm: { $gte: startDate }
                    } 
            },
            {
                $lookup:  
                    {        
                        from: "billinghistories",        
                        localField: "_id",        
                        foreignField: "subscription_id",        
                        as: "histories" 
                    } 
            },
            { 
                $project: { 
                    tid: "$affiliate_unique_transaction_id",
                    mid: "$affiliate_mid",
                    added_dtm: "$added_dtm",
                    active: "$active",
                    callbackhistory: {
                            $filter: {
                                input: "$histories",
                                as: "histor",
                                cond: {$eq: ["$$histor.billing_status", "Affiliate callback sent" ] }
                            }
                    }
                }
            }, 
            { 
                $project: { 
                tid: "$tid",
                mid: "$mid",
                isValidUser: {$cond: {if: {$eq:["$active",true]}, then: true, else: false } },
                added_dtm: "$added_dtm",
                callbackhistorySize: {"$size": "$callbackhistory" },
                callbackObj: {$arrayElemAt: ["$callbackhistory",0]},
                added_dm: { '$dateToString' : { date: "$added_dtm",'format':'%Y-%m-%d-%H:%M:%S','timezone' : "Asia/Karachi" } },
                }
            },
            { 
                $project: { 
                tid: "$tid",
                mid: "$mid",
                isValidUser: "$isValidUser",
                callbackhistorySize: "$callbackhistorySize",
                added_dm: { '$dateToString' : { date: "$added_dtm",'format':'%Y-%m-%d-%H:%M:%S','timezone' : "Asia/Karachi" } },
                billing_dm: { '$dateToString' : { date: "$callbackObj.billing_dtm",'format':'%Y-%m-%d-%H:%M:%S','timezone' : "Asia/Karachi" } }
                }
            }, 
            { 
                $project: { 
                tid: "$tid",
                mid: "$mid",
                isValidUser: "$isValidUser",
                added_dtm:  {$cond: {if: "$isValidUser", then: "$added_dm" , else: "" } },
                isCallbAckSent: {$cond: { if: { $and: [{$gte: ["$callbackhistorySize",1]},{$eq: [ "$isValidUser",true ]} ] } ,then:"yes",else:"no" }} ,
                callBackSentTime: {$cond: {if: "$isValidUser", then: "$billing_dm" , else: "" } }  
                }
            }
        ]);

        let write = await csvReportWriter.writeRecords(report);
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            // to:  ["paywall@dmdmax.com.pk"],
            to:  ["paywall@dmdmax.com.pk","nauman@dmdmax.com","mikaeel@dmdmax.com"], // list of receivers
            subject: `Callbacks Report`, // Subject line
            text: `Callbacks sent with their TIDs and timestamps -  ${(new Date()).toDateString()}`, // plain text bodyday
            attachments:[
                {
                    filename: paywallCallbackReport,
                    path: paywallCallbackFilePath
                }
            ]
        });
        console.log("***> Report",info);
        fs.unlink(paywallCallbackFilePath,function(err,data) {
            if (err) {
                console.log("***> File not deleted");
            }
            console.log("***> data",data);
        });
    } catch(err) {
        console.log("***> Error", err);
    }
    
}

const errorCountReportBySource = createCsvWriter({
    path: paywallErrorCountBySourceFilePath,
    header: [
        {id: 'source', title: 'Source'},
        {id: 'errorMessage', title: 'Error Message'},
        {id: 'errorCode', title: 'Error Code'},
        {id: "count",title: "Error Count" }
    ]
});

const errorCountReportWriter = createCsvWriter({
    path: paywallErrorCountFilePath,
    header: [
        {id: 'errorMessage', title: 'Error Message'},
        {id: 'errorCode', title: 'Error Code'},
        {id: "count",title: "Error Count" }
    ]
});

const dailyUnsubReportWriter = createCsvWriter({
    path: paywallUnsubFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: "count",title: "Unsubscribe Count" },
        {id: "source",title: "Source" }
    ]
});

const dailyChannelWiseUnsubWriter = createCsvWriter({
    path: paywallChannelWiseUnsubReportFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: 'app', title: 'App'},
        {id: 'web', title: 'Web'},
        {id: 'sms', title: 'Sms'},
        {id: 'cc', title: 'Customer Care'},
        {id: 'cp', title: 'Customer Portal'},
        {id: 'expired', title: 'Expired By System'},
        {id: "total",title: "Total" }
    ]
});

const dailyChannelWiseTrialWriter = createCsvWriter({
    path: paywallChannelWiseTrialFilePath,
    header: [
        {id: 'date', title: 'Date'},
        {id: 'app', title: 'App'},
        {id: 'web', title: 'Web'},
        {id: 'HE', title: 'Affiliate'},
        {id: "total",title: "Total" }
    ]
});

errorCountReport = async() => {
    try {
        let errorBySourceReport = await billinghistoryRepo.errorCountReportBySource();
        console.log("=> done 1");
        let errorReport = await billinghistoryRepo.errorCountReport();
        console.log("=> done 2");
        
        await errorCountReportWriter.writeRecords(errorReport);
        await errorCountReportBySource.writeRecords(errorBySourceReport);
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            to:  ["farhan.ali@dmdmax.com"],
            //to:  ["paywall@dmdmax.com.pk","mikaeel@dmdmax.com"], // list of receivers
            subject: `Daily Error Reports`, // Subject line
            text: `This report (generated at ${(new Date()).toDateString()}) contains all error count stats from 23rd February 2020 onwards.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallErrorCountReport,
                    path: paywallErrorCountFilePath
                },
                {
                    filename: paywallErrorCountReportBySource,
                    path: paywallErrorCountBySourceFilePath
                }
            ]
        });
        console.log("=> [errorCountReport][emailSent]",info);
        fs.unlink(paywallErrorCountFilePath,function(err,data) {
            if (err) {
                console.log("File not deleted[errorCountReport]");
            }
            console.log("File deleted [errorCountReport]");
        });
        fs.unlink(paywallErrorCountBySourceFilePath,function(err,data) {
            if (err) {
                console.log("File not deleted[errorCountReportBySource]");
            }
            console.log("File deleted [errorCountReportBySource]");
        });
    } catch (error) {
        console.error("=>", error);
    }
}

dailyUnsubReport = async(from,to) => {
    try {
        let dailyUnsubReport = await billinghistoryRepo.dailyUnsubReport();
        await dailyUnsubReportWriter.writeRecords(dailyUnsubReport);
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            // to:  ["hamza@dmdmax.com"],
            to:  ["paywall@dmdmax.com.pk"], // list of receivers
            subject: `Daily Unsubscribed Users Report`, // Subject line
            text: `This report (generated at ${(new Date()).toDateString()}) contains count of unsubscribed users.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallUnsubReport,
                    path: paywallUnsubFilePath
                }
            ]
        });
        console.log("[dailyUnsubReport][emailSent]",info);
        fs.unlink(paywallUnsubFilePath,function(err,data) {
            if (err) {
                console.log("File not deleted[dailyUnsubReport]");
            }
            console.log("File deleted [dailyUnsubReport]");
        });
    } catch (error) {
        console.error(error);
    }
}

dailyNetAddition = async(from, to) => {
    try {
        let csvData = [];

        console.log("=> from", from, "to", to);
        let dailySubscriptions = await subscriptionRepo.getAllSubscriptionsByDate(from, to);
        let dailyUnSubscriptions = await billinghistoryRepo.unsubReport(from, to);

        for(let i = 0; i < dailySubscriptions.length; i++){
            let data = {};
            data.date = dailySubscriptions[i].date;
            if(new Date(dailySubscriptions[i].date).getTime() === new Date(dailyUnSubscriptions[i].date).getTime()){
                data.subs = dailySubscriptions[i].count;
                data.unsubs = dailyUnSubscriptions[i].count;
                data.net = (dailySubscriptions[i].count - dailyUnSubscriptions[i].count);
                csvData.push(data);
            }
        }

        await dailyNetAdditionWriter.writeRecords(csvData);
        console.log("=> Daily Addition Report");
        from = new Date(from);
        let info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            to:  ["farhan.ali@dmdmax.com"],
            // to:  ["paywall@dmdmax.com.pk", "zara.naqi@telenor.com.pk", "mikaeel@dmdmax.com", "khurram.javaid@telenor.com.pk", "junaid.basir@telenor.com.pk"], // list of receivers
            subject: `Daily Net Additions - ${monthNames[from.getMonth()]}`,
            text: `This report contains daily net additions for the month of ${monthNames[from.getMonth()]}.`,
            attachments:[
                {
                    filename: dailyNetAdditionCsv,
                    path: dailyNetAdditionFilePath
                }
            ]
        });
        console.log("=> [dailyNetAdditionCsv][emailSent]",info);
        fs.unlink(dailyNetAdditionFilePath,function(err,data) {
            if (err) {
                console.log("=> File not deleted[dailyNetAdditionCsv]");
            }
            console.log("=> File deleted [dailyNetAdditionCsv]");
        });
    } catch (error) {
        console.error("=> error ", error);
    }
}

avgTransactionPerCustomer = async(from, to) => {
    try {
        console.log("=> AvgTransactionPerCustomer from", from, "to", to);
        let totalTransactions = await billinghistoryRepo.numberOfTransactions(from, to);
        totalTransactions = totalTransactions[0].count;

        let totalUniqueUsers = await billinghistoryRepo.totalUniqueTransactingUsers(from, to);
        totalUniqueUsers = totalUniqueUsers[0].count;

        let avgTransactions = totalTransactions / totalUniqueUsers;

        console.log("=> Avg. Transactions Per Customer Report");
        from = new Date(from);
        let info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            to:  ["farhan.ali@dmdmax.com"],
            // to:  ["paywall@dmdmax.com.pk", "zara.naqi@telenor.com.pk", "mikaeel@dmdmax.com", "khurram.javaid@telenor.com.pk", "junaid.basir@telenor.com.pk"], // list of receivers
            subject: `Avg Transactions/Customer - ${monthNames[from.getMonth()]}`,
            text: `Avg Transactions/Customer for the month of ${monthNames[from.getMonth()]} are ${avgTransactions}`,
        });
        console.log("=> [avgTransactionPerCustomer][emailSent]",info);
    } catch (error) {
        console.error("=> avgTransactionPerCustomer- error ", error);
    }
}

weeklyRevenue = async(weekFromArray, weekToArray, emailList) => {
    try {
        let emailBody = "";

        for(let i = 0; i < weekFromArray.length; i++){
            let weekFrom = weekFromArray[i];
            let weekTo = weekToArray[i];

            console.log("=> weeklyRevenue from", weekFrom, "to", weekTo);
            let revenue = await billinghistoryRepo.getRevenueInDateRange(weekFrom, weekTo);
            emailBody = emailBody.concat(`${weekFrom} - ${weekTo}:   ${revenue[0].total}\n`);
        }

        let info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            to:  emailList,
            subject: `Weekly Revenue Report - ${monthNames[weekFromArray[0].getMonth()]}`,
            text: emailBody,
        });
        console.log("=> [weeklyRevenue][emailSent]",info);
        
    } catch (error) {
        console.error("=> weeklyRevenue- error ", error);
    }
}

weeklyTransactingCustomers = async(weekFromArray, weekToArray, emailList) => {

    try {
        let emailBody = "";

        for(let i = 0; i < weekFromArray.length; i++){
            let weekFrom = weekFromArray[i];
            let weekTo = weekToArray[i];

            console.log("=> weeklyTransactingCustomers from", weekFrom, "to", weekTo);
            let totalUniqueUsers = await billinghistoryRepo.totalUniqueTransactingUsers(weekFrom, weekTo);
            emailBody = emailBody.concat(`${weekFrom} - ${weekTo}:   ${totalUniqueUsers[0].count}\n`);
        }

        let info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            to:  emailList,
            subject: `Weekly Transacting Customers - ${monthNames[weekFromArray[0].getMonth()]}`,
            text: emailBody,
        });
        console.log("=> [weeklyTransactingCustomers][emailSent]",info);
        
    } catch (error) {
        console.error("=> weeklyTransactingCustomers- error ", error);
    }
}

dailyReturningUsers = async(from, to) => {
    try {
        console.log("=> DailyReturningUsers from", from, "to", to);
        let dailyReturningUsers = await billinghistoryRepo.dailyReturningUsers(from, to);
        let dailyReturningUsersCount = dailyReturningUsers[0].totalcount;
        console.log(`=> Daily Returning Users for ${to} are ${dailyReturningUsersCount}`);
        
        let info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            //to:  ["farhan.ali@dmdmax.com"],
            to:  ["paywall@dmdmax.com.pk","mikaeel@dmdmax.com"],
            subject: `Daily Returning Users`,
            text: `Daily returning users for the date ${to} are ${dailyReturningUsersCount}`,
        });
        console.log("=> [dailyReturningUsers][emailSent]",info);
    } catch (error) {
        console.error("=> dailyReturningUsers- error ", error);
    }
}

dailyChannelWiseUnsub = async() => {
    try {
        console.log("=> [dailyChannelWiseUnsub]");
        let records = [];
        let dailyChannelWiseUnsub = await billinghistoryRepo.dailyChannelWiseUnsub(); 
        console.log("=> done 1"); 
        let dailyExpiredBySystem = await billinghistoryRepo.dailyExpiredBySystem();
        console.log("=> done 2");

        dailyChannelWiseUnsub.forEach(element => {
            let date = element.date;
            let source = element.source;
            let count = element.count;
            
            let present = isDatePresent(records, date);
            if(present){
                if(source === "app" || source == "na"){
                    present.app = (present.app + count);
                    present.total = (present.total + count);
                }else if(source === "web"){
                    present.web = (present.web + count);
                    present.total = (present.total + count);
                }else if(source === "sms"){
                    present.sms = (present.sms + count);
                    present.total = (present.total + count);
                }else if(source === "CC"){
                    present.cc = (present.cc + count);
                    present.total = (present.total + count);
                }else if(source === "CP"){
                    present.cp = (present.cp + count);
                    present.total = (present.total + count);
                }
            }else{
                let expiredBySystem = isDatePresent(dailyExpiredBySystem, date);
                let app = (source === "app" || source == "na") ? count : 0;
                let web = source === "web" ? count : 0;
                let sms = source === "sms" ? count : 0;
                let cc = source === "CC" ? count : 0;
                let cp = source === "CP" ? count : 0;
                let expired = expiredBySystem !== undefined ? expiredBySystem.count : 0;

                let total = (app + web + sms + cc + cp + expired);

                let object = {date: date, app: app, web: web, sms: sms, cc: cc, cp: cp, expired: expired, total: total};
                records.push(object);
            }
            
        });

        await dailyChannelWiseUnsubWriter.writeRecords(records);
        console.log("=> done 3");
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            // to:  ["farhan.ali@dmdmax.com"],
            to:  ["paywall@dmdmax.com.pk","nauman@dmdmax.com"], // list of receivers
            subject: `Daily Source Wise Unsubscribed Users Report`, // Subject line
            text: `This report (generated at ${(new Date()).toDateString()}) contains count of unsubscribed users with respect to source.\n\nNote: Expired By System column indicates those users expired by the system because their grace time is over and they still have no balance.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallChannelWiseUnsubReport,
                    path: paywallChannelWiseUnsubReportFilePath
                }
            ]
        });
        console.log("=> [dailyChannelWiseUnsub][emailSent]",info);
        fs.unlink(paywallChannelWiseUnsubReportFilePath,function(err,data) {
            if (err) {
                console.log("=> File not deleted[dailyChannelWiseUnsub]");
            }
            console.log("=> File deleted [dailyChannelWiseUnsub]");
        });
    } catch (error) {
        console.error("=>", error);
    }
}

dailyChannelWiseTrialActivated = async() => {
    try {
        console.log("[dailyChannelWiseTrialActivated]");
        let records = [];
        let dailyChannelWiseTrial = await billinghistoryRepo.dailyChannelWiseTrialActivated(); 

        dailyChannelWiseTrial.forEach(element => {
            let date = element.date;
            let source = element.source;
            let count = element.count;
            
            let present = isDatePresent(records, date);
            if(present){
                if(source === "app"){
                    present.app = (present.app + count);
                    present.total = (present.total + count);
                }else if(source === "web"){
                    present.web = (present.web + count);
                    present.total = (present.total + count);
                }else if(source === "HE"){
                    present.HE = (present.HE + count);
                    present.total = (present.total + count);
                }
            }else{
                let app = source === "app" ? count : 0;
                let web = source === "web" ? count : 0;
                let HE = source === "HE" ? count : 0;
                let total = (app + web + HE);

                let object = {date: date, app: app, web: web, HE: HE, total: total};
                records.push(object);
            }
            
        });

        await dailyChannelWiseTrialWriter.writeRecords(records);

        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            // to:  ["paywall@dmdmax.com.pk"],
            to:  ["paywall@dmdmax.com.pk","mikaeel@dmdmax.com"], // list of receivers
            subject: `Source Wise Trial Activated Report`, // Subject line
            text: `This report (generated at ${(new Date()).toDateString()}) contains count of trials activated with respect to source.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallChannelWiseTrial,
                    path: paywallChannelWiseTrialFilePath
                }
            ]
        });
        console.log("[dailyChannelWiseTrialActivated][emailSent]",info);
        fs.unlink(paywallChannelWiseTrialFilePath,function(err,data) {
            if (err) {
                console.log("File not deleted[paywallChannelWiseTrial]");
            }
            console.log("File deleted [dailyChannelWiseTrialActivated]");
        });
    } catch (error) {
        console.error(error);
    }
}

function isDatePresent(array, dateToFind) {
    const result = array.find(o => new Date(o.date).getTime() === new Date(dateToFind).getTime());
    return result;
}

function isMultipleDatePresent(array, date1ToFind) {
    let newDate1ToFind = new Date(date1ToFind);

    const result = array.find(o =>
         new Date(o.trial_date).getTime() === newDate1ToFind.getTime()
         );
    return result;
}

dailyTrialToBilledUsers = async() => {
    try {
        let trialToBilled = await subscriptionRepo.dailyTrialToBilledUsers();
        let trialToBilledUsers = [];

        trialToBilled.forEach(element => {
            let trialDate = undefined;
            let BreakException = {};

            try{
                element.usershistory.forEach(subElement => {
                    if(subElement.billing_status === 'trial'){
                        trialDate = new Date(subElement.billing_dtm);
                        trialDate.setHours(0, 0, 0, 0);

                    }else if(subElement.billing_status === 'Success' && (!subElement.micro_charge || (subElement.micro_charge && subElement.micro_charge === false))){
                        let billingDate = new Date(subElement.billing_dtm);
                        billingDate.setHours(0, 0, 0, 0);

                        var trialNextDay = new Date(trialDate);
                        trialNextDay.setDate(trialNextDay.getDate() + 1);

                        if(trialNextDay.getTime() === billingDate.getTime()){
                            // Means user is billed right after next day of trial
                            let currentObj = isMultipleDatePresent(trialToBilledUsers, trialDate);
                            if(currentObj){
                                currentObj.msisdn.push({"msisdn":element.msisdn});
                                currentObj.total = (currentObj.total + 1);
                            }else{
                                //console.log('trialToBilledUsers', trialDate, ' --- ', trialNextDay, ' --- ', billingDate);
                                let object = {};
                                object.trial_date = trialDate;
                                object.billed_date = billingDate;
                                object.msisdn = [{"msisdn":element.msisdn}];
                                object.total = 1;
                                trialToBilledUsers.push(object);
                            }
                            throw BreakException;
                        }
                    }
                });
            }catch(e){
                if(e !== BreakException)
                    throw e;
            }
        });

        let today = new Date();
        today.setHours(today.getHours() - 24);
        today.setHours(0, 0, 0, 0);

        let lastTenDays = new Date();
        lastTenDays.setDate(lastTenDays.getDate() - 11);
        lastTenDays.setHours(0, 0, 0, 0);

        trialToBilledUsers.forEach(element => {
            element.msisdn = JSON.stringify(element.msisdn);
        });
        

        let trialToBilledUserToWr = trialToBilledUsers.sort(function (a,b){
            return   b['trial_date'] - a['trial_date'];
        })

        await csvTrialToBilledUsers.writeRecords(trialToBilledUserToWr);
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            // to:  ["hamza@dmdmax.com"],
            to:  ["paywall@dmdmax.com.pk", "nauman@dmdmax.com", "mikaeel@dmdmax.com"], // list of receivers
            subject: 'Trial To Billed Users',
            text: `This report (generated at ${(new Date()).toDateString()}) contains count of users who are directly billed after trial from ${lastTenDays} to ${today}.\nNote: You can ignore the current date row.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallTrialToBilledUsers,
                    path: paywallTrialToBilledUsersFilePath
                }
            ]
        });
        console.log("[trialToBilledUsers][emailSent]", info);
        fs.unlink(paywallTrialToBilledUsersFilePath,function(err,data) {
            if (err) {
                console.log("File not deleted");
            }
            console.log("data");
        });
    } catch (error) {
        console.error(error);
    }
}

dailyFullAndPartialChargedUsers = async() => {
    try {
        console.log("=> dailyFullAndPartialChargedUsers");
        let dailyReport = await billinghistoryRepo.getDailyFullyChargedAndPartialChargedUsers();
        console.log("=> done 1");
        let array = [];

        dailyReport.forEach(element => {
            let obj = isDatePresent(array, element.date);
            if(!obj){
                obj = {date: element.date};
                array.push(obj);
            }

            if(element.micro_charge_state === true){
                obj.partially_charged_users = element.total;
            }else{
                obj.fully_charged_users = element.total;
            }
            obj.total = obj.total ? (obj.total + element.total) : element.total;
        });

        await csvFullAndPartialCharged.writeRecords(array);
        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk',
            // to:  ["farhan.ali@dmdmax.com"],
            to:  ["paywall@dmdmax.com.pk",  "mikaeel@dmdmax.com", "nauman@dmdmax.com"], // list of receivers
            subject: 'Full & Partial Charged Users',
            text: `This report (generated at ${(new Date()).toDateString()}) contains count of full & partial charged users.`, // plain text bodyday
            attachments:[
                {
                    filename: paywallFullAndPartialChargedReport,
                    path: paywallFullAndPartialChargedReportFilePath
                }
            ]
        });
        console.log("=> [fullAndPartialChargedUsers][emailSent]", info);
        fs.unlink(paywallFullAndPartialChargedReportFilePath,function(err,data) {
            if (err) {
                console.log("=> File not deleted");
            }
            console.log("=> ", data);
        });
    } catch (error) {
        console.error("=>", error);
    }
}

dailyPageViews = async() => {
    console.log("***=> sending email")
    pageViews.connect().then(async(db) => {
        pageViews.getPageViews(db).then(async(pvs) => {
            console.log("***=>", pvs);
            await csvAffiliatePvs.writeRecords(pvs);
                var info = await transporter.sendMail({
                from: 'paywall@dmdmax.com.pk',
                // to:  ["hamza@dmdmax.com"],
                to:  ["paywall@dmdmax.com.pk","nauman@dmdmax.com", "mikaeel@dmdmax.com"], // list of receivers
                subject: 'Affiliate Page Views',
                text: `This report (generated at ${(new Date()).toDateString()}) contains affiliate page views`, // plain text bodyday
                attachments:[
                    {
                        filename: affiliatePvs,
                        path: affiliatePvsFilePath
                    }
                ]
            });
            console.log("***=> [csvAffiliatePvs][emailSent]", info);
            fs.unlink(affiliatePvsFilePath,function(err,data) {
                if (err) {
                    console.log("***=>File not deleted");
                }
                console.log("***=>", data);
            });
        }).catch(err => {
            console.log("***=>", err);
        });
        }).then(err => {
            console.log(err);
        });
}

getTotalUserBaseTillDate = async(from, to) => {
    let result = await usersRepo.getTotalUserBaseTillDate(from, to);
    await csvTotalBase.writeRecords(result);

    var info = await transporter.sendMail({
        from: 'paywall@dmdmax.com.pk', // sender address
        to:  ["paywall@dmdmax.com.pk", "mikaeel@dmdmax.com"],
        //to:  ["paywall@dmdmax.com.pk","zara.naqi@telenor.com.pk","mikaeel@dmdmax.com"], // list of receivers
        subject: `Paywall Total Base`, // Subject line
        text: `This report contains total user base from ${new Date(from)} to ${new Date(to)}.`,
        attachments:[
            {
                filename: paywallTotalBase,
                path: paywallTotalBaseFilePath
            }
        ]
    });
    console.log("[totalBase][emailSent]",info);
    fs.unlink(paywallTotalBaseFilePath,function(err,data) {
        if (err) {
            console.log("File not deleted[totalBase]");
        }
        console.log("File deleted [totalBase]");
    });
}

getExpiredBase = async(from, to) => {
    let result = await usersRepo.getExpiredBase(from, to);
    await csvExpiredBase.writeRecords(result);

    var info = await transporter.sendMail({
        from: 'paywall@dmdmax.com.pk', // sender address
        to:  ["paywall@dmdmax.com.pk", "mikaeel@dmdmax.com"],
        //to:  ["paywall@dmdmax.com.pk","zara.naqi@telenor.com.pk","mikaeel@dmdmax.com"], // list of receivers
        subject: `Paywall Expired Base`, // Subject line
        text: `This report contains total expired base from ${new Date(from)} to ${new Date(to)}.`,
        attachments:[
            {
                filename: paywallExpiredBase,
                path: paywallExpiredBaseFilePath
            }
        ]
    });
    console.log("[expiredBase][emailSent]",info);
    fs.unlink(paywallExpiredBaseFilePath,function(err,data) {
        if (err) {
            console.log("File not deleted[expiredBase]");
        }
        console.log("File deleted [expiredBase]");
    });
}

getInactiveBase = async(from, to) => {
    let result = await usersRepo.getActiveUsers(from, to);

    let totalLength = result.length;
    let count = 0;
    console.log("*** Length: "+totalLength);

    let finalResult = [];
    let fiveDaysBack = new Date();
    fiveDaysBack.setDate(fiveDaysBack.getDate() - 5);

    let promise = new Promise((resolve, reject) => {
        result.forEach((user) => {
            getViewLogs(user._id).then((viewLog) => {
                console.log("*** Got result for ", user.msisdn);
    
                let latestLogTime = new Date(viewLog.added_dtm);
                if(fiveDaysBack.getTime() > latestLogTime.getTime()){
                    // Means 5 days passed user last visited app/web
                    finalResult.push({"msisdn": user.msisdn});
                }
            }).catch((err) => {
                //console.log("error ", err);
            }).finally(() => {
                console.log("*** Finally");
                count+=1;

                if (count === totalLength){
                    console.log("*** Resolved"); 
                    resolve();
                }
            });
        });
    });
    
    promise.then(async() => {
        console.log("*** ALL DONE");
        await csvInActiveBase.writeRecords(finalResult);

        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            to:  ["paywall@dmdmax.com.pk", "mikaeel@dmdmax.com"],
            //to:  ["paywall@dmdmax.com.pk","zara.naqi@telenor.com.pk","mikaeel@dmdmax.com"], // list of receivers
            subject: `Paywall InActive Base`, // Subject line
            text: `This report contains inactive base from ${new Date(from)} to ${new Date(to)}.\nInActive: Have not opened App/Web in last 5 days but are subscribed users`,
            attachments:[
                {
                    filename: paywallInActiveBase,
                    path: paywallInActiveBaseFilePath
                }
            ]
        });
        console.log("*** [paywallInActiveBase][emailSent]",info);
        fs.unlink(paywallInActiveBaseFilePath,function(err,data) {
            if (err) {
                console.log("*** File not deleted[paywallInActiveBase]");
            }
            console.log("*** File deleted [paywallInActiveBase]");
        });
    })
}

getInactiveBaseHavingViewLogsLessThan3 = async(from, to) => {
    let result = await usersRepo.getActiveUsers(from, to);
    let finalResult = [];
    let totalLength = result.length;
    let count = 0;
    console.log("*** Length: "+totalLength);

    let promise = new Promise((resolve, reject) => {
        result.forEach((user) => {
            getNumberOfViewLogs(user._id).then((count) => {
                console.log("*** Got result for ", user.msisdn, ' - ', count);
    
                if(count < 3){
                    // Means user visited app/web for once/twice
                    finalResult.push({"msisdn": user.msisdn});
                }
            }).catch((err) => {
                //console.log("error ", err);
            }).finally(() => {
                count+=1;

                if (count === totalLength){
                    console.log("*** Resolved"); 
                    resolve();
                }
            });
        });
    });
    
    promise.then(async() => {
        console.log("*** ALL DONE");
        await csvInActiveBase.writeRecords(finalResult);

        var info = await transporter.sendMail({
            from: 'paywall@dmdmax.com.pk', // sender address
            to:  ["paywall@dmdmax.com.pk", "mikaeel@dmdmax.com"],
            //to:  ["paywall@dmdmax.com.pk","zara.naqi@telenor.com.pk","mikaeel@dmdmax.com"], // list of receivers
            subject: `Paywall InActive Base`, // Subject line
            text: `This report  contains inactive base from ${new Date(from)} to ${new Date(to)}.\nInActive: Users who only opened app once/twice since subscribing.`,
            attachments:[
                {
                    filename: paywallInActiveBase,
                    path: paywallInActiveBaseFilePath
                }
            ]
        });
        console.log("*** [paywallInActiveBase][emailSent]",info);
        fs.unlink(paywallInActiveBaseFilePath,function(err,data) {
            if (err) {
                console.log("*** File not deleted[paywallInActiveBase]");
            }
            console.log("*** File deleted [paywallInActiveBase]");
        });
    })
}


generateUsersReportWithTrialAndBillingHistory = async(from, to) => {
    console.log("=> generateUsersReportWithTrialAndBillingHistory - from ", from, " to ", to);
    let finalResult = [];
    
    let aff_mids = [{affiliate_mid: "goonj"},{affiliate_mid: "1569"},{affiliate_mid: "gdn"},
        {affiliate_mid: "gdn2"},{affiliate_mid: "aff3"},{affiliate_mid: "aff3a"}
    ]

    let affMidsSubscriptions = await subscriptionRepo.getSubscriptionsForAffiliateMids(aff_mids, from, to);
    
    for(let i = 0; i < affMidsSubscriptions.length; i++){
        console.log("=> fetching data for affiliate mid ",affMidsSubscriptions[i]._id);
        let subscriber_ids = affMidsSubscriptions[i].subscriber_ids;
        let result = await billinghistoryRepo.getBillingDataForSpecificSubscriberIds(subscriber_ids);
        
        for(let j = 0; j < result.length; j++){
            console.log("=> user_id", result[j].user_id);
            
            let dataPresent = isDataPresent(finalResult, result[j].user_id);
            if(dataPresent){
                if(result[j].billing_status === "Success"){
                    dataPresent.success_transactions = dataPresent.success_transactions + 1;
                    dataPresent.amount = dataPresent.amount + result[j].price;
                }else if(result[j].billing_status === "trial"){
                    dataPresent.code = 0;
                }
            }else{
                let singleObject = {};
                singleObject.mid = affMidsSubscriptions[i]._id;
                singleObject.user_id = result[j].user_id;
                
                if(result[j].billing_status === "Success"){
                    singleObject.success_transactions = 1;
                    singleObject.amount = result[j].price;
                    singleObject.code = 1;
                }else if(result[j].billing_status === "trial"){
                    singleObject.success_transactions = 0;
                    singleObject.amount = 0;
                    singleObject.code = 0
                }
                finalResult.push(singleObject);
            }
        }
    }
    
    console.log("=>", JSON.stringify(finalResult));

    console.log("=> Sending email");
    await usersReportWithTrialAndBillingHistoryWriter.writeRecords(finalResult);
    let info = await transporter.sendMail({
        from: 'paywall@dmdmax.com.pk',
        to:  ["farhan.ali@dmdmax.com"],
        subject: `Users With Trial & Billing Details`, // Subject line
        text: `This report contains affiliate users with trial and billing details from ${new Date(from)} to ${new Date(to)}.\nNote: code 0 indicates trial and code 1 indicates subscribed directly`,
        attachments:[
            {
                filename: usersReportWithTrialAndBillingHistory,
                path: usersReportWithTrialAndBillingHistoryFilePath
            }
        ]
    });

    console.log("=> [usersReportWithTrialAndBillingHistory][emailSent]",info);
    fs.unlink(usersReportWithTrialAndBillingHistoryFilePath,function(err,data) {
        if (err) {
            console.log("=> File not deleted[usersReportWithTrialAndBillingHistory]");
        }
        console.log("=> File deleted [usersReportWithTrialAndBillingHistory]");
    });
}

function isDataPresent(array, user_id) {
    const result = array.find(o => o.user_id === user_id);
    return result;
}

function getViewLogs(user_id){
    return new Promise(async(resolve, reject) => {
        try{
            let viewLog = await viewLogsRepo.getLatestViewLog(user_id);
            if(viewLog){
                resolve(viewLog);
            }else{
                reject("Not found");
            }
        }catch(err){
            reject(err);
        }
    });
}

function getNumberOfViewLogs(user_id){
    return new Promise(async(resolve, reject) => {
        try{
            let viewLog = await viewLogsRepo.getNumberOfViewLogs(user_id);
            if(viewLog){
                resolve(viewLog);
            }else{
                reject("Not found");
            }
        }catch(err){
            reject(err);
        }
    });
}

function getCurrentDate(){
    var dateObj = new Date();
    var month = dateObj.getMonth() + 1; //months from 1-12
    var day = dateObj.getDate();
    var year = dateObj.getFullYear();
    let newdate = day + "-" + month + "-" + year;
    return newdate;
}

module.exports = {
    dailyReport: dailyReport,
    callBacksReport: callBacksReport,
    errorCountReport: errorCountReport,
    dailyUnsubReport: dailyUnsubReport,
    dailyFullAndPartialChargedUsers: dailyFullAndPartialChargedUsers,
    dailyTrialToBilledUsers: dailyTrialToBilledUsers,
    dailyChannelWiseUnsub: dailyChannelWiseUnsub,
    dailyChannelWiseTrialActivated: dailyChannelWiseTrialActivated,
    dailyPageViews: dailyPageViews,
    getTotalUserBaseTillDate: getTotalUserBaseTillDate,
    getExpiredBase: getExpiredBase,
    getInactiveBase: getInactiveBase,
    getInactiveBaseHavingViewLogsLessThan3: getInactiveBaseHavingViewLogsLessThan3,
    dailyNetAddition: dailyNetAddition,
    avgTransactionPerCustomer: avgTransactionPerCustomer,
    dailyReturningUsers: dailyReturningUsers,
    weeklyRevenue: weeklyRevenue,
    weeklyTransactingCustomers: weeklyTransactingCustomers,
    generateUsersReportWithTrialAndBillingHistory:generateUsersReportWithTrialAndBillingHistory,
    generateReportForAcquisitionSourceAndNoOfTimeUserBilled: generateReportForAcquisitionSourceAndNoOfTimeUserBilled
}