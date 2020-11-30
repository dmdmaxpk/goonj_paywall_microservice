const moment = require('moment');

class RevenueStatisticsService {
    constructor({billingHistoryRepository}){
        this.billingHistoryRepo = billingHistoryRepository;
    }

    async getRevenueStatsDateWise(from, to){

        console.log('from, to : ',from, to);
        let dataArr = [];
        //Get day and month for date
        let todayDay = moment(from).format('DD');
        let todayMonth = moment(from).format('MMM');

        //Push Date
        dataArr.push({'date': todayDay+ ' ' +todayMonth});
        console.log('date: ', JSON.stringify(dataArr))

        /*
        * Compute Revenue
        * */
        let revenue =  await this.billingHistoryRepo.getRevenueInDateRange(from, to);
        if (revenue.length > 0){
            revenue = revenue[0];
            dataArr.push({"revenue": revenue.total})
        }
        else{
            dataArr.push({"revenue": 0})
        }

        console.log('revenue: ', JSON.stringify(dataArr))

        /*
        * Get Total Count
        * */
        let requestCount =  await this.billingHistoryRepo.getBillingRequestCountInDateRange(from, to);
        if (requestCount.length > 0){
            requestCount = requestCount[0];
            responseArr.push({"total_requests": requestCount.total})
        }
        else{
            dataArr.push({"total_requests": 0})
        }
        console.log('requestCount: ', JSON.stringify(dataArr))

        /*
        * Get success and expire - subscription status
        * */
        let statusWise =  await this.billingHistoryRepo.getBillingStatsStatusWseInDateRange(from, to);
        let successful = {'successful_charged': 0}, unsubscribed = {'unsubscribe_requests': 0};
        for (let i = 0; i< statusWise.length; i++){
            if (statusWise[i]._id === 'Success')
                successful.successful_charged = statusWise[i].total;
            else if (data[i]._id === 'unsubscribe-request-received-and-expired')
                unsubscribed.unsubscribe_requests = statusWise[i].total;
        }
        dataArr.push(successful);
        dataArr.push(unsubscribed);
        console.log('statusWise: ', JSON.stringify(dataArr))

        /*
        * Get Insufficient Balance
        * */
        let insufficientBalance =  await this.billingHistoryRepo.getBillingInsufficientBalanceInDateRange(from, to);
        if (insufficientBalance.length > 0){
            insufficientBalance = insufficientBalance[0];
            dataArr.push({"insufficient_balance": insufficientBalance.total})
        }
        else{
            dataArr.push({"insufficient_balance": 0})
        }
        console.log('insufficientBalance: ', JSON.stringify(dataArr))

        return dataArr;
    }
}


module.exports = RevenueStatisticsService;