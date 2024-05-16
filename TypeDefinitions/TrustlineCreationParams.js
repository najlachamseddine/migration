class TrustlineCreationParams {

    constructor(dltKey, currency, counterparty, amount, feePrice, maxLedgerVersion) {
        this.dltKey = dltKey;
        this.currency = currency;
        this.counterparty = counterparty;
        this.amount = amount;
        this.feePrice = feePrice;
        this.maxLedgerVersion = maxLedgerVersion;
    }
}

exports.default = TrustlineCreationParams;