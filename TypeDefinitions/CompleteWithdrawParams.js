class CompleteWithdrawParams {


    constructor(dltKey, withdrawId, status, feePrice, feeLimit) {
        this.dltKey = dltKey;
        this.withdrawId = withdrawId;
        this.status = status;  
        this.feePrice = feePrice;
        this.feeLimit = feeLimit;    
    }    
}

exports.default = CompleteWithdrawParams; 