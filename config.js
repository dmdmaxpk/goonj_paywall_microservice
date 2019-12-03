const env = process.env.NODE_ENV || 'development';

// application gets environment from either system envs or from this file in above line.

let config = {
    development: {
        port: '4000',
        mongoDB: 'mongodb://localhost:27017/users'
    },
    staging: {
        port: '4000',
        mongoDB: 'mongodb://localhost:27017/users'
    },
    production: {
        port: '4000',
        mongoDB: 'mongodb://localhost:27017/users'
    }
};

console.log("---", env);

if (env === 'development') config = config.development;
if (env === 'staging') config = config.staging;
if (env === 'production') config = config.production;

module.exports = config;
