//*************************************SECTION 1: Imports and Object Creation *************************************************/

//general imports
const sha256 = require('crypto-js/sha256');
const request = require('request-promise-native');

//ovl imports:
const DltNames = require('../../overledger-sdk-javascript/packages/overledger-dlt-abstract/dist/AbstractDLT').DltNames;
const functionParameter = require('../TypeDefinitions/functionParameter').default;
const InitialiseAssetsMigrationInformation = require('../TypeDefinitions/InitialiseAssetsMigrationInformation').default;
const InitialiseParams = require('../TypeDefinitions/InitialiseParams').default;
const TypeOptions = require('../../overledger-sdk-javascript/packages/overledger-types/dist').TypeOptions;
const MigrateAssetsParams = require('../TypeDefinitions/MigrateAssetsParams').default;
const TrustlineCreationParams = require('../TypeDefinitions/TrustlineCreationParams').default;
const IssuedCurrencyPaymentParams = require('../TypeDefinitions/IssuedCurrencyPaymentParams').default;
const ReadOracleOnOtherLedgerParams = require('../TypeDefinitions/ReadOracleOnOtherLedgerParams').default;
const RequestVarParams = require('../TypeDefinitions/RequestVarParams').default;
const WithdrawalControl = require('../TypeDefinitions/WithdrawalControl').default;
const ReadParams = require('../TypeDefinitions/ReadParams').default;
const DltKey = require('../TypeDefinitions/DltKey').default;
// const soliditySmartContractAssetMigrationByteCodeSha256Hash = require('../AssetMigrationTreatyContract').soliditySmartContractAssetMigrationByteCodeSha256Hash;

//Party A's knowledgebase:
const treatyContractUrl = "http://localhost:4000";
const xrpPrivateKey = "spvJWGH8uwjudYCFFy2xLQMkFRhFa";
const xrpAddress = "rHB8SkbEunsw8Mpc1YcXE2TM2mJrttiJ9Z";
const ethPrivateKey = "0x1969D2C1EF82A5D1844C9C3A49A66245B2E927A6BC1D9F7F64B1376588A53B01"; // najla MM Account1
const ethAddress = "0x7e0A65af0Dae83870Ce812F34C3A3D8626530d10";
const amount = 5;
const decimals = 18;
const tokensAmountToMigrate = amount * Math.pow(10, decimals);
const soliditySmartContractAssetMigrationByteCodeSha256Hash = '48d48bec585b239ae5297789d5a1e825e5a7130c108aca33b205101d631c5785';


//const network = "http://internal-gw-1862440128.eu-west-2.elb.amazonaws.com/v1/";
const network = "testnet";

// const erc20ContractAddress = "0x514910771af9ca656af840dff83e8264ecf986ca"; //LINK
const erc20ContractAddress = "0xFab46E002BbF0b4509813474841E0716E6730136"; //FAU
const ethOracleAddress = "0x2c8251052663244f37BAc7Bde1C6Cb02bBffff93";
const issuedCurrency = "FAU";
const ethDltKey = new DltKey(DltNames.ethereum, ethAddress, ethPrivateKey);
const xrpDltKey = new DltKey(DltNames.xrp, xrpAddress, xrpPrivateKey);

const constructorParameter1 = new functionParameter(TypeOptions.address, "contractAddress", erc20ContractAddress);
const constructorParameter2 = new functionParameter(TypeOptions.address, "oracleOwner", ethOracleAddress);
const constructorParameter3 = new functionParameter(TypeOptions.string, "contractByteCodeHash", "0x" + soliditySmartContractAssetMigrationByteCodeSha256Hash);
const functionParameters = { data: [constructorParameter1, constructorParameter2, constructorParameter3] };
const initAssetMigrationInformation = new InitialiseAssetsMigrationInformation(true, functionParameters, '13000000000', '4397098');
const initialise = new InitialiseParams(ethDltKey, initAssetMigrationInformation);


//flow structure:
runFlow(initialise);

async function runFlow(initialise) {
    // // ****** Initialise the asset migration contract OR get the one already deployed ******
    let initContractHash = await initialiseAssetsMigrationContract(initialise);
    console.log(`initContractHash ${initContractHash}`);

    // ****** Read the withdrawRequestId for later --> Payment to Party B ******
    const withdrawalTotalParams = new RequestVarParams(ethDltKey, "totalWithdrawalRequests");
    const withdrawalId = await getRequestId(withdrawalTotalParams);
    console.log(`withdrawalId `, withdrawalId);

    // ****** Check oracle is initialized and get his address on other ledger ******
    const readOracleParams = new ReadOracleOnOtherLedgerParams(ethDltKey, DltNames.xrp);
    let oracleOnOtherLedger = await getOracleOnOtherLedger(readOracleParams);
    let xrpOracleAddress = oracleOnOtherLedger.msg.result[0];
    while (!xrpOracleAddress || xrpOracleAddress === "") {
        sleep(3000);
        oracleOnOtherLedger = await getOracleOnOtherLedger(readOracleParams);
        xrpOracleAddress = oracleOnOtherLedger.msg.result[0];
    }
    console.log(`xrpOracleAddress `, xrpOracleAddress);

    // ****** Create a trustline A -> Oracle 5FAU (XRP DLT) ******
    if (xrpOracleAddress && xrpOracleAddress !== "") {
        const trustlineCreation = new TrustlineCreationParams(xrpDltKey, issuedCurrency, xrpOracleAddress, amount.toString(), '12', '4294967295');
        const trustlineHash = await createTrustlineTransaction(trustlineCreation);
        console.log(`trustlineHash A to the Oracle `, trustlineHash);

        // ****** Migrate the ERC20 tokens to the asset migration contract
        const migrateAssets = new MigrateAssetsParams(ethDltKey, erc20ContractAddress, tokensAmountToMigrate, DltNames.xrp, xrpAddress, '13000000000', '4397098');
        const migrateAssetsRequestHash = await migrateERC20AssetsToLock(migrateAssets);
        console.log(`migrateAssetsRequestHash from A `, migrateAssetsRequestHash);
    }

     console.log(`****** MIGRATION FINISHED ******`);

    sleep(10000);

    // ****** Read the withdrawRequestId if it is increased do the payment ******
    let newWithdrawalId = await getRequestId(withdrawalTotalParams);
    while (newWithdrawalId <= withdrawalId) {
        sleep(5000);
        newWithdrawalId = await getRequestId(withdrawalTotalParams);
    }
    console.log(`newWithdrawalId `, newWithdrawalId);

    // ****** Make a payment A -> B 3FAU For the withdrawal part ******
     if (newWithdrawalId > withdrawalId) {
        let readParams = new ReadParams(ethDltKey, withdrawalId, 'getWithdrawalRequestAmount', '13000000000', '4397098');
        let withdrawalAmount = await readData(readParams);
        while (!withdrawalAmount || withdrawalAmount.msg.result[0] === '') {
            sleep(5000);
            withdrawalAmount = await readData(readParams);
        }
        console.log(`withdrawalAmount PartyA `, withdrawalAmount);
        const trustlineCredit = withdrawalAmount.msg.result[0] / Math.pow(10, 18);
        readParams = new ReadParams(ethDltKey, withdrawalId, 'getWithdrawalOtherLedgerAddress', '13000000000', '4397098');
        let xrpPartyBAddress = await readData(readParams);
        while (!xrpPartyBAddress || xrpPartyBAddress.msg.result[0] === '') {
            sleep(3000);
            xrpPartyBAddress = await readData(readParams);
        }
        const issuedCurrencyPaymentParams = new IssuedCurrencyPaymentParams(xrpDltKey, xrpPartyBAddress.msg.result[0], trustlineCredit.toString(), issuedCurrency, '12', '4294967295');
        let paymentToPartyBHash = await makeIssuedCurrencyPayment(issuedCurrencyPaymentParams);
        console.log(`paymentToPartyBHash `, paymentToPartyBHash);
        // **** SM setOtherLedgerIncomeTransaction ******
        if (paymentToPartyBHash.success) {
            const otherLedgerWithdrawalTransaction = new WithdrawalControl(ethDltKey, 'setOtherLedgerIncomeTransaction', 'otherLedgerIncomeTxHash', withdrawalId, paymentToPartyBHash.msg.transactionHash, '13000000000', '4397098');
            const setTransaction = await setOtherLedgerWithdrawalTransaction(otherLedgerWithdrawalTransaction);
            console.log(`setOtherLedgerWithdrawalTransaction `, setTransaction);
        } else {
            console.log(`Payment from Party A to Party B failed`);
        }
     }
}


async function initialiseAssetsMigrationContract(initialiseObj) {
    console.log("****InitTransaction-A****");
    const options = {
        uri: new URL("InitialiseApp", treatyContractUrl).href,
        body: initialiseObj,
        json: true
    }
    console.log(`initialiseObj ${JSON.stringify(initialiseObj)}`);
    const resp = await request.post(options);
    console.log("resp.toString(): " + resp.toString());
    if (resp.event == "paramsNotValid") {
        console.log("paramsNotValid: " + resp.result);
        process.exit(1);
    } else if (resp.event == "newContract") {
        console.log("newContract deployed at txHash: " + resp.result.dltData[0].transactionHash);
        console.log("ObjectKeys: " + Object.keys(resp.result.dltData[0]));
        return resp.result.dltData[0].transactionHash;
    } else if (resp.event == "SolidityHashFail") {
        console.log("Solidity code load fail: " + resp.result);
        process.exit(1);
    } else if (resp.event == "ContractAlreadyDeployed") {
        console.log("Contract already deployed at: " + resp.result);
        return "";
    }
}

async function migrateERC20AssetsToLock(migrateAssetObj) {
    console.log("****migrateAsset-ERC20-ToContract-Party-A****");
    const options = {
        uri: new URL("MigrateAssetRequest", treatyContractUrl).href,
        body: migrateAssetObj,
        json: true
    }
    const resp = await request.post(options);
    return resp;
}

async function createTrustlineTransaction(createTrustlineObj) {
    console.log("****Create-Trustline-PartyA-Oracle****");
    const options = {
        uri: new URL("CreateTrustline", treatyContractUrl).href,
        body: createTrustlineObj,
        json: true
    }
    const resp = await request.post(options);
    return resp;
}

async function makeIssuedCurrencyPayment(issuedCurrencyPaymentParams) {
    console.log("****make-Issued-Currency-Payment-PartyA-To-PartyB-Through-Trustline****");
    const options = {
        uri: new URL("TradeAssetOnChain", treatyContractUrl).href,
        body: issuedCurrencyPaymentParams,
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
    console.log("****Set-withdrawal-control-payment-to-Party-B****");
    const options = {
        uri: new URL("setWithdrawalControl", treatyContractUrl).href,
        body: paymentParams,
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

/**
 * Sleeps for a number of miliseconds
 * @param {*} ms - the number of miliseconds
 */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}