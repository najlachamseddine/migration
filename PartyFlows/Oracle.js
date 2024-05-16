//*************************************SECTION 1: Imports and Object Creation *************************************************/

//general imports
const request = require('request-promise-native');

const DltNames = require('../../overledger-sdk-javascript/packages/overledger-dlt-abstract/dist/AbstractDLT').DltNames;
const OracleOnOtherLedger = require('../TypeDefinitions/OracleOnOtherLedger').default;
const DltKey = require('../TypeDefinitions/DltKey').default;
const IssuedCurrencyPaymentParams = require('../TypeDefinitions/IssuedCurrencyPaymentParams').default;
const TrustlineCreationParams = require('../TypeDefinitions/TrustlineCreationParams').default;
const CompleteMigrationParams = require('../TypeDefinitions/CompleteMigrationParams').default;
const CompleteWithdrawParams = require('../TypeDefinitions/CompleteWithdrawParams').default;
const Account = require('../TypeDefinitions/Account').default;
const verifyMessageSource = require('../crypto-utils').verifyMessageSource;
const ReadParams = require('../TypeDefinitions/ReadParams').default;
const WithdrawalControl = require('../TypeDefinitions/WithdrawalControl').default;
const RequestVarParams = require('../TypeDefinitions/RequestVarParams').default;
const ReadOracleOnOtherLedgerParams = require('../TypeDefinitions/ReadOracleOnOtherLedgerParams').default;

const treatyContractUrl = "http://localhost:4002";
const xrpPrivateKey = "ssSc1NJDMSiYChWvXP9Mn6A77tE6k";
const xrpAddress = 'rJtQ49e8JJDxRfmHWCX8bR6C62VGw69j8M';
// const ethPrivateKey = "E5B5733CCC12729609E6AE601C82D82A1E22AA2E40A19D71954C820B07603AE1";
// const ethAddress = "0x74269e7c9D1e3f3937E8aF7b62Bc0B7795f15C1A"; //links to QuantXReceiver account LR's mac
const ethPrivateKey = "0x3683C26883ED1FA1AF666E8162BAE1976F39E04C77C1CB51D70C0DDBD67446A5"; // najla MM Account2
const ethAddress = "0x2c8251052663244f37BAc7Bde1C6Cb02bBffff93"; // najla

const ethDltKey = new DltKey(DltNames.ethereum, ethAddress, ethPrivateKey);
const xrpDltKey = new DltKey(DltNames.xrp, xrpAddress, xrpPrivateKey);

const xrpAccount = new Account(DltNames.xrp, xrpAddress);
const ethAccount = new Account(DltNames.ethereum, ethAddress);
const oracleOnOtherLedgerParams = new OracleOnOtherLedger(ethDltKey, [xrpAccount, ethAccount], '13000000000', '4397098');

const amount = "4";
const issuedCurrency = "FAU";


const completeStatus = 1;

//flow structure:
runFlow(oracleOnOtherLedgerParams);

async function runFlow(oracleOnOtherLedgerParams) {
    // ****** Read the migration request id from the asset migration smart contract  ******
    const migrationTotalParams = new RequestVarParams(ethDltKey, "totalMigrationRequests");
    const migrationId = await getRequestId(migrationTotalParams);
    console.log(`migrationId `, migrationId);

    // ****** Read the withdrawal request id from the asset migration smart contract
    const withdrawalTotalParams = new RequestVarParams(ethDltKey, "totalWithdrawalRequests");
    const withdrawalId = await getRequestId(withdrawalTotalParams);
    console.log(`withdrawalId `, withdrawalId);

    // ****** Initialise the Oracle on the asset migration contract  ******
    const readOracleParams = new ReadOracleOnOtherLedgerParams(ethDltKey, DltNames.xrp);
    let oracleOnOtherLedger = await getOracleOnOtherLedger(readOracleParams);
    while (!oracleOnOtherLedger || oracleOnOtherLedger === undefined) {
        oracleOnOtherLedger = await getOracleOnOtherLedger(readOracleParams);
    }
    let xrpOracleAddress = oracleOnOtherLedger.msg.result[0];
    if (xrpOracleAddress === '') {
        let response = await initialiseOracleOnOtherLedger(oracleOnOtherLedgerParams);
        console.log('init oracle', response);
    }

    // ****** Reading the migration request Id: if it increased then create a trustline to be (wait in a loop)  ******
    let newMigrationId = await getRequestId(migrationTotalParams);
    while (newMigrationId <= migrationId) {
        newMigrationId = await getRequestId(migrationTotalParams);
    }
    console.log(`newMigrationId `, newMigrationId);

    if (newMigrationId > migrationId) {
        // ****** Payment to Party A of 4 FAU over the trustline created beforehand by Party A to the Oracle
        let readParams = new ReadParams(ethDltKey, migrationId, 'getMigrationDestinationAccount', '13000000000', '4397098');
        let xrpPartyAAddress = await readData(readParams);
        while (!xrpPartyAAddress || xrpPartyAAddress.msg.result[0] === '') {
            sleep(3000);
            xrpPartyAAddress = await readData(readParams);
        }
        console.log(`xrpPartyAAddress ${xrpPartyAAddress.msg.result[0]}`);
        const issuedCurrencyPaymentParams = new IssuedCurrencyPaymentParams(xrpDltKey, xrpPartyAAddress.msg.result[0], amount, issuedCurrency, '12', '4294967295');
        let paymentToPartyAHash = await makeIssuedCurrencyPayment(issuedCurrencyPaymentParams);
        console.log(`paymentToPartyAHash `, paymentToPartyAHash);

        // ****** completedMigrationRequest ******
        if (paymentToPartyAHash.success) {
            const migrationCompleted = new CompleteMigrationParams(ethDltKey, migrationId, paymentToPartyAHash.msg.transactionHash, completeStatus, '13000000000', '4397098');
            let completeMigrationHash = await completeMigration(migrationCompleted);
            console.log(`completeMigrationHash `, completeMigrationHash);
        } else {
            console.log(`Payment to Party A failed; migration not completed`);
        }
    }
    console.log(`****** MIGRATION FINISHED ******`);
    sleep(10000);

    // ****** Reading the withdrawal request Id: if it increased then create a trustline to be (wait in a loop)  ******
    let newWithdrawalId = await getRequestId(withdrawalTotalParams);
    while (newWithdrawalId <= withdrawalId) {
        sleep(3000);
        newWithdrawalId = await getRequestId(withdrawalTotalParams);
    }
    console.log(`newWithdrawalId `, newWithdrawalId);

    // ****** Trustline to Party B (preparing a payment of 2 FAU that will give back to Party B on the Ethereum Ledger)  ******
    if (newWithdrawalId > withdrawalId) {
        readParams = new ReadParams(ethDltKey, withdrawalId, 'getWithdrawalRequestAmount', '13000000000', '4397098');
        let withdrawalAmount = await readData(readParams);
        while (!withdrawalAmount || withdrawalAmount.msg.result[0] === '') {
            sleep(3000);
            withdrawalAmount = await readData(readParams);
        }
        console.log(`withdrawalAmount Oracle `, withdrawalAmount);
        const trustlineCredit = withdrawalAmount.msg.result[0] / Math.pow(10, 18);
        console.log(`trustlineCredit `, trustlineCredit);
        readParams = new ReadParams(ethDltKey, withdrawalId, 'getWithdrawalOtherLedgerAddress', '13000000000', '4397098');
        let xrpPartyBAddress = await readData(readParams);
        while (!xrpPartyBAddress || xrpPartyBAddress.msg.result[0] === '') {
            sleep(3000);
            xrpPartyBAddress = await readData(readParams);
        }
        const trustlineCreation = new TrustlineCreationParams(xrpDltKey, issuedCurrency, xrpPartyBAddress.msg.result[0], trustlineCredit.toString(), '12', '4294967295');
        const trustlineHash = await createTrustlineTransaction(trustlineCreation);
        console.log(`trustlineHash `, trustlineHash);

        // ***** Set the trustline hash on the smart contract ******
        if (trustlineHash.success) {
            const oracleWithdrawalTrustline = new WithdrawalControl(ethDltKey, 'setOracleWithdrawalTrustline', 'oracleTrustlineTxHash', withdrawalId, trustlineHash.msg.transactionHash, '13000000000', '4397098');
            const setTrustlineWithdrawalHash = await setOracleTrustlineWithdrawal(oracleWithdrawalTrustline);
            console.log(`set trustline hash `, setTrustlineWithdrawalHash);
        } else {
            console.log(`Withdrawal trustline creation for PartyB failed`);
            return false;
        }
    }

    // **** Read payment from Payment from Party B has been done  ******
    readParams = new ReadParams(ethDltKey, withdrawalId, 'getWithdrawalOtherLedgerTxID', '13000000000', '4397098');
    let paymentOtherLedgerHash = await readData(readParams);
    while (!paymentOtherLedgerHash || paymentOtherLedgerHash.msg.result[0] === '') {
        sleep(5000);
        paymentOtherLedgerHash = await readData(readParams);
    }
    console.log(`paymentOtherLedgerHash `, paymentOtherLedgerHash);

    // ****** Get the public key and the accountProof (signature) and verify for withdrawId number  ******
    if (paymentOtherLedgerHash.success) {
        const pubKeyParams = new ReadParams(ethDltKey, withdrawalId, 'getWithdrawalRequestOtherLedgerPubKey', '13000000000', '4397098');
        const partyBPubKey = await readData(pubKeyParams);
        console.log(`partyBPubKey `, partyBPubKey);
        const pubKey = partyBPubKey.msg.result[0];
        console.log(`pubKey `, pubKey);
        const signatureParams = new ReadParams(ethDltKey, withdrawalId, 'getWithdrawalRequestOtherLedgerAddressProof', '13000000000', '4397098');
        const partyBSignature = await readData(signatureParams);
        console.log(`partyBSignature `, partyBSignature);
        const signature = partyBSignature.msg.result[0];
        console.log(`signature `, signature);
        let isValidSignature = false;
        if (pubKey && signature) {
            isValidSignature = verifyMessageSource("oracle", signature.slice(2), pubKey.slice(2));
            console.log(`isValidSignature `, isValidSignature);
        } else {
            console.log(`signature is not validated`);
        }

        // ****** the Oracle is sending to Party B 2 FAU on Ethereum if ACCOUNT VERIFICATION IS TRUE ******
        if (isValidSignature) {
            const withdrawalCompleted = new CompleteWithdrawParams(ethDltKey, withdrawalId, completeStatus, '13000000000', '4397098');
            const completeWithdrawalHash = await completeWithdrawal(withdrawalCompleted);
            console.log(`completeWithdrawalHash `, completeWithdrawalHash);
        } else {
            console.log(`The signature is not valid`);
        }
    } else {
        console.log(`Transaction from Party B failed`);
    }
    return true;
}

async function initialiseOracleOnOtherLedger(oracleOnOtherLedgerParams) {
    console.log("****set-Oracle-Address-On-XRP****");
    const options = {
        uri: new URL("setOracleOnOtherLedger", treatyContractUrl).href,
        body: oracleOnOtherLedgerParams,
        json: true
    }
    const resp = await request.post(options);
    return resp;
}

async function makeIssuedCurrencyPayment(issuedCurrencyPaymentParams) {
    console.log("****make-Issued-Currency-Payment-Oracle-To-PartyA-Through-Trustline****");
    const options = {
        uri: new URL("TradeAssetOnChain", treatyContractUrl).href,
        body: issuedCurrencyPaymentParams,
        json: true
    }
    const resp = await request.post(options);
    return resp;

}

async function createTrustlineTransaction(createTrustlineObj) {
    console.log("****Create-Trustline-Oracle-PartyB****");
    const options = {
        uri: new URL("CreateTrustline", treatyContractUrl).href,
        body: createTrustlineObj,
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

async function completeMigration(completeMigrationParams) {
    console.log("****Complete-Migration-Oracle****");
    const options = {
        uri: new URL("completeMigrationRequest", treatyContractUrl).href,
        body: completeMigrationParams,
        json: true
    }
    const resp = await request.post(options);
    return resp;

}

async function completeWithdrawal(completeWithdrawalParams) {
    console.log("****Complete-Withdrawal-Oracle****");
    const options = {
        uri: new URL("completeWithdrawalRequest", treatyContractUrl).href,
        body: completeWithdrawalParams,
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

async function getOracleOnOtherLedger(readOracleOnOtherLedgerParams) {
    console.log("****Read-the-oracle-address-on-other-ledger****");
    const options = {
        uri: new URL("readOracleOnOtherLedger", treatyContractUrl).href,
        body: readOracleOnOtherLedgerParams,
        json: true
    }
    const resp = await request.post(options);
    return resp;
}

async function setOracleTrustlineWithdrawal(oracleTrustlineParams) {
    console.log("****Set-Trustline-Oracle-Transaction-Hash****");
    const options = {
        uri: new URL("setWithdrawalControl", treatyContractUrl).href,
        body: oracleTrustlineParams,
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