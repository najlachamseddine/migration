class IssuedCurrencyPaymentParams {

    constructor(dltKey, toAddress, amount, currency, feePrice, maxLedgerVersion ) {
        this.dltKey = dltKey;
        this.toAddress = toAddress;
        this.amount = amount;
        this.currency = currency;
        this.feePrice = feePrice;
        this.maxLedgerVersion = maxLedgerVersion;     
    }
}

exports.default = IssuedCurrencyPaymentParams;