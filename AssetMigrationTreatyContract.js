//*************************************SECTION 1: Imports and Object Creation *************************************************/

//general imports
console.log('Starting imports');

//node imports:
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

//overledger SDK imports:
const DltNames = require('../overledger-sdk-javascript/packages/overledger-dlt-abstract/dist/AbstractDLT').DltNames;
const TransactionTypes = require('../overledger-sdk-javascript/packages/overledger-dlt-ripple/dist/Ripple').TransactionTypes;
const validateAssetsMigrationRequestParameters = require('./treaty-contract-functions').validateAssetsMigrationRequestParameters;
const validateConstructorMigrationParameters = require('./treaty-contract-functions').validateConstructorMigrationParameters;
const migrateERC20AssetToLock = require('./treaty-contract-functions').migrateERC20AssetToLock;
const tokenTranferApproval = require('./treaty-contract-functions').tokenTranferApproval;
const startup = require('./treaty-contract-functions').startup;
const instantiateOverledgerInstance = require('./treaty-contract-functions').instantiateOverledgerInstance;
const addAccountsToOverledger = require('./treaty-contract-functions').addAccountsToOverledger;
const validateSetOracleOtherLedgerParameters = require('./treaty-contract-functions').validateSetOracleOtherLedgerParameters;
const setOracleOnLedgers = require('./treaty-contract-functions').setOracleOnLedgers;
const checkForTransactionConfirmation = require('./treaty-contract-functions').checkForTransactionConfirmation;
const TypeOptions = require('../../overledger-sdk-javascript/packages/overledger-types/dist').TypeOptions;
const UintIntMOptions = require('../overledger-sdk-javascript/packages/overledger-types/dist').UintIntMOptions;
const readContract = require('./treaty-contract-functions').readContract;
const validateTrustlineCreationParameters = require('./treaty-contract-functions').validateTrustlineCreationParameters;
const createTrustlineTransaction = require('./treaty-contract-functions').createTrustlineTransaction;
const TrustlineParams = require('./TypeDefinitions/TrustlineParams').default;
const validatePaymentTransactionParameters = require('./treaty-contract-functions').validatePaymentTransactionParameters;
const getTrustline = require('./treaty-contract-functions').getTrustline;
const makeIssuedCurrencyPayment = require('./treaty-contract-functions').makeIssuedCurrencyPayment;
const validateReadOracleOtherLedgerParameters = require('./treaty-contract-functions').validateReadOracleOtherLedgerParameters;
const readOracleOnOtherLedger = require('./treaty-contract-functions').readOracleOnOtherLedger;
const readMigrationOrWithdrawalId = require('./treaty-contract-functions').readMigrationOrWithdrawalId;
const completeMigrationRequest = require('./treaty-contract-functions').completeMigrationRequest;
const validateCompleteMigrationParameters = require('./treaty-contract-functions').validateCompleteMigrationParameters;
const validateAssetsWithdrawalRequestParameters = require('./treaty-contract-functions').validateAssetsWithdrawalRequestParameters;
const withdrawERC20AssetRequest = require('./treaty-contract-functions').withdrawERC20AssetRequest;
const validateCompleteWithdrawParameters = require('./treaty-contract-functions').validateCompleteWithdrawParameters;
const completeWithdrawRequest = require('./treaty-contract-functions').completeWithdrawRequest;
const setWithdrawalControl = require('./treaty-contract-functions').setWithdrawalControl;
const readMigrationWithdraw = require('./treaty-contract-functions').readMigrationWithdraw;
const validateWithdrawalControlParameters = require('./treaty-contract-functions').validateWithdrawalControlParameters;
const validateMigrationWithdrawParameters = require('./treaty-contract-functions').validateMigrationWithdrawParameters;
const getAssetMigrationContractAddress = require('./treaty-contract-functions').getAssetMigrationContractAddress;

//Treaty contract pesistent state
//Overledger variables:
const overledgerMappId = "asset.migration.demo";
const OverledgerBpiKey = "assetmigrationbpikey";
const network = "testnet";
//Treaty Contract variables: 
const solidityAssetsMigrationFileLocation = "./smartContracts/AssetMigrationOracleByteCode.txt";
const soliditySmartContractAssetMigrationByteCodeSha256Hash = '48d48bec585b239ae5297789d5a1e825e5a7130c108aca33b205101d631c5785';


//setting app properties:
console.log('Starting asset migration treaty contract demo');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true })); // to support URL-encoded bodies
app.use(bodyParser.json())
app.set('view engine', 'ejs');

const port = process.argv[2];

if (port && port > 0) {
    app.listen(port, async function () {
        console.log(`Example app listening on port ${port}!`);
    });
} else {
    console.log(`Port server must be defined: node AssetMigrationTreatyContract.js portNumber`)
}



app.post('/InitialiseApp', async function (req, res) {
    console.log("********************FUNCTION:InitialAssetMigrationApp********************");
    let toReturn;
    try {
        let initMigrationAppParams = req.body;
        console.log(`initMigrationAppParams`, initMigrationAppParams);
        let validationFeedback = validateConstructorMigrationParameters(initMigrationAppParams); //will return text if there is an error OR false
        console.log(`validationFeedback `, validationFeedback);
        if (validationFeedback) {
            let overledgerSDK = await instantiateOverledgerInstance(overledgerMappId, OverledgerBpiKey, [DltNames.ethereum, DltNames.xrp], network);
            console.log(`overledgerSDK `, overledgerSDK);
            await addAccountsToOverledger(overledgerSDK, [DltNames.ethereum], [initMigrationAppParams.dltKey.dltSecretKey]);
            //deploy migration contract onto ethereum and set the ERC-20 contract address and the Oracle address in the constructor
            let resp = await startup(overledgerSDK, initMigrationAppParams, solidityAssetsMigrationFileLocation, soliditySmartContractAssetMigrationByteCodeSha256Hash, network);
            console.info(`resp startup ${JSON.stringify(resp)}`);
            let isInitContractConfirmed;
            if (resp.event === "newContract") {
                isInitContractConfirmed = await checkForTransactionConfirmation(overledgerSDK, resp.result, 0, 600);
            }
            if (isInitContractConfirmed) {
                toReturn = {
                    success: true,
                    msg: resp
                };
            } else {
                toReturn = {
                    success: false,
                    msg: "Init contract transaction hash not confirmed"
                };
            }
        } else {
            toReturn = {
                success: false,
                msg: "paramsNotValid: " + validationFeedback
            }
        }
    } catch (e) {
        console.error('error', e);
        toReturn = {
            success: false,
            msg: 'error:_' + e
        }
    }

    return res.send(toReturn);

})

app.post('/setOracleOnOtherLedger', async function (req, res) {
    console.log("********************FUNCTION:InitialiseOracleOtherLedger********************");
    let toReturn;
    try {
        let oracleOnOtherLedgderParams = req.body;
        console.log(`oracleOnOtherLedgderParams `, oracleOnOtherLedgderParams);
        let validationFeedback = validateSetOracleOtherLedgerParameters(oracleOnOtherLedgderParams);
        if (validationFeedback) {
            let overledgerSDK = await instantiateOverledgerInstance(overledgerMappId, OverledgerBpiKey, [DltNames.ethereum], network);
            await addAccountsToOverledger(overledgerSDK, [DltNames.ethereum], [oracleOnOtherLedgderParams.dltKey.dltSecretKey]);
            let assetMigrationContractAddress = await getAssetMigrationContractAddress(overledgerSDK, oracleOnOtherLedgderParams.dltKey, soliditySmartContractAssetMigrationByteCodeSha256Hash);
            let oracleSetOnLedgers = await setOracleOnLedgers(overledgerSDK, oracleOnOtherLedgderParams.dltKey, oracleOnOtherLedgderParams.accounts, 0, [], assetMigrationContractAddress, oracleOnOtherLedgderParams.feePrice, oracleOnOtherLedgderParams.feeLimit);
            console.log(`isOracleSetOnLedgers `, oracleSetOnLedgers);
            const isOracleSet = oracleSetOnLedgers.every(x => x.confirmed === true);
            hashes = oracleSetOnLedgers.map(t => { return t.txnHash; });
            if (isOracleSet) {
                toReturn = {
                    success: true,
                    msg: { transactionHashes: { ...hashes } }
                };
            } else {
                toReturn = {
                    success: false,
                    msg: "Oracle init transaction hash not confirmed"
                };
            }
        } else {
            toReturn = {
                success: false,
                msg: "paramsNotValid: " + validationFeedback
            }
        }
    } catch (e) {
        console.error('error', e);
        toReturn = {
            success: false,
            msg: 'error:_' + e
        }
    }

    return res.send(toReturn);

});

app.post('/readOracleOnOtherLedger', async function (req, res) {
    console.log("********************FUNCTION:ReadOracleOnOtherLedger********************");
    let toReturn;
    try {
        let oracleParams = req.body;
        let validationFeedback = validateReadOracleOtherLedgerParameters(oracleParams);
        if (validationFeedback) {
            let overledgerSDK = await instantiateOverledgerInstance(overledgerMappId, OverledgerBpiKey, [DltNames.ethereum], network);
            await addAccountsToOverledger(overledgerSDK, [DltNames.ethereum], [oracleParams.dltKey.dltSecretKey]);
            let assetMigrationContractAddress = await getAssetMigrationContractAddress(overledgerSDK, oracleParams.dltKey, soliditySmartContractAssetMigrationByteCodeSha256Hash);
            let readOracle = await readOracleOnOtherLedger(overledgerSDK, oracleParams.dltKey.dltName, oracleParams.dltKey.dltAddress, assetMigrationContractAddress, DltNames.xrp)
            console.log(`readOracle `, readOracle);
            toReturn = {
                success: true,
                msg: readOracle
            };
        } else {
            toReturn = {
                success: false,
                msg: "Wrong parameters to read the oracle on the other ledger"
            };
        }
    } catch (e) {
        console.error('error', e);
        toReturn = {
            success: false,
            msg: 'error:_' + e
        };
    }
    return res.send(toReturn);

});


/**
 * Allows any party to request an asset to be moved from one ledger to another
 */
app.post('/MigrateAssetRequest', async function (req, res) {
    console.log("********************FUNCTION:MigrateAssetRequest********************");
    let toReturn;
    let isMigrationRequest = false;
    let migrateAssetHash;
    try {
        let migrateAssetRequestParams = req.body;
        console.log(`migrateAssetRequestParams ${JSON.stringify(migrateAssetRequestParams)}`);
        let validationFeedback = validateAssetsMigrationRequestParameters(migrateAssetRequestParams); //will return text if there is an error
        console.log(`validationFeedback MigrateAssetRequest ${validationFeedback}`);
        if (validationFeedback) {
            let overledgerSDK = await instantiateOverledgerInstance(overledgerMappId, OverledgerBpiKey, [DltNames.ethereum], network);
            await addAccountsToOverledger(overledgerSDK, [DltNames.ethereum], [migrateAssetRequestParams.dltKey.dltSecretKey]);
            let assetMigrationContractAddress = await getAssetMigrationContractAddress(overledgerSDK, migrateAssetRequestParams.dltKey, soliditySmartContractAssetMigrationByteCodeSha256Hash);
            //if ethereum, then the following 2 txs need to be added to the ledger (after reading the migration contract address)
            //(a) call the approve function in the ERC-20 contract and approve the migration contract to take the stated funds amount
            //(b) call the migrateAssetsRequest function in the migration contract to attempt to move the ERC-20 assets to the migration contract
            const balanceCheck = await readContract(overledgerSDK, DltNames.ethereum, migrateAssetRequestParams.dltKey.dltAddress, migrateAssetRequestParams.erc20TokenAddress, "balanceOf", [{ type: TypeOptions.address, value: migrateAssetRequestParams.dltKey.dltAddress }], [{ type: TypeOptions.uintM, uintIntMValue: UintIntMOptions.m256 }]);
            const approveCheck = await readContract(overledgerSDK, DltNames.ethereum, migrateAssetRequestParams.dltKey.dltAddress, migrateAssetRequestParams.erc20TokenAddress, "approve", [{ type: TypeOptions.address, value: assetMigrationContractAddress }, { type: TypeOptions.uintM, uintIntMValue: UintIntMOptions.m256, value: migrateAssetRequestParams.assetsAmount }], [{ type: TypeOptions.bool }]);
            if (BigInt(migrateAssetRequestParams.assetsAmount.toString()) <= BigInt(balanceCheck.data.results[0].toString()) && approveCheck.data.results[0] === 'true') {
                const approvalHash = await tokenTranferApproval(overledgerSDK, migrateAssetRequestParams.dltKey, migrateAssetRequestParams.erc20TokenAddress, assetMigrationContractAddress, migrateAssetRequestParams.assetsAmount, migrateAssetRequestParams.feePrice, migrateAssetRequestParams.feeLimit);
                const isTranferApproved = await checkForTransactionConfirmation(overledgerSDK, approvalHash, 0, 600);
                console.log(`isTranferApprovedERC20ToContract`, isTranferApproved);
                const isOracleSet = await readContract(overledgerSDK, DltNames.ethereum, migrateAssetRequestParams.dltKey.dltAddress, assetMigrationContractAddress, "getOracleAccountOnOtherLedger", [{ type: TypeOptions.string, value: DltNames.xrp }], [{ type: TypeOptions.string }]);
                console.log(`isOracleSet on XRP: `, isOracleSet.data);
                if (isTranferApproved && isOracleSet) {
                    migrateAssetHash = await migrateERC20AssetToLock(overledgerSDK, migrateAssetRequestParams.dltKey, migrateAssetRequestParams.addressOnDestinationLedger, migrateAssetRequestParams.destinationLedger, assetMigrationContractAddress, migrateAssetRequestParams.assetsAmount, migrateAssetRequestParams.feePrice, migrateAssetRequestParams.feeLimit);
                    console.log(`migrateAsset`, migrateAssetHash);
                }
                isMigrationRequest = await checkForTransactionConfirmation(overledgerSDK, migrateAssetHash, 0, 600);
                if (isMigrationRequest) {
                    toReturn = {
                        success: true,
                        msg: { transactionHash: migrateAssetHash }
                    };
                } else {
                    toReturn = {
                        success: false,
                        msg: "Migration asset transaction hash is not confirmed"
                    };
                }
            } else {
                toReturn = {
                    success: false,
                    msg: "Balance too low " + balanceCheck.data.results[0] + " for that transfer or tranfer not approved"
                }

            }
        } else {
            toReturn = {
                success: false,
                msg: "Params_Not_Valid: " + validationFeedback
            }
        }
    } catch (e) {
        console.error('error', e);
        toReturn = {
            success: false,
            msg: 'error:_' + e
        }

    }

    return res.send(toReturn);

})

app.post('/WithdrawAssetRequest', async function (req, res) {
    console.log("********************FUNCTION:WithdrawAssetRequest********************");
    let toReturn;
    let isWithdrawRequest = false;
    let withdrawAssetHash;
    try {
        let withdrawAssetRequestParams = req.body;
        console.log(`withdrawalAssetRequestParams ${JSON.stringify(withdrawAssetRequestParams)}`);
        let validationFeedback = validateAssetsWithdrawalRequestParameters(withdrawAssetRequestParams); //will return text if there is an error
        console.log(`validationFeedback WithdrawAssetRequest ${validationFeedback}`);
        if (validationFeedback) {
            let overledgerSDK = await instantiateOverledgerInstance(overledgerMappId, OverledgerBpiKey, [DltNames.ethereum], network);
            await addAccountsToOverledger(overledgerSDK, [DltNames.ethereum], [withdrawAssetRequestParams.dltKey.dltSecretKey]);
            let assetMigrationContractAddress = await getAssetMigrationContractAddress(overledgerSDK, withdrawAssetRequestParams.dltKey, soliditySmartContractAssetMigrationByteCodeSha256Hash);
            const isOracleSet = await readContract(overledgerSDK, DltNames.ethereum, withdrawAssetRequestParams.dltKey.dltAddress, assetMigrationContractAddress, "getOracleAccountOnOtherLedger", [{ type: TypeOptions.string, value: DltNames.ethereum }], [{ type: TypeOptions.string }]);
            console.log(`isOracleSet on XRP: `, isOracleSet.data);
            if (isOracleSet) {
                withdrawAssetHash = await withdrawERC20AssetRequest(overledgerSDK, withdrawAssetRequestParams.dltKey, withdrawAssetRequestParams.otherLedgerAddress, withdrawAssetRequestParams.sourceLedger, assetMigrationContractAddress, withdrawAssetRequestParams.assetsAmount, withdrawAssetRequestParams.otherLedgerPubKey, withdrawAssetRequestParams.otherLedgerAddressOwnershipProof, withdrawAssetRequestParams.feePrice, withdrawAssetRequestParams.feeLimit);
                console.log(`withdrawAsset`, withdrawAssetHash);
            }
            isWithdrawRequest = await checkForTransactionConfirmation(overledgerSDK, withdrawAssetHash, 0, 600);
            if (isWithdrawRequest) {
                toReturn = {
                    success: true,
                    msg: { transactionHash: withdrawAssetHash }
                };
            } else {
                toReturn = {
                    success: false,
                    msg: "withdrawal asset transaction hash is not confirmed"
                };
            }
        } else {
            toReturn = {
                success: false,
                msg: "Params_Not_Valid: " + validationFeedback
            }
        }
    } catch (e) {
        console.error('error', e);
        toReturn = {
            success: false,
            msg: 'error:_' + e
        }

    }

    return res.send(toReturn);

})


/**
 * Allows any party to trade an asset on the ledger
 */
app.post('/CreateTrustline', async function (req, res) {
    console.log("********************FUNCTION:CreateTrustline********************")
    let toReturn;
    try {
        let createTrustlineParams = req.body;
        let validationFeedback = validateTrustlineCreationParameters(createTrustlineParams);
        if (validationFeedback) {
            let overledgerSDK = await instantiateOverledgerInstance(overledgerMappId, OverledgerBpiKey, [DltNames.xrp], network);
            await addAccountsToOverledger(overledgerSDK, [DltNames.xrp], [createTrustlineParams.dltKey.dltSecretKey]);
            const existingTrustlineParams = new TrustlineParams(TransactionTypes.paymentAsset, createTrustlineParams.currency, createTrustlineParams.dltKey.dltAddress, createTrustlineParams.counterparty);
            const trustlines = await getTrustline(overledgerSDK, existingTrustlineParams);
            let newLimit = parseInt(createTrustlineParams.amount, 10);
            console.log(`trustlines create trustline `, trustlines);
            if (trustlines.length > 0) {
                const data = trustlines[0].data;
                const limit = data[0].data.specification.limit;
                newLimit += parseInt(limit, 10);
            }
            console.log(`newLimit ${newLimit}`);
            const trustlineHash = await createTrustlineTransaction(overledgerSDK, createTrustlineParams.dltKey, createTrustlineParams.counterparty, createTrustlineParams.currency, newLimit.toString(), createTrustlineParams.feePrice, createTrustlineParams.maxLedgerVersion);
            console.log(`trustlineHash ${trustlineHash}`);
            const isTrustlineConfirmed = await checkForTransactionConfirmation(overledgerSDK, trustlineHash, 0, 200);
            console.log(`isTrustlineConfirmed ${isTrustlineConfirmed}`);
            if (isTrustlineConfirmed) {
                toReturn = {
                    success: true,
                    msg: { transactionHash: trustlineHash }
                };
            } else {
                toReturn = {
                    success: false,
                    msg: "Trustline creation transaction hash not confirmed"
                };
            }
        } else {
            toReturn = {
                success: false,
                msg: "Params_Not_Valid: " + validationFeedback
            }

        }
    } catch (e) {
        console.error('error', e);
        toReturn = {
            success: false,
            msg: 'error:_' + e
        }
    }
    return res.send(toReturn);
})


/**
 * Allows any party to trade an asset on the ledger
 */
app.post('/TradeAssetOnChain', async function (req, res) {
    console.log("********************FUNCTION:TradeAssetOnChain********************")
    try {
        let paymentTransactionParams = req.body;
        let isPaymentConfirmed = false;
        let paymentHash;
        console.log(`paymentTransactionParams `, paymentTransactionParams);
        let validationFeedback = validatePaymentTransactionParameters(paymentTransactionParams); //will return text if there is an error
        console.log(`validationFeedback `, validationFeedback);
        if (validationFeedback) {
            if (paymentTransactionParams.dltKey.dltName === DltNames.xrp) {
                let overledgerSDK = await instantiateOverledgerInstance(overledgerMappId, OverledgerBpiKey, [DltNames.xrp], network);
                await addAccountsToOverledger(overledgerSDK, [DltNames.xrp], [paymentTransactionParams.dltKey.dltSecretKey]);
                const existingTrustlineParams = new TrustlineParams(TransactionTypes.paymentAsset, paymentTransactionParams.currency, paymentTransactionParams.toAddress, paymentTransactionParams.dltKey.dltAddress);
                console.log(`existingTrustlineParams `, existingTrustlineParams);
                console.log(`paymentTransactionParams.amount `, paymentTransactionParams.amount);
                const trustlines = await getTrustline(overledgerSDK, existingTrustlineParams);
                console.log(`trustlines `, trustlines);
                if (trustlines.length > 0) {
                    console.log(`trustline `, trustlines[0]);
                    const data = trustlines[0].data;
                    // console.log(`data `, data[0].data.specification);
                    paymentHash = await makeIssuedCurrencyPayment(overledgerSDK, paymentTransactionParams.dltKey, paymentTransactionParams.toAddress, paymentTransactionParams.amount, paymentTransactionParams.currency, paymentTransactionParams.feePrice, paymentTransactionParams.maxLedgerVersion)
                    console.log(`paymentHash `, paymentHash);
                    isPaymentConfirmed = await checkForTransactionConfirmation(overledgerSDK, paymentHash, 0, 600);
                    console.log(`isPaymentConfirmed ${isPaymentConfirmed}`);
                } else {
                    toReturn = {
                        success: false,
                        msg: "No trustline existing to do the non-XRP payement"
                    };
                }
            }
            if (isPaymentConfirmed) {
                toReturn = {
                    success: true,
                    msg: { transactionHash: paymentHash }
                };
            } else {
                toReturn = {
                    success: false,
                    msg: `Payment transaction not confirmed ${paymentHash}`
                };
            }
        } else {
            toReturn = {
                success: false,
                msg: "Params_Not_Valid: " + validationFeedback
            }

        }
    } catch (e) {
        console.error('error', e);
        toReturn = {
            success: false,
            msg: 'error:_' + e
        }
    }
    return res.send(toReturn);
});


app.post('/readRequestId', async function (req, res) {
    let readTotalParams = req.body;
    let overledgerSDK = await instantiateOverledgerInstance(overledgerMappId, OverledgerBpiKey, [DltNames.ethereum], network);
    await addAccountsToOverledger(overledgerSDK, [DltNames.ethereum], [readTotalParams.dltKey.dltSecretKey]);
    let assetMigrationContractAddress = await getAssetMigrationContractAddress(overledgerSDK, readTotalParams.dltKey, soliditySmartContractAssetMigrationByteCodeSha256Hash);
    const resp = await readMigrationOrWithdrawalId(overledgerSDK, readTotalParams.dltKey, readTotalParams.paramName, assetMigrationContractAddress);
    return res.send(resp.result[0]);
});

/**
 * Allows the oracle to complete an asset migration
 */
app.post('/completeMigrationRequest', async function (req, res) {
    console.log("********************FUNCTION:Completed migration request********************")
    try {
        let completeMigrationParams = req.body;
        console.log(`completeMigrationParams `, completeMigrationParams);
        let validationFeedback = validateCompleteMigrationParameters(completeMigrationParams);
        if (validationFeedback) {
            let overledgerSDK = await instantiateOverledgerInstance(overledgerMappId, OverledgerBpiKey, [DltNames.ethereum], network);
            await addAccountsToOverledger(overledgerSDK, [DltNames.ethereum], [completeMigrationParams.dltKey.dltSecretKey]);
            let assetMigrationContractAddress = await getAssetMigrationContractAddress(overledgerSDK, completeMigrationParams.dltKey, soliditySmartContractAssetMigrationByteCodeSha256Hash);
            const completeMigrationHash = await completeMigrationRequest(overledgerSDK, completeMigrationParams.dltKey, assetMigrationContractAddress, completeMigrationParams.migrationId, completeMigrationParams.transactionHash, completeMigrationParams.status, completeMigrationParams.feePrice, completeMigrationParams.feeLimit);
            const isCompleteMigrationConfirmed = await checkForTransactionConfirmation(overledgerSDK, completeMigrationHash, 0, 600);
            if (isCompleteMigrationConfirmed) {
                toReturn = {
                    success: true,
                    msg: { transactionHash: completeMigrationHash }
                };
            } else {
                toReturn = {
                    success: false,
                    msg: "complete migration transaction hash is not confirmed"
                };
            }
        } else {
            toReturn = {
                success: false,
                msg: "Params_Not_Valid: " + JSON.stringify(completeMigrationParams)
            }
        }
    } catch (e) {
        console.error('error', e);
        toReturn = {
            success: false,
            msg: 'error:_' + e
        }

    }

    return res.send(toReturn);

});


app.post('/setWithdrawalControl', async function (req, res) {
    console.log("********************FUNCTION:Set Oracle Trustline Withdrawal********************")
    try {
        let controlParams = req.body;
        console.log(`controlParams `, controlParams);
        let validationFeedback = validateWithdrawalControlParameters(controlParams);
        if (validationFeedback) {
            let overledgerSDK = await instantiateOverledgerInstance(overledgerMappId, OverledgerBpiKey, [DltNames.ethereum], network);
            await addAccountsToOverledger(overledgerSDK, [DltNames.ethereum], [controlParams.dltKey.dltSecretKey]);
            let assetMigrationContractAddress = await getAssetMigrationContractAddress(overledgerSDK, controlParams.dltKey, soliditySmartContractAssetMigrationByteCodeSha256Hash);
            const setWithdrawalControlHash = await setWithdrawalControl(overledgerSDK, controlParams.dltKey, assetMigrationContractAddress, controlParams.functionName, controlParams.fieldName, controlParams.withdrawId, controlParams.transactionHash, controlParams.feePrice, controlParams.feeLimit);
            const isWithdrawalControlConfirmed = await checkForTransactionConfirmation(overledgerSDK, setWithdrawalControlHash, 0, 700);
            if (isWithdrawalControlConfirmed) {
                toReturn = {
                    success: true,
                    msg: { transactionHash: setWithdrawalControlHash }
                };
            } else {
                toReturn = {
                    success: false,
                    msg: "set withdrawal control transaction hash is not confirmed"
                };
            }
        } else {
            toReturn = {
                success: false,
                msg: "Params_Not_Valid: " + JSON.stringify(controlParams)
            }
        }
    } catch (e) {
        console.error('error', e);
        toReturn = {
            success: false,
            msg: 'error:_' + e
        }

    }

    return res.send(toReturn);

});

app.post('/completeWithdrawalRequest', async function (req, res) {
    console.log("********************FUNCTION:Completed withdrawal request********************");
    try {
        let completeWithdrawalParams = req.body;
        console.log(`completeWithdrawalParams `, completeWithdrawalParams);
        let validationFeedback = validateCompleteWithdrawParameters(completeWithdrawalParams);
        if (validationFeedback) {
            let overledgerSDK = await instantiateOverledgerInstance(overledgerMappId, OverledgerBpiKey, [DltNames.ethereum], network);
            await addAccountsToOverledger(overledgerSDK, [DltNames.ethereum], [completeWithdrawalParams.dltKey.dltSecretKey]);
            let assetMigrationContractAddress = await getAssetMigrationContractAddress(overledgerSDK, completeWithdrawalParams.dltKey, soliditySmartContractAssetMigrationByteCodeSha256Hash);
            const completeWithdrawalHash = await completeWithdrawRequest(overledgerSDK, completeWithdrawalParams.dltKey, assetMigrationContractAddress, completeWithdrawalParams.withdrawId, completeWithdrawalParams.status, completeWithdrawalParams.feePrice, completeWithdrawalParams.feeLimit);
            const isCompleteWithdrawalConfirmed = await checkForTransactionConfirmation(overledgerSDK, completeWithdrawalHash, 0, 600);
            if (isCompleteWithdrawalConfirmed) {
                toReturn = {
                    success: true,
                    msg: { transactionHash: completeWithdrawalHash }
                };
            } else {
                toReturn = {
                    success: false,
                    msg: "complete withdrawal transaction hash is not confirmed"
                };
            }
        } else {
            toReturn = {
                success: false,
                msg: "Params_Not_Valid: " + JSON.stringify(completeWithdrawalParams)
            }
        }
    } catch (e) {
        console.error('error', e);
        toReturn = {
            success: false,
            msg: 'error:_' + e
        }

    }

    return res.send(toReturn);

});

app.post('/readMigrationWithdraw', async function (req, res) {
    console.log("********************FUNCTION:Read Migration or Withdrawal data********************");
    try {
        let readParams = req.body;
        console.log(`readDataParams `, readParams);
        let validationFeedback = validateMigrationWithdrawParameters(readParams);
        if (validationFeedback) {
            let overledgerSDK = await instantiateOverledgerInstance(overledgerMappId, OverledgerBpiKey, [DltNames.ethereum], network);
            await addAccountsToOverledger(overledgerSDK, [DltNames.ethereum], [readParams.dltKey.dltSecretKey]);
            let assetMigrationContractAddress = await getAssetMigrationContractAddress(overledgerSDK, readParams.dltKey, soliditySmartContractAssetMigrationByteCodeSha256Hash);
            const data = await readMigrationWithdraw(overledgerSDK, readParams.dltKey, readParams.functionName, readParams.id, assetMigrationContractAddress, readParams.feePrice, readParams.feeLimit);
            console.log(`readData `, data);
            toReturn = {
                success: true,
                msg: data
            };
        } else {
            toReturn = {
                success: false,
                msg: "Params_Not_Valid: " + JSON.stringify(readParams)
            }
        }
    } catch (e) {
        console.error('error', e);
        toReturn = {
            success: false,
            msg: 'error:_' + e
        }

    }

    return res.send(toReturn);


});

/**
 * Sleeps for a number of miliseconds
 * @param {*} ms - the number of miliseconds
 */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


