const awilix = require('awilix');
const container = awilix.createContainer({
    injectionMode: awilix.InjectionMode.PROXY
});
// Services
const EmailService = require("../services/EmailService");
// Queue Consumers
const SubscriberQueryConsumer = require("../repos/queue/consumers/SubscriptionConsumer");
// Repositories
const SubscriberRepository = require('../repos/SubscriberRepo');
const SubscriptionRepository = require('../repos/SubscriptionRepo');
const BillingHistoryRepository = require('../repos/BillingHistoryRepo');
const TPSCountRepository = require('../repos/tpsCountRepo');
const BillingRepository = require('../repos/BillingRepo');
const PackageRepository = require('../repos/PackageRepo');
const MessageRepository = require('../repos/MessageRepo');
const SystemUserRepository = require('../repos/SystemUserRepo');
const UserRepository = require('../repos/UserRepo');
const ChargingAttemptRepository = require('../repos/ChargingAttemptRepo');
const PaywallRepository = require('../repos/PaywallRepo');
const MigrationRepository = require('../repos/MigrationRepository');
const PaymentSourceRepository = require("../repos/PaymentSourceRepo");

// Services
const PaywallService = require('../services/PaywallService');
const SubscriptionService = require('../services/SubscriptionService');
const TelenorBillingService = require('../services/TelenorBillingService');
const SystemUserService = require('../services/SystemUserService');
const EasypaisaPaymentService = require('../services/EasypaisaPaymentService');
const PaymentProcessService = require('../services/PaymentProcessService');

const Constants = require('./constants');
//scripts
const RemoveDuplicateMsisdnsScript = require('../scripts/removeDuplicateMsisdns');

container.register({
    // Here we are telling Awilix how to resolve a
    // userController: by instantiating a class.
    emailService: awilix.asClass(EmailService).singleton(),
    // Consumers 
    subscriptionConsumer: awilix.asClass(SubscriberQueryConsumer).singleton(),
    // Repositories 
    subscriberRepository: awilix.asClass(SubscriberRepository).singleton(),
    subscriptionRepository: awilix.asClass(SubscriptionRepository).singleton(),
    billingHistoryRepository: awilix.asClass(BillingHistoryRepository).singleton(),
    tpsCountRepository: awilix.asClass(TPSCountRepository).singleton(),
    billingRepository: awilix.asClass(BillingRepository).singleton(),
    packageRepository: awilix.asClass(PackageRepository).singleton(),
    messageRepository: awilix.asClass(MessageRepository).singleton(),
    paywallRepository: awilix.asClass(PaywallRepository).singleton(),
    userRepository: awilix.asClass(UserRepository).singleton(),
    chargingAttemptRepository: awilix.asClass(ChargingAttemptRepository).singleton(),
    migrationRepository: awilix.asClass(MigrationRepository).singleton(),
    paymentSourceRepository: awilix.asClass(PaymentSourceRepository).singleton(),

    //SErvices
    telenorBillingService: awilix.asClass(TelenorBillingService).singleton(),
    systemUserRepository: awilix.asClass(SystemUserRepository).singleton(),
    systemUserService: awilix.asClass(SystemUserService).singleton(),
    paywallService : awilix.asClass(PaywallService).singleton(),
    subscriptionService : awilix.asClass(SubscriptionService).singleton(),
    easypaisaPaymentService: awilix.asClass(EasypaisaPaymentService).singleton(),
    paymentProcessService: awilix.asClass(PaymentProcessService).singleton(),

    //scripts
    removeDuplicateMsisdns: awilix.asClass(RemoveDuplicateMsisdnsScript).singleton(),

    // constants:
    constants: awilix.asClass(Constants).singleton()
  });

module.exports = container;  