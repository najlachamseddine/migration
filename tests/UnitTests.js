/* const dltKeys = require('./TypeDefinitions/swapTypes.js');
const DltKey = require('./TypeDefinitions/DltKey').default;
const FunctionTypes = require('../overledger-sdk-javascript/packages/overledger-dlt-ethereum/dist/Ethereum').FunctionTypes;

var a = new DltKey('dd','tt');
console.log(a);
console.log(FunctionTypes.constructorWithParams);
*/

// Replace the dependency by @quantnetwork/overledger-bundle if you're in your own project
const OverledgerSDK = require('../../overledger-sdk-javascript/packages/overledger-bundle/dist').default;
const TypeOptions = require('../../overledger-sdk-javascript/packages/overledger-types/dist').TypeOptions;
const UintIntMOptions = require('../../overledger-sdk-javascript/packages/overledger-types/dist').UintIntMOptions;
const BytesMOptions = require('../../overledger-sdk-javascript/packages/overledger-types/dist').BytesMOptions;
const TransactionTypes = require("../../overledger-sdk-javascript/packages/overledger-dlt-ripple/dist/Ripple").TransactionTypes;
const DltNames = require('../../overledger-sdk-javascript/packages/overledger-dlt-abstract/dist/AbstractDLT').DltNames;
const readOrders = require('../treaty-contract-functions').readOrders;
const getLatestContract = require('../treaty-contract-functions').getLatestContract;
const checkForTransactionConfirmation = require('../treaty-contract-functions').checkForTransactionConfirmation;
const TrustlineParams = require('../TypeDefinitions/TrustlineParams').default;
const getTrustline = require('../treaty-contract-functions').getTrustline;
const getTrustlineTest = require('../treaty-contract-functions').getTrustlineTest;
const getAssetMigrationContract = require('../treaty-contract-functions').getAssetMigrationContract;
const getAssetMigrationContractAddress = require('../treaty-contract-functions').getAssetMigrationContractAddress;
const DltKey = require('../TypeDefinitions/DltKey').default;
const ReadParams = require('../TypeDefinitions/ReadParams').default;
const validateMigrationWithdrawParameters = require('../treaty-contract-functions').validateMigrationWithdrawParameters;


//  ---------------------------------------------------------
//  -------------- BEGIN VARIABLES TO UPDATE ----------------
//  ---------------------------------------------------------

//The following are found from your Overledger Account:
const mappId = 'asset.migration.demo';
const bpiKey = 'assetmigrationbpikey';

//Party A will be the creator of the escrow. Party A's details are as follows:
const partyARipplePrivateKey = 'snBAeNtkYFmoAGctAKyiHwDy4NGZM';
const partyARippleAddress = 'rUUfuUqnBA3MpfaHBhgky7LPXsyppoJxRj';

const partyAEthereumPrivateKey = '0xcbf05d5215b7f37b3cd1577280c45381393116a81c053abbe21afdbd5d0e504d';
const partyAEthereumAddress = '0x0E4e8278ACa5EFEc8430692108B5271961A00ec7';

// Party B's details are as follows:
const partyBRippleAddress = 'rPCgJVMFyZZcBB9wbJ4xzwHJx61guQbo2z';
const partyBRipplePrivateKey = 'spqmpMxtakC7v22tNdQweMhUwMM4c';


//  ---------------------------------------------------------
//  -------------- END VARIABLES TO UPDATE ------------------
//  ---------------------------------------------------------


; (async () => {
  try {
    const overledger = new OverledgerSDK(mappId, bpiKey, {
      dlts: [{ dlt: DltNames.xrp }, { dlt: DltNames.ethereum }],
      provider: { network: 'testnet' },
    });


    // SET partyA accounts for signing;
    overledger.dlts.ripple.setAccount(partyARipplePrivateKey);
    overledger.dlts.ethereum.setAccount(partyAEthereumPrivateKey);

    // Get the address sequences.
    const rippleSequenceRequest = await overledger.dlts.ripple.getSequence(partyARippleAddress);
    const rippleAccountSequence = rippleSequenceRequest.data.dltData[0].sequence;

    // console.error('rippleAccountSequence:' + rippleAccountSequence);
    // const trustlineDetails = new TrustlineParams(TransactionTypes.paymentAsset, "FAU", "rh8wzXoMktddJYC7T48bn56gWqFVesqcub", "rHB8SkbEunsw8Mpc1YcXE2TM2mJrttiJ9Z");
    // console.log(`trustlineDetails `, trustlineDetails);
    // const txnDetails = await getTrustline(overledger, trustlineDetails);
    // console.log(`txnDetails `, txnDetails);
    // const readOracleParams = new ReadOracleOnOtherLedgerParams();
    // const oracleOnOtherLedger = await getOracleOnOtherLedger(readOracleParams);
    // let txParams = await overledger.search.getTransaction("0x327dea06556920d8318d53ef3881eaf1db251d571cec9dc587c07161aee58161");
    // console.log(`get transaction `, txParams);
    // const txnDetails = await overledger.search.getTransaction("16FBFF03737FA1F4098D47415DBBDF398289DC3FD1B721CBF563C64A0FEF9E9E", 0, 25);
    // console.log(`resp `, txnDetails[0].txn);
    // console.log(`resp `, txnDetails[0].data);
    // console.log(`oracleOnOtherLedger `, oracleOnOtherLedger);
    // const isTrustlineConfirmed = await checkForTransactionConfirmation(overledger, "88C992608EBDCD2248B17AEAC5DB2FB2D9F1DCD78A6956FB7BC4F17AFD69A6DF", 0, 50);
    // console.log(`isTrustlineConfirmed `, isTrustlineConfirmed); 
    // let txParams = await overledger.search.getTransaction("170D6BC2A823B1B8042CD9A613E94F6D9F408B88E01C8BAE8ABA21011C7DCC8F");
    // console.log(`txParams `, txParams);
    // const isTrustlineConfirmed = await checkForTransactionConfirmation(overledger, "095DD5122F488B0CBB4E86BE3EE6115F2E07D1DF62675837B84977C292ED5CB8", 0, 5);
    // const isTrustlineConfirmed = await checkForTransactionConfirmation(overledger, DltNames.ethereum, "0x6b1cfa4b0e941421976b39d513b1635dddd897527ff56bd74935932883d5d996", 0, 5);
    // console.log(`isTrustlineConfirmed `, isTrustlineConfirmed); 
    // let latestContract = await getLatestContract(overledger);
    // console.log(`latestContract ${JSON.stringify(latestContract)}`);
    // let txParams = await overledger.search.getTransaction("0x51b0387c7537c777290d8bc0732ab804cca86cbd05ab3290a3445ed5a63221e4");
    // console.log(`get transaction `, txParams);
    // const ethDltKey = new DltKey(DltNames.ethereum, partyAEthereumAddress, partyAEthereumPrivateKey);
    // let latestAssetMigrationContract = await getAssetMigrationContract(overledger, ethDltKey, "48d48bec585b239ae5297789d5a1e825e5a7130c108aca33b205101d631c5785");
    // console.log(`latestAssetMigrationContract ${JSON.stringify(latestAssetMigrationContract)}`);
    // const assetMigrationContractAddress = latestAssetMigrationContract.creationDetails.createdContract;
    // console.log(`assetMigrationContractAddress ${assetMigrationContractAddress}`);
    // let latestAssetMigrationContractStr = await getAssetMigrationContractAddress(overledger, ethDltKey, "48d48bec585b239ae5297789d5a1e825e5a7130c108aca33b205101d631c5785");
    // console.log(`latestAssetMigrationContractStr ${latestAssetMigrationContractStr}`);
    const ethDltKey = new DltKey(DltNames.ethereum, '0x2c8251052663244f37BAc7Bde1C6Cb02bBffff93', '0x3683C26883ED1FA1AF666E8162BAE1976F39E04C77C1CB51D70C0DDBD67446A5');
    let readParams = new ReadParams(ethDltKey, 0, 'getMigrationDestinationAccount', '13000000000', '4397098');
    const validateReadParams = validateMigrationWithdrawParameters(readParams);
    console.log(`validateReadParams ${validateReadParams}`);
    // let xrpPartyAAddress = await readData(readParams);
    // console.log(`xrpPartyAAddress ${xrpPartyAAddress}`);
  } catch (e) {
    console.error('error:', e);
  }
})();