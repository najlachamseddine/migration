//*************************************SECTION 1: Imports and Object Creation *************************************************/

const request = require('request-promise-native');
const DltNames = require('../../overledger-sdk-javascript/packages/overledger-dlt-abstract/dist/AbstractDLT').DltNames;
const TrustlineCreationParams = require('../TypeDefinitions/TrustlineCreationParams').default;
const DltKey = require('../TypeDefinitions/DltKey').default;
const IssuedCurrencyPaymentParams = require('../TypeDefinitions/IssuedCurrencyPaymentParams').default;
const WithdrawAssetsParams = require('../TypeDefinitions/WithdrawAssetsParams').default;
const computePublicKeyFromPrivateKey = require('../crypto-utils').computePublicKeyFromPrivateKey;
const signMessage = require('../crypto-utils').signMessage;
const ReadParams = require('../TypeDefinitions/ReadParams').default;
const WithdrawalControl = require('../TypeDefinitions/WithdrawalControl').default;
const RequestVarParams = require('../TypeDefinitions/RequestVarParams').default;

//Party B's knowledgebase:
const treatyContractUrl = "http://localhost:4001";
const xrpPrivateKey = "sn7L76XFhNkCDgunGPbrxSvappogc";
const xrpAddress = "rh8wzXoMktddJYC7T48bn56gWqFVesqcub";
// const ethPrivateKey = "0xd63e032ab4d8cda9c29bd7dd331f69e400ff7fbdb590fc6da5aee32975e53eab";
// const ethAddress = "0xb5edb7f5F4e8133E90c2DEcF16cbeCD72C39621F";  //quantXSender account LR mac metamask
const ethPrivateKey = "0x3FF22F5B016E967FFF2999254FB91691331E7B6130D12ED3B69B69873B330853";
const ethAddress = "0x105360Ba21773A9175A8daba66CA6C7654F7A3f2"; // najla MM account Party B

// const xrpPartyAAddress = "rHB8SkbEunsw8Mpc1YcXE2TM2mJrttiJ9Z"; // should be read from the SC
const issuedCurrency = "FAU";
const xrpDltKey = new DltKey(DltNames.xrp, xrpAddress, xrpPrivateKey);
const ethDltKey = new DltKey(DltNames.ethereum, ethAddress, ethPrivateKey);

const xrpOracleAddress = "rJtQ49e8JJDxRfmHWCX8bR6C62VGw69j8M";
const amount = 2;
const decimals = 18;
const tokensAmountToWithdraw = amount * Math.pow(10, decimals);

// Proof of account holder when request for assets withdrawal
const message = "oracle";
const hexPubKey = computePublicKeyFromPrivateKey(xrpPrivateKey);
const messageSignature = signMessage(message, xrpPrivateKey);


//flow structure:
runFlow();

async function runFlow() {
    
    // **** Wait for a migration to be finished ****
    const migrationCompletedParams = new RequestVarParams(ethDltKey, "completedMigrations");
    const migrationId = await getRequestId(migrationCompletedParams);
    console.log(`last migration Id `, migrationId);
    let newMigrationId = migrationId;
    while (newMigrationId <= migrationId) {
        sleep(5000);
        newMigrationId = await getRequestId(migrationCompletedParams);
    }

    // ***** Should call getBalance to see if Party A can send ERC20 Token to it ?
    // ***** Create a trustline to Party A  *****
    // !!!! getBalances of party A as well
    // **** Read that a trustline with Oracle is created : read value FROM SM oracleTrustlineTxID if set *****
    const withdrawalTotalParams = new RequestVarParams(ethDltKey, "totalWithdrawalRequests");
    const withdrawalId = await getRequestId(withdrawalTotalParams);
    console.log(`withdrawalId `, withdrawalId);

    // ***** Get user user from which a trustline will be created for payment Party A *****
    let readParams = new ReadParams(ethDltKey, migrationId, 'getMigrationDestinationAccount', '13000000000', '4397098');
    let xrpPartyAAddress = await readData(readParams);
    while (!xrpPartyAAddress || xrpPartyAAddress.msg.result[0] === '') {
        sleep(3000);
        xrpPartyAAddress = await readData(readParams);
    }
    console.log(`xrpPartyAAddress `, xrpPartyAAddress);

    const trustlineCreation = new TrustlineCreationParams(xrpDltKey, issuedCurrency, xrpPartyAAddress.msg.result[0], amount.toString(), '12', '4294967295');
    const trustlineCreationHash = await createTrustlineTransaction(trustlineCreation);
    console.log(`trustlineCreationHash `, trustlineCreationHash);

    // **** withdrawAssetsRequest  *****
    const withdrawAssets = new WithdrawAssetsParams(ethDltKey, tokensAmountToWithdraw, DltNames.xrp, xrpAddress, "0x" + hexPubKey, "0x" + messageSignature, '13000000000', '4397098');
    console.log(`withdrawAssets `, withdrawAssets);
    const withdrawAssetsRequestHash = await withdrawERC20AssetsToUnlock(withdrawAssets);
    console.log(`withdrawAssetsRequestHash `, withdrawAssetsRequestHash);

    // **** Wait some time before reading data set by Party A (payment) and the trustline (Oracle)
    sleep(5000);

    // **** Read that a trustline with Oracle is created : read value FROM SM oracleTrustlineTxID if set *****
    readParams = new ReadParams(ethDltKey, withdrawalId, 'getWithdrawalOracleTrustlineTxID', '13000000000', '4397098');
    let oracleTrustlineHash = await readData(readParams);
    while (!oracleTrustlineHash || oracleTrustlineHash.msg.result[0] === '') {
        sleep(3000);
        oracleTrustlineHash = await readData(readParams);
    }
    console.log(`oracleTrustlineHash `, oracleTrustlineHash);

    // **** Read that the payment from Party A is done : read value FROM SM otherLedgerIncomeTxID if set  *****
    readParams = new ReadParams(ethDltKey, withdrawalId, 'getWithdrawalOtherLedgerIncomeTxID', '13000000000', '4397098');
    let incomePaymentHash = await readData(readParams);
    while (incomePaymentHash.msg.result[0] === '') {
        sleep(3000);
        incomePaymentHash = await readData(readParams);
    }
    console.log(`incomePaymentHash `, incomePaymentHash);

    // **** Do a payment to the oracle of 2 FAU  *****
    if (oracleTrustlineHash.success && oracleTrustlineHash.msg.result[0] !== '' && incomePaymentHash.success && incomePaymentHash.msg.result[0] !== '') {
        const issuedCurrencyPaymentParams = new IssuedCurrencyPaymentParams(xrpDltKey, xrpOracleAddress, amount.toString(), issuedCurrency, '12', '4294967295');
        const paymentHash = await makeIssuedCurrencyPayment(issuedCurrencyPaymentParams);
        console.log(`paymentHash `, paymentHash);
        // **** SM setOtherLedgerWithdrawalTransaction  *****
        const otherLedgerWithdrawalTransaction = new WithdrawalControl(ethDltKey, 'setOtherLedgerWithdrawalTransaction', 'otherLedgerTxHash', withdrawalId, paymentHash.msg.transactionHash, '13000000000', '4397098');
        const setTransaction = await setOtherLedgerWithdrawalTransaction(otherLedgerWithdrawalTransaction);
        console.log(`setTransaction `, setTransaction);
    }
}

async function createTrustlineTransaction(createTrustlineObj) {
    console.log("****Create-Trustline-PartyB-PartyA****");
    const options = {
        uri: new URL("CreateTrustline", treatyContractUrl).href,
        body: createTrustlineObj,
        json: true
    }
    const resp = await request.post(options);
    return resp;
}


async function withdrawERC20AssetsToUnlock(withdrawAssetObj) {
    console.log("****Withdraw-assets-Request-PartyB****");
    const options = {
        uri: new URL("WithdrawAssetRequest", treatyContractUrl).href,
        body: withdrawAssetObj,
        json: true
    }
    const resp = await request.post(options);
    return resp;
}

async function makeIssuedCurrencyPayment(issuedCurrencyPaymentParams) {
    console.log("****make-Issued-Currency-Payment-PartyB-To-Oracle-Through-Trustline****");
    const options = {
        uri: new URL("TradeAssetOnChain", treatyContractUrl).href,
        body: issuedCurrencyPaymentParams,
        json: true
    }
    const resp = await request.post(options);
    return resp;

}

async function readData(readDataParams) {
    console.log("****Read-Data-For-Migration-Or-Withdrawal****");
    const options = {
        uri: new URL("readMigrationWithdraw", treatyContractUrl).href,
        body: readDataParams,
        json: true
    }
    const resp = await request.post(options);
    return resp;
}

async function getRequestId(reqParams) {
    console.log("****Read-Request-Id****");
    const options = {
        uri: new URL("readRequestId", treatyContractUrl).href,
        body: reqParams,
        json: true
    }
    const resp = await request.post(options);
    return resp;
}


async function setOtherLedgerWithdrawalTransaction(paymentParams) {
    console.log("****Set-withdrawal-control-payment-to-Oracle****");
    const options = {
        uri: new URL("setWithdrawalControl", treatyContractUrl).href,
        body: paymentParams,
        json: true
    }
    const resp = await request.post(options);
    return resp;
}


/**
 * Sleeps for a number of miliseconds
 * @param {*} ms - the number of miliseconds
 */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}