class TrustlineParams {

    constructor(type, currency, sender, counterparty) {
        this.type = type;
        this.currency = currency;
        this.sender = sender;
        this.counterparty = counterparty;
    }
}

exports.default = TrustlineParams;