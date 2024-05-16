class CompleteMigrationParams {


    constructor(dltKey, migrationId, transactionHash, status, feePrice, feeLimit) {
        this.dltKey = dltKey;
        this.migrationId = migrationId;
        this.transactionHash = transactionHash;
        this.status = status;  
        this.feePrice = feePrice;
        this.feeLimit = feeLimit;    
    }    
}

exports.default = CompleteMigrationParams; 