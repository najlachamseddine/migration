class WithdrawAssetsParams {


    constructor(dltKey, assetsAmount, sourceLedger, otherLedgerAddress, otherLedgerPubKey, otherLedgerAddressOwnershipProof, feePrice, feeLimit) {
        this.dltKey = dltKey;
        this.assetsAmount = assetsAmount;
        this.sourceLedger = sourceLedger;
        this.otherLedgerAddress = otherLedgerAddress;
        this.otherLedgerPubKey = otherLedgerPubKey;
        this.otherLedgerAddressOwnershipProof = otherLedgerAddressOwnershipProof;
        this.feePrice = feePrice;
        this.feeLimit = feeLimit;
    }    
}

exports.default = WithdrawAssetsParams;