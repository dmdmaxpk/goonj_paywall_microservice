const mongoose = require('mongoose');
const Migration = mongoose.model('Migration');

class MigrationRepository {
    constructor(){
    }

    async createMigration(postData)  {
        let migration = new Migration(postData);
        return await migration.save();
    }
}


module.exports = MigrationRepository;