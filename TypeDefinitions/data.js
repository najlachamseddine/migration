const TypeOptions = require('../../overledger-sdk-javascript/packages/overledger-types').TypeOptions;
const UintIntMOptions = require('../../overledger-sdk-javascript/packages/overledger-types').UintIntMOptions;

const functionsNames = {

    getMigrationUser: { type: TypeOptions.address },
    getMigrationLedger: { type: TypeOptions.string },
    getMigrationDestinationAccount: { type: TypeOptions.string },
    getMigrationAmount: { type: TypeOptions.uintM, uintIntMValue: UintIntMOptions.m256 },
    getMigrationOtherLedgerTxId: { type: TypeOptions.string },
    getMigrationCompleted: { type: TypeOptions.uintM, uintIntMValue: UintIntMOptions.m8 },
    getWithdrawalRequestAccount: { type: TypeOptions.address },
    getWithdrawalRequestFromLedger: { type: TypeOptions.string },
    getWithdrawalRequestAmount: { type: TypeOptions.uintM, uintIntMValue: UintIntMOptions.m256 },
    getWithdrawalRequestOtherLedgerTxID: { type: TypeOptions.string },
    getWithdrawalRequestOtherLedgerAddressProof: { type: TypeOptions.string },
    getWithdrawalRequestOtherLedgerPubKey: { type: TypeOptions.string },
    getWithdrawalRequestCompleted: { type: TypeOptions.uintM, uintIntMValue: UintIntMOptions.m8 },
    totalMigrationRequests: {type: TypeOptions.uintM, uintIntMValue: UintIntMOptions.m256},
    totalWithdrawalRequests: {type: TypeOptions.uintM, uintIntMValue: UintIntMOptions.m256},
    completedMigrations: {type: TypeOptions.uintM, uintIntMValue: UintIntMOptions.m256},
    contractIdentifier: { type: TypeOptions.string },
    getWithdrawalOracleTrustlineTxID: { type: TypeOptions.string },
    getWithdrawalOtherLedgerTxID: { type: TypeOptions.string },
    getWithdrawalOtherLedgerIncomeTxID: { type: TypeOptions.string },
    getWithdrawalOtherLedgerAddress: { type: TypeOptions.string }

};

exports.functionsNames = functionsNames;