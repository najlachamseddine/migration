class MigrateAssetsParams {


    constructor(dltKey, erc20TokenAddress, assetsAmount, destinationLedger, addressOnDestinationLedger, feePrice, feeLimit) {
        this.dltKey = dltKey;
        this.erc20TokenAddress = erc20TokenAddress;
        this.assetsAmount = assetsAmount;
        this.destinationLedger = destinationLedger;
        this.addressOnDestinationLedger = addressOnDestinationLedger;
        this.feePrice = feePrice;
        this.feeLimit = feeLimit;
    }    
}

exports.default = MigrateAssetsParams; 