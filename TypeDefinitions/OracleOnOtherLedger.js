class OracleOnOtherLedger {

    constructor(dltKey, accounts, feePrice, feeLimit) {
        this.dltKey = dltKey;
        this.accounts = accounts;
        this.feePrice = feePrice;
        this.feeLimit = feeLimit;
    }

}

exports.default = OracleOnOtherLedger;
