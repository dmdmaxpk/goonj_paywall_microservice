const env = process.env.NODE_ENV || 'development';

// application gets environment from either system envs or from this file in above line.

const codes = {
    code_error: -1,
    code_success: 0,
    code_record_added: 1,
    code_record_updated: 2,
    code_record_deleted: 3,

    code_invalid_data_provided: 4,
    code_record_already_added: 5,
}

let config = {
    development: {
        port: '4000',
        mongoDB: 'mongodb://localhost:27017/goonj_users',
        codes: codes
    },
    staging: {
        port: '4000',
        mongoDB: 'mongodb://localhost:27017/goonj_users',
        codes: codes
    },
    production: {
        port: '4000',
        mongoDB: 'mongodb://localhost:27017/goonj_users',
        codes: codes
    }
};

console.log("---", env);

if (env === 'development') config = config.development;
if (env === 'staging') config = config.staging;
if (env === 'production') config = config.production;

module.exports = config;
