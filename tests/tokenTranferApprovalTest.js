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
const DltNames = require('../../overledger-sdk-javascript/packages/overledger-dlt-abstract/dist/AbstractDLT').DltNames;
const readOrders = require('../treaty-contract-functions').readOrders;
const getLatestContract = require('../treaty-contract-functions').getLatestContract;
const checkForTransactionConfirmation = require('../treaty-contract-functions').checkForTransactionConfirmation;
//  ---------------------------------------------------------
//  -------------- BEGIN VARIABLES TO UPDATE ----------------
//  ---------------------------------------------------------

//The following are found from your Overledger Account:
const mappId = 'asset.migration.demo';
const bpiKey = 'assetmigrationbpikey';

// Paste in your ethereum and ripple private keys.
// For Ethereum you can generate an account using `OverledgerSDK.dlts.ethereum.createAccount` then fund the address at the Ropsten Testnet Faucet.
const partyAEthereumPrivateKey = '0xcbf05d5215b7f37b3cd1577280c45381393116a81c053abbe21afdbd5d0e504d';
const partyAEthereumAddress = '0x0E4e8278ACa5EFEc8430692108B5271961A00ec7'

const partyBEthereumAddress = '0x1a90dbb13861a29bFC2e464549D28bE44846Dbe4';

//  ---------------------------------------------------------
//  -------------- END VARIABLES TO UPDATE ------------------
//  ---------------------------------------------------------


; (async () => {
  try {
    const overledger = new OverledgerSDK(mappId, bpiKey, {
      dlts: [{ dlt: DltNames.xrp }],
      provider: { network: 'testnet' },
    });  

    // const txn = await overledger.search.getTransaction('5DD70E7FF9606C57E56F4A3E60E00FEDB080F35E875AD0A8EE11B85D3134470C'); // 0x23e432d3b496f2c6bb25d0470bfd39294cbd59e05e1530c81a8a5e1b64c93406
    // console.log(`returned values `, txn.data.data.outcome);
    const resp = await checkForTransactionConfirmation(overledger, '5B9DB50D97B9E2B79F52204B31970C8A54F7637556467A5C429179CF5B0BA6E0', 0, 10);
    console.log(`resp `, resp);
  } catch (e) {
    console.error('error:', e);
  }
})();