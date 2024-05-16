class WithdrawalControl {
    
    constructor(dltKey, functionName, fieldName, withdrawId, transactionHash, feePrice, feeLimit) {
        this.dltKey = dltKey;
        this.functionName = functionName;
        this.fieldName = fieldName;
        this.withdrawId = withdrawId;
        this.transactionHash = transactionHash;
        this.feePrice = feePrice;
        this.feeLimit = feeLimit;
    }

}
exports.default = WithdrawalControl;