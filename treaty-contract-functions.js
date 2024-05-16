const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const DltNames = require('../overledger-sdk-javascript/packages/overledger-dlt-abstract/dist/AbstractDLT').DltNames;
const DataMessageOptions = require('../overledger-sdk-javascript/packages/overledger-dlt-abstract/dist/AbstractDLT').DataMessageOptions;
const OverledgerSDK = require('../overledger-sdk-javascript/packages/overledger-bundle/dist').default;
const FunctionTypes = require('../overledger-sdk-javascript/packages/overledger-dlt-ethereum/dist/Ethereum').FunctionTypes;
const TypeOptions = require('../overledger-sdk-javascript/packages/overledger-types/dist').TypeOptions;
const TransactionTypes = require('../overledger-sdk-javascript/packages/overledger-dlt-ripple/dist/Ripple').TransactionTypes;
const Payable = require('../overledger-sdk-javascript/packages/overledger-dlt-ethereum/dist/Ethereum').Payable;
const UintIntMOptions = require('../overledger-sdk-javascript/packages/overledger-types/dist').UintIntMOptions;
const functionsNames = require('./TypeDefinitions/data').functionsNames;
const RequestVarParams = require('./TypeDefinitions/RequestVarParams').default;
const sha256 = require('crypto-js/sha256');
const DEFAULT_OFFSET = 0;
const DEFAULT_LENGTH = 25;
const TRUSTLINE = 'TRUSTLINE';
const STATUS_TXN_ERROR = 'ERROR';
const STATUS_TXN_BROADCASTED = 'BROADCASTED';
const STATUS_TXN_CONFIRMED = 'CONFIRMED';

function validateConstructorMigrationParameters(initAssetMigrationParams) {
    if (!initAssetMigrationParams.dltKey) {
        return false;
    }
    if (!initAssetMigrationParams.initialiseInformation) {
        return false;
    }
    if (!initAssetMigrationParams.initialiseInformation.functionParameters) {
        return false;
    }
    return true;
}

function validateAssetsMigrationRequestParameters(assetMigrationRequestParams) {
    if (!assetMigrationRequestParams.dltKey) {
        return false;
    }
    if (!assetMigrationRequestParams.erc20TokenAddress) {
        return false;
    }
    if (!assetMigrationRequestParams.assetsAmount) {
        return false;
    }
    if (!assetMigrationRequestParams.destinationLedger) {
        return false;
    }
    if (!assetMigrationRequestParams.addressOnDestinationLedger) {
        return false;
    }
    return true;
}

function validateAssetsWithdrawalRequestParameters(assetMigrationRequestParams) {
    if (!assetMigrationRequestParams.dltKey) {
        return false;
    }
    if (!assetMigrationRequestParams.assetsAmount) {
        return false;
    }
    if (!assetMigrationRequestParams.sourceLedger) {
        return false;
    }
    if (!assetMigrationRequestParams.otherLedgerPubKey) {
        return false;
    }
    if (!assetMigrationRequestParams.otherLedgerAddress) {
        return false;
    }
    if (!assetMigrationRequestParams.otherLedgerAddressOwnershipProof) {
        return false;
    }
    return true;
}

function validateSetOracleOtherLedgerParameters(oracleOnOtherLedgderParams) {
    if (!oracleOnOtherLedgderParams.dltKey) {
        return false;
    }
    if (!Array.isArray(oracleOnOtherLedgderParams.accounts) || oracleOnOtherLedgderParams.accounts.length === 0) {
        return false;
    }
    return true;
}

function validateTrustlineCreationParameters(createTrustlineParams) {
    if (!createTrustlineParams.dltKey) {
        return false;
    }
    if (!createTrustlineParams.currency) {
        return false;
    }
    if (!createTrustlineParams.counterparty) {
        return false;
    }
    if (!createTrustlineParams.amount) {
        return false;
    }
    return true;
}

function validatePaymentTransactionParameters(paymentTransactionParams) {
    if (!paymentTransactionParams.dltKey) {
        return false;
    }
    if (!paymentTransactionParams.toAddress) {
        return false;
    }
    if (!paymentTransactionParams.amount) {
        return false;
    }
    if (!paymentTransactionParams.currency) {
        return false;
    }
    return true;
}

function validateReadOracleOtherLedgerParameters(readOracleParams) {
    if (!readOracleParams.dltKey) {
        return false;
    }
    if (!readOracleParams.otherLedgerName) {
        return false;
    }
    return true;
}

function validateCompleteMigrationParameters(completeMigrationParams) {
    if (!completeMigrationParams.dltKey) {
        return false;
    }
    if ((typeof completeMigrationParams.migrationId) !== "number") {
        return false;
    }
    if (!completeMigrationParams.transactionHash) {
        return false;
    }
    if ((typeof completeMigrationParams.status) !== "number") {
        return false;
    }
    return true;
}

function validateCompleteWithdrawParameters(completeWithdrawParams) {
    if (!completeWithdrawParams.dltKey) {
        return false;
    }
    if ((typeof completeWithdrawParams.withdrawId) !== "number") {
        return false;
    }
    if ((typeof completeWithdrawParams.status) !== "number") {
        return false;
    }
    return true;
}

function validateReadDataParameters(readDataParams) {
    if (!readDataParams.dltKey) {
        return false;
    }
    if (!readDataParams.id) {
        return false;
    }
    if (!readDataParams.functionName) {
        return false;
    }
    return true;
}

function validateMigrationWithdrawParameters(readParams) {
    if (!readParams.dltKey) {
        return false;
    }
    if ((typeof readParams.id) !== "number"){
        return false;
    }
    if (!readParams.functionName) {
        return false;
    }
    return true;
}

function validateWithdrawalControlParameters(controlParams) {
    if (!controlParams.dltKey) {
        return false;
    }
    if (!controlParams.functionName) {
        return false;
    }
    if ((typeof controlParams.withdrawId) !== "number") {
        return false;
    }
    if (!controlParams.transactionHash) {
        return false;
    }
    return true;
}


function buildDLTransaction(overledgerSDK, overledgerDLT, toAddressOnDL, dataMessageTypeForDL, messageForDL, optionsForDL) {

    let transaction = null;
    if (overledgerSDK.dlts[overledgerDLT] != undefined) {
        try {
            transaction = { dlt: overledgerDLT, toAddress: toAddressOnDL, dataMessageType: dataMessageTypeForDL, message: messageForDL, options: optionsForDL };
        } catch (err) {
            console.log("Error when building transaction for " + overledgerDLT + ": " + err);
        }
    }
    return transaction;

}

async function signDLTransactions(overledgerSDK, transactions) {

    let signedTransactions = null;
    if (Array.isArray(transactions) && (overledgerSDK != undefined)) {
        try {
            signedTransactions = await overledgerSDK.sign(transactions);
            console.log("after sign");
        } catch (err) {
            console.log("Error when signing transaction for: " + err);
        }
    }
    return signedTransactions;

}

/**
 * instantiates an overledger instance for the given DLTs
 * @param {*} overledgerMappId 
 * @param {*} OverledgerBpiKey 
 * @param {*} overledgerDLTs - String list of DLTs to connect to
 * @param {*} overledgerNetwork - String of "testnet" or "mainnet"
 */
async function instantiateOverledgerInstance(overledgerMappId, OverledgerBpiKey, overledgerDLTs, overledgerNetwork) {
    // console.log("***instaniateOverledgerInstance***");
    if (Array.isArray(overledgerDLTs)) {
        let count = 0;
        let dltsForRequest = [];
        while (count < overledgerDLTs.length) {
            dltsForRequest[count] = { dlt: overledgerDLTs[count] };
            count++;
        }
        // console.log("network is: + " + overledgerNetwork);
        let overledger = new OverledgerSDK(overledgerMappId, OverledgerBpiKey, { dlts: dltsForRequest, provider: { network: overledgerNetwork } });
        // console.log(`instantiateOverledgerInstance overledger ${overledger}`);
        return overledger;
    } else {
        return null;
    }

}

/**
 * Adds a dlt account via its private key
 * @param {*} overledgerSDK 
 * @param {*} overledgerDLTs 
 * @param {*} overledgerPrivateKeys 
 */
async function addAccountsToOverledger(overledgerSDK, overledgerDLTs, overledgerPrivateKeys) {

    if (Array.isArray(overledgerDLTs)) {
        let count = 0;
        while (count < overledgerDLTs.length) {
            if (overledgerSDK.dlts[overledgerDLTs[count]] != undefined) {
                const t = overledgerSDK.dlts[overledgerDLTs[count]].setAccount(overledgerPrivateKeys[count]);
                //console.log(`t ${t}`);
            }
            count++;
        }
    }

    return overledgerSDK;

}

async function generateSmartContractCreationOptions(overledgerSDK, params) {

    let functionType;
    if (params.initialiseInformation.functionParameters.length = 0) {
        functionType = FunctionTypes.constructorNoParams;
    } else {
        functionType = FunctionTypes.constructorWithParams;
    }
    console.log(`functionType ${functionType}`);
    let sequenceNumResponse = await overledgerSDK.dlts.ethereum.getSequence(params.dltKey.dltAddress);//get sequenceNumber from OVL
    let sequenceNum = sequenceNumResponse.data.dltData[0].sequence;
    const constructorParams = params.initialiseInformation.functionParameters.data.map(curParams => {
        console.log(`curParams ${JSON.stringify(curParams)}`);
        if ((curParams.type == TypeOptions.uintM) || (curParams.type == TypeOptions.intM) || (curParams.type == TypeOptions.uintMArray) || (curParams.type == TypeOptions.intMArray)) {
            return {
                type: curParams.type,
                name: curParams.name,
                value: curParams.value,
                uintIntMValue: curParams.mValue
            };
        } else if ((curParams.type == TypeOptions.bytesM) || (curParams.type == TypeOptions.bytesMArray)) {
            return {
                type: curParams.type,
                name: curParams.name,
                value: curParams.value,
                bytesMValue: curParams.mValue
            };
        } else {
            return {
                type: curParams.type,
                name: curParams.name,
                value: curParams.value
            };
        }
    });

    let options = {
        amount: '0',
        sequence: sequenceNum,
        feePrice: params.initialiseInformation.feePrice,
        feeLimit: params.initialiseInformation.feeLimit,
        functionDetails: {
            functionType: functionType,
            payable: Payable.notPayable,
            functionParameters: constructorParams
        }
    }
    return options;

}

/**
 * Allows the smart contract to deploy the smart contract infrastructure
 * @param {*} constructorParams - the parameters for this deployment
 */
async function startup(overledgerSDK, constructorParams, byteCodeLocation, smartContractByteCodeHash) {
    console.log("********************FUNCTION:startup********************");
    try {
        //search for transaction with the mapp unique ID
        let mappTransactions = await overledgerSDK.readTransactionsByMappId();
        console.log(`mappTransactions ${mappTransactions}`);
        //Only allow the deployment of smart contract infrastructure if there has been no transactions deployed for this treaty contract or redeploy is set **REMOVE THIS FOR FINAL VERSION**
        if ((mappTransactions.data.totalTransactions == 0) || (constructorParams.initialiseInformation.redeploy == true)) {
            //if the MAPP/BPIKey combination has not yet been used deploy TX1: Solidity atomic swap smart contract by:
            //(a) loading the byte code
            let SolidityByteCode = await loadDataFromFile(byteCodeLocation);
            SolidityByteCode = "0x" + SolidityByteCode;
            //(b) checking this byte code matches the given hash
            let solidityHash = sha256(SolidityByteCode).toString();
            console.log("SolidityByteCodeHash: " + solidityHash);
            if (solidityHash == smartContractByteCodeHash.toString()) {
                //(c) if it does then deploy the contract (else return an error message)
                let smartContractCreationOptions = await generateSmartContractCreationOptions(overledgerSDK, constructorParams);
                console.log(`smartContractCreationOptions ${smartContractCreationOptions}`);
                let contractCreationTx = buildDLTransaction(overledgerSDK, DltNames.ethereum, undefined, DataMessageOptions.smartContractCreation, SolidityByteCode, smartContractCreationOptions);
                console.log(`===== contractCreationTx `, contractCreationTx);
                console.log(`====== functionParameters `, JSON.stringify(contractCreationTx.options.functionDetails.functionParameters));
                let signedContractCreationTx = await signDLTransactions(overledgerSDK, [contractCreationTx,]);
                const result = (await overledgerSDK.send(signedContractCreationTx)).data;
                const transactionHash = result.dltData[0].transactionHash;
                console.log(`===== result `, result);
                console.log(JSON.stringify(result, null, 2));
                let toReturn = {
                    result: transactionHash,
                    event: "newContract"
                }
                return toReturn;
            } else {
                console.log("The loaded Solidity byte code is not the same as the expected version");
                console.log("Loaded Solidity byte code hash: " + solidityHash);
                console.log("Expected Solidity byte code hash: " + smartContractByteCodeHash);
                let toReturn = {
                    result: "The loaded Solidity byte code is not the same as the expected version",
                    event: "SolidityHashFail"
                }
                return toReturn;
            }

        } else {
            console.log("Treaty Contract MAPP has already been created!");
            console.log("Number of MAPP transactions: " + mappTransactions.data.totalTransactions);
            //or return "already deployed: " and return TX1's receipt or info 
            let contractAddress = await getAssetMigrationContractAddress(overledgerSDK, constructorParams.dltKey, smartContractByteCodeHash);
            let toReturn = {
                result: contractAddress,
                event: "ContractAlreadyDeployed"
            }
            return toReturn;
        }
    } catch (e) {
        console.error('error', e);
    }
}

async function loadDataFromFile(fileLocation) {
    const content = await readFile(fileLocation, 'utf8');
    return content;
}

async function tokenTranferApproval(overledgerSDK, dltKey, erc20ContractAddress, contractMigrationAddress, amount, feePrice, feeLimit) {
    let sequenceNumResponse = await overledgerSDK.dlts.ethereum.getSequence(dltKey.dltAddress);
    let sequenceNum = sequenceNumResponse.data.dltData[0].sequence;
    const functionParameters = [
        {
            type: TypeOptions.address,
            name: 'spender',
            value: contractMigrationAddress
        },
        {
            type: TypeOptions.uintM,
            name: 'value',
            uintIntMValue: UintIntMOptions.m256,
            value: amount.toString()

        }
    ];
    const options = {
        amount: '0',
        sequence: sequenceNum,
        feePrice,
        feeLimit,
        functionDetails: {
            functionType: FunctionTypes.functionCall,
            functionName: "approve",
            payable: Payable.nonPayable,
            functionParameters
        }
    }
    let migratecontractInvocationTx = buildDLTransaction(overledgerSDK, DltNames.ethereum, erc20ContractAddress, DataMessageOptions.smartContractInvocation, "", options);
    let signedContractInvocationTx = await signDLTransactions(overledgerSDK, [migratecontractInvocationTx]);
    const result = (await overledgerSDK.send(signedContractInvocationTx)).data;
    console.log(`result ${JSON.stringify(result)}`);
    const transactionHash = result.dltData[0].transactionHash;
    return transactionHash;
}

async function readMigrationWithdraw(overledger, dltKey, functionName, migrationOrWithdrawalNumber, assetMigrationContractAddress) {
    const input = {
        fromAddress: dltKey.dltAddress,
        contractAddress: assetMigrationContractAddress,
        functionName,
        functionParameters: {
            inputValues: [
                {
                    type: TypeOptions.uintM,
                    uintIntMValue: UintIntMOptions.m256,
                    value: migrationOrWithdrawalNumber,
                }
            ],
            outputTypes: [
                functionsNames[functionName]
            ]
        }
    }
    const res = await readContract(overledger, DltNames.ethereum, input.fromAddress, input.contractAddress, input.functionName, input.functionParameters.inputValues, input.functionParameters.outputTypes);
    return { fname: functionName, result: res.data.results };
}

async function readContract(overledger, dlt, fromAddress, contractAddress, functionName, inputValues, outputTypes) {
    return await overledger.search.queryContract(dlt, fromAddress, contractAddress, functionName, inputValues, outputTypes);
}

async function readOracleOnOtherLedger(overledger, dlt, fromAddress, assetMigrationContractAddress, otherLedger) {
    const inputValues = [
        {
            type: TypeOptions.string,
            value: otherLedger.toString()
        }
    ];
    const outputTypes = [
        {
            type: TypeOptions.string
        }
    ];
    console.log(`readOracleOnOtherLedger assetMigrationContractAddress `, assetMigrationContractAddress);
    const res = await readContract(overledger, dlt, fromAddress, assetMigrationContractAddress, "getOracleAccountOnOtherLedger", inputValues, outputTypes);
    // console.log(`res `, res);
    return { fname: "getOracleAccountOnOtherLedger", result: res.data.results };
}

async function readMigrationOrWithdrawalId(overledger, dltKey, functionName, assetMigrationContractAddress) {
    const inputValues = [];
    const outputTypes = [
        functionsNames[functionName]
    ];

    const res = await readContract(overledger, dltKey.dltName, dltKey.dltAddress, assetMigrationContractAddress, functionName, inputValues, outputTypes);
    return { fname: functionName, result: res.data.results };
}

async function getAssetMigrationContract(overledger, dltKey, assetMigrationByteCodeContract, offset, length) {
    // see the case where the number of transactions is big ( search by chunks ?)
    let latestCreationMapp;
    const response = await overledger.readTransactionsByMappId(offset, length);
    let creationDetails;
    if (response) {
        const transactions = response.data;
        const txns = transactions.transactions;
        if (txns && txns.length > 0) {
            const sortedTxns = txns.filter(t => t.dltData.filter(d => d.dlt === DltNames.ethereum)).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
            for (let txn of sortedTxns) {
                const dltData = txn.dltData;
                const dltDataEth = dltData.filter(d => d.dlt === DltNames.ethereum);
                for (let data of dltDataEth) {
                    const txnHash = data.transactionHash;
                    const error = data.status.status;
                    if (txnHash && error !== 'error') {
                        let txnDetails;
                        try {
                            txnDetails = await overledger.search.getTransaction(txnHash);
                        } catch (e) {
                            continue;
                        }
                        const data = txnDetails.data;
                        if (data && data.data) {
                            const txnInfos = data.data;
                            if (txnInfos.creates !== '' && txnInfos.to === null) {
                                const contractIdentifierParams = new RequestVarParams(dltKey, "contractIdentifier");
                                console.log(`contractIdentifierParams ${contractIdentifierParams}`);
                                const resp = await readMigrationOrWithdrawalId(overledger, contractIdentifierParams.dltKey, contractIdentifierParams.paramName, txnInfos.creates);
                                console.log(`resp ${JSON.stringify(resp)}`);
                                const contractIdentifier = resp.result[0];
                                console.log(`contractIdentifier ${contractIdentifier}`);
                                if (contractIdentifier === "0x" + assetMigrationByteCodeContract) {
                                    latestCreationMapp = txn;
                                    creationDetails = { txnHash, createdContract: txnInfos.creates, timestamp: txn.timestamp };
                                    return { latestCreationMapp, creationDetails };
                                }
                            }
                        }
                    }
                }
            }
            console.log(`latest Creation ${JSON.stringify(latestCreationMapp)}`);
        } else {
            return [];
        }
        const initOffset = offset ? offset : DEFAULT_OFFSET;
        const initLength = length ? length : DEFAULT_LENGTH;
        return getLatestContract(overledger, initOffset + initLength + 1, initLength);
    } else {
        throw new Error('Failing to read the mappId data');
    }
}


async function getAssetMigrationContractAddress(overledger, dltKey, assetMigrationByteCodeContract, offset, length) {
    const resp = await getAssetMigrationContract(overledger, dltKey, assetMigrationByteCodeContract, offset, length);
    let contractAddress;
    if(resp){
        contractAddress = resp.creationDetails.createdContract;
    }
    return contractAddress;
}

// type, currency, sender, counterparty
async function getTrustline(overledger, trustlineDetails, offset, length) {
    // see the case where the number of transactions is big ( search by chunks ?)
    try {
        let trustlineTransactions;
        const response = await overledger.readTransactionsByMappId(offset, length);
        if (response) {
            const transactions = response.data;
            const txns = transactions.transactions;
            if (txns && txns.length > 0) {
                const xrpTxns = txns.filter(t => t.dltData.length > 0 && t.dltData.filter(d => d.dlt === DltNames.xrp));
                trustlineTransactions = await xrpTxns.reduce(async (validTransactions, txn) => {
                    const validTxns = await validTransactions;
                    const dltDataXRP = await txn.dltData.filter(data => data.dlt === DltNames.xrp);
                    const finalDatas = await dltDataXRP.reduce(async (matchingData, data) => {
                        const mData = await matchingData;
                        const txnHash = data.transactionHash;
                        const status = data.status.status;
                        // console.log(`txnHash ${txnHash} ${status}`);
                        if (txnHash && (status.toUpperCase() === STATUS_TXN_CONFIRMED || status.toUpperCase() === STATUS_TXN_BROADCASTED)) {
                            // console.log(`txnHash ${txnHash} status ${status.toUpperCase()}`);
                            const txnDetails = await overledger.search.getTransaction(txnHash);
                            const data = txnDetails.data;
                            if (data && data.data) {
                                const datas = data.data;
                                const type = datas.type;
                                // console.log(`trustlineDetails ${JSON.stringify(trustlineDetails)}`);
                                if (type.toUpperCase() === trustlineDetails.type.toUpperCase()) {
                                    // console.log(`${type.toUpperCase()} ${trustlineDetails.type.toUpperCase()}`);
                                    // console.log(`data ${JSON.stringify(datas)}`);
                                    const address = datas.address;
                                    const currency = datas.specification.currency;
                                    const counterparty = datas.specification.counterparty;
                                    const limit = datas.specification.limit;
                                    // console.log(`currency ${currency} address ${address} counterparty ${counterparty} limit ${limit}`);
                                    // test to the trustline details
                                    // check if amount less than the limit
                                    if (address === trustlineDetails.sender && counterparty === trustlineDetails.counterparty && currency === trustlineDetails.currency) {
                                        console.log(`DATA ADDED`);
                                        mData.push(data);
                                    }
                                }
                            }
                        }
                        return mData;
                    }, Promise.resolve([]));
                    if (finalDatas.length > 0) {
                        const obj = { txn };
                        const d = [];
                        finalDatas.map(s => d.push(s));
                        validTxns.push({ ...obj, data: d });
                    }
                    return validTxns;
                }, Promise.resolve([]));
                if (trustlineTransactions && trustlineTransactions.length === 0) {
                    const initOffset = offset ? offset : DEFAULT_OFFSET;
                    const initLength = length ? length : DEFAULT_LENGTH;
                    return getTrustline(overledger, trustlineDetails, initOffset + initLength + 1, initLength);
                }
            } else {
                return [];
            }
        } else {
            throw new Error('Failing to read the mappId data');
        }
        console.log(`Searching for XRP Trustlines ( ${trustlineDetails.type.toString().toUpperCase()} ): ${JSON.stringify(trustlineTransactions)}`);
        return trustlineTransactions.sort((a, b) => Date.parse(b.txn.timestamp) - Date.parse(a.txn.timestamp));
    } catch (e) {
        return [];
    }
}

async function migrateERC20AssetToLock(overledgerSDK, dltKey, destinationAddress, destinationLedger, migrationContractAddress, amount, feePrice, feeLimit) {
    let sequenceNumResponse = await overledgerSDK.dlts.ethereum.getSequence(dltKey.dltAddress);
    let sequenceNum = sequenceNumResponse.data.dltData[0].sequence;
    console.log(`amount ${amount} xrpAddress ${destinationAddress}`);
    const functionParameters = [
        {
            type: TypeOptions.uintM,
            name: 'numberOfAssetsToLockHere',
            uintIntMValue: UintIntMOptions.m256,
            value: amount.toString()
        },
        {
            type: TypeOptions.string,
            name: 'ledgerToMigrateTo',
            value: destinationLedger.toString()

        },
        {
            type: TypeOptions.string,
            name: 'destinationAccountOnOtherLedger',
            value: destinationAddress.toString()

        }
    ];
    const options = {
        amount: '0',
        sequence: sequenceNum,
        feePrice,
        feeLimit,
        functionDetails: {
            functionType: FunctionTypes.functionCall,
            functionName: "migrateAssetsRequest",
            payable: Payable.nonPayable,
            functionParameters
        }
    }
    let migratecontractInvocationTx = buildDLTransaction(overledgerSDK, DltNames.ethereum, migrationContractAddress, DataMessageOptions.smartContractInvocation, "", options);
    let signedContractInvocationTx = await signDLTransactions(overledgerSDK, [migratecontractInvocationTx]);
    console.log(`signedContractInvocationTx ${JSON.stringify(signedContractInvocationTx)}`);
    const result = (await overledgerSDK.send(signedContractInvocationTx)).data;
    console.log(`result ${JSON.stringify(result)}`);
    const transactionHash = result.dltData[0].transactionHash
    // do more check
    return transactionHash;
}

async function withdrawERC20AssetRequest(overledgerSDK, dltKey, otherLedgerAddress, sourceLedger, migrationContractAddress, amount, otherLedgerPubKey, accountOwnershipProof, feePrice, feeLimit) {
    let sequenceNumResponse = await overledgerSDK.dlts.ethereum.getSequence(dltKey.dltAddress);
    let sequenceNum = sequenceNumResponse.data.dltData[0].sequence;
    console.log(`amount ${amount}, sourceLedger ${sourceLedger}, otherLedgerAddress ${otherLedgerAddress}, otherLedgerPubKey ${otherLedgerPubKey}, accountOwnershipProof ${accountOwnershipProof} `);
    const functionParameters = [
        {
            type: TypeOptions.uintM,
            name: 'numberOfAssetsToWithdraw',
            uintIntMValue: UintIntMOptions.m256,
            value: amount.toString()
        },
        {
            type: TypeOptions.string,
            name: 'ledgerToWithdrawFrom',
            value: sourceLedger.toString()

        },
        {
            type: TypeOptions.string,
            name: 'otherLedgerAddress',
            value: otherLedgerAddress.toString()

        },
        {
            type: TypeOptions.string,
            name: 'otherLedgerPubKey',
            value: otherLedgerPubKey.toString()

        },
        {
            type: TypeOptions.string,
            name: 'otherLedgerAddressOwnershipProof',
            value: accountOwnershipProof.toString()

        }
    ];
    const options = {
        amount: '0',
        sequence: sequenceNum,
        feePrice,
        feeLimit,
        functionDetails: {
            functionType: FunctionTypes.functionCall,
            functionName: 'withdrawAssetsRequest',
            payable: Payable.nonPayable,
            functionParameters
        }
    }
    let migratecontractInvocationTx = buildDLTransaction(overledgerSDK, DltNames.ethereum, migrationContractAddress, DataMessageOptions.smartContractInvocation, "", options);
    let signedContractInvocationTx = await signDLTransactions(overledgerSDK, [migratecontractInvocationTx]);
    console.log(`signedContractInvocationTx ${JSON.stringify(signedContractInvocationTx)}`);
    const result = (await overledgerSDK.send(signedContractInvocationTx)).data;
    console.log(`result ${JSON.stringify(result)}`);
    const transactionHash = result.dltData[0].transactionHash
    // do more check
    return transactionHash;
}

async function completeMigrationRequest(overledgerSDK, dltKey, migrationContractAddress, migrationId, transactionHashOnOtherLedger, status, feePrice, feeLimit) {
    let sequenceNumResponse = await overledgerSDK.dlts.ethereum.getSequence(dltKey.dltAddress);
    let sequenceNum = sequenceNumResponse.data.dltData[0].sequence;
    const functionParameters = [
        {
            type: TypeOptions.uintM,
            name: 'migrationRequestId',
            uintIntMValue: UintIntMOptions.m256,
            value: migrationId
        },
        {
            type: TypeOptions.string,
            name: 'otherLedgerTxId',
            value: transactionHashOnOtherLedger

        },
        {
            type: TypeOptions.uintM,
            name: 'completedStatus',
            uintIntMValue: UintIntMOptions.m8,
            value: status

        }
    ];
    const options = {
        amount: '0',
        sequence: sequenceNum,
        feePrice,
        feeLimit,
        functionDetails: {
            functionType: FunctionTypes.functionCall,
            functionName: "completedMigrationRequest",
            payable: Payable.nonPayable,
            functionParameters
        }
    }
    let migratecontractInvocationTx = buildDLTransaction(overledgerSDK, DltNames.ethereum, migrationContractAddress, DataMessageOptions.smartContractInvocation, "", options);
    let signedContractInvocationTx = await signDLTransactions(overledgerSDK, [migratecontractInvocationTx]);
    console.log(`signedContractInvocationTx ${JSON.stringify(signedContractInvocationTx)}`);
    const result = (await overledgerSDK.send(signedContractInvocationTx)).data;
    console.log(`result ${JSON.stringify(result)}`);
    const transactionHash = result.dltData[0].transactionHash
    // do more check
    return transactionHash;
}

async function completeWithdrawRequest(overledgerSDK, dltKey, migrationContractAddress, withdrawId, status, feePrice, feeLimit) {
    let sequenceNumResponse = await overledgerSDK.dlts.ethereum.getSequence(dltKey.dltAddress);
    let sequenceNum = sequenceNumResponse.data.dltData[0].sequence;
    const functionParameters = [
        {
            type: TypeOptions.uintM,
            name: 'withdrawalRequestId',
            uintIntMValue: UintIntMOptions.m256,
            value: withdrawId
        },
        {
            type: TypeOptions.uintM,
            name: 'completedStatus',
            uintIntMValue: UintIntMOptions.m8,
            value: status

        }
    ];
    const options = {
        amount: '0',
        sequence: sequenceNum,
        feePrice,
        feeLimit,
        functionDetails: {
            functionType: FunctionTypes.functionCall,
            functionName: 'completeWithdrawalRequest',
            payable: Payable.nonPayable,
            functionParameters
        }
    }
    let migratecontractInvocationTx = buildDLTransaction(overledgerSDK, DltNames.ethereum, migrationContractAddress, DataMessageOptions.smartContractInvocation, "", options);
    let signedContractInvocationTx = await signDLTransactions(overledgerSDK, [migratecontractInvocationTx]);
    console.log(`signedContractInvocationTx ${JSON.stringify(signedContractInvocationTx)}`);
    const result = (await overledgerSDK.send(signedContractInvocationTx)).data;
    console.log(`result ${JSON.stringify(result)}`);
    const transactionHash = result.dltData[0].transactionHash
    // do more check
    return transactionHash;
}


async function initWithdrawAssets(overledgerSDK, dltKey, migrationContractAddress, amount, feePrice, feeLimit) {
    let sequenceNumResponse = await overledgerSDK.dlts.ethereum.getSequence(dltKey.dltAddress);
    let sequenceNum = sequenceNumResponse.data.dltData[0].sequence;
    console.log(`amount ${amount} xrpAddress ${xrpAddress}`);
    const functionParameters = [
        {
            type: TypeOptions.uintM,
            name: 'numberOfAssetsToLockHere',
            uintIntMValue: UintIntMOptions.m256,
            value: amount.toString()
        },
        {
            type: TypeOptions.string,
            name: 'ledgerToMigrateTo',
            value: DltNames.xrp.toString()

        },
        {
            type: TypeOptions.string,
            name: 'destinationAccountOnOtherLedger',
            value: xrpAddress.toString()

        }
    ];
    const options = {
        amount: '0',
        sequence: sequenceNum,
        feePrice,
        feeLimit,
        functionDetails: {
            functionType: FunctionTypes.functionCall,
            functionName: "migrateAssetsRequest",
            payable: Payable.nonPayable,
            functionParameters
        }
    }
    let migratecontractInvocationTx = buildDLTransaction(overledgerSDK, DltNames.ethereum, migrationContractAddress, DataMessageOptions.smartContractInvocation, "", options);
    let signedContractInvocationTx = await signDLTransactions(overledgerSDK, [migratecontractInvocationTx]);
    console.log(`signedContractInvocationTx ${JSON.stringify(signedContractInvocationTx)}`);
    const result = (await overledgerSDK.send(signedContractInvocationTx)).data;
    console.log(`result ${JSON.stringify(result)}`);
    const transactionHash = result.dltData[0].transactionHash
    // do more check
    return transactionHash;
}


async function setOracleOnLedgers(overledgerSDK, dltKey, accounts, curPos, confirmations, migrationContractAddress, feePrice, feeLimit) {
    // console.log(`confirmations `, confirmations);
    if (curPos > accounts.length - 1) {
        return confirmations;
    } else {
        const txHashOracleOnLedger = await setOracleOnLedger(overledgerSDK, dltKey, accounts[curPos], migrationContractAddress, feePrice, feeLimit);
        const confirmed = await checkForTransactionConfirmation(overledgerSDK, txHashOracleOnLedger, 0, 600);
        confirmations.push({ dlt: accounts[curPos].ledger, txnHash: txHashOracleOnLedger, confirmed });
        // console.log(`confirmations `, confirmations);
        return setOracleOnLedgers(overledgerSDK, dltKey, accounts, curPos + 1, confirmations, migrationContractAddress, feePrice, feeLimit);
    }
}

async function setOracleOnLedger(overledgerSDK, dltKey, account, migrationContractAddress, feePrice, feeLimit) {
    let sequenceNumResponse = await overledgerSDK.dlts.ethereum.getSequence(dltKey.dltAddress);
    let sequenceNum = sequenceNumResponse.data.dltData[0].sequence;
    console.log(`fromAddress `, dltKey.dltAddress);
    const functionParameters = [
        {
            type: TypeOptions.string,
            name: 'ledger',
            value: account.ledger
        },
        {
            type: TypeOptions.string,
            name: 'creationAccount',
            value: account.address

        }
    ];
    const options = {
        amount: '0',
        sequence: sequenceNum,
        feePrice,
        feeLimit,
        functionDetails: {
            functionType: FunctionTypes.functionCall,
            functionName: "addCreationAccountOnOtherLedger",
            payable: Payable.nonPayable,
            functionParameters
        }
    }
    console.log(`oracle options set `, options.functionDetails.functionParameters);
    let migratecontractInvocationTx = buildDLTransaction(overledgerSDK, DltNames.ethereum, migrationContractAddress, DataMessageOptions.smartContractInvocation, "", options);
    console.log(`migratecontractInvocationTx `, migratecontractInvocationTx);
    let signedContractInvocationTx = await signDLTransactions(overledgerSDK, [migratecontractInvocationTx]);
    console.log(`signedContractInvocationTx  ${JSON.stringify(signedContractInvocationTx)}`);
    const result = (await overledgerSDK.send(signedContractInvocationTx)).data;
    console.log(`result ${JSON.stringify(result)}`);
    const transactionHash = result.dltData[0].transactionHash
    // do more check
    return transactionHash;
}

async function setWithdrawalControl(overledgerSDK, dltKey, migrationContractAddress, functionName, fieldName, withdrawId, txnHash, feePrice, feeLimit) {
    let sequenceNumResponse = await overledgerSDK.dlts.ethereum.getSequence(dltKey.dltAddress);
    let sequenceNum = sequenceNumResponse.data.dltData[0].sequence;
    console.log(`migrationContractAddress ${migrationContractAddress}, functionName ${functionName}, fieldName ${fieldName}, withdrawId ${withdrawId}, txnTransactionHash ${txnHash} `);
    const functionParameters = [
        {
            type: TypeOptions.uintM,
            name: 'withdrawalRequestId',
            uintIntMValue: UintIntMOptions.m256,
            value: withdrawId.toString()
        },
        {
            type: TypeOptions.string,
            name: fieldName,
            value: txnHash.toString()

        }
    ];
    const options = {
        amount: '0',
        sequence: sequenceNum,
        feePrice,
        feeLimit,
        functionDetails: {
            functionType: FunctionTypes.functionCall,
            functionName,
            payable: Payable.nonPayable,
            functionParameters
        }
    }
    console.log(`oracle options set `, options.functionDetails.functionParameters);
    let migratecontractInvocationTx = buildDLTransaction(overledgerSDK, DltNames.ethereum, migrationContractAddress, DataMessageOptions.smartContractInvocation, "", options);
    console.log(`migratecontractInvocationTx `, migratecontractInvocationTx);
    let signedContractInvocationTx = await signDLTransactions(overledgerSDK, [migratecontractInvocationTx]);
    console.log(`signedContractInvocationTx  ${JSON.stringify(signedContractInvocationTx)}`);
    const result = (await overledgerSDK.send(signedContractInvocationTx)).data;
    console.log(`result ${JSON.stringify(result)}`);
    const transactionHash = result.dltData[0].transactionHash
    // do more check
    return transactionHash;
}


async function unlockERC20AssetsByOracle(overledgerSDK, dltKey, migrationContractAddress, withdrawalRequestId, otherLedgerTxId, completedStatus, feePrice, feeLimit) {
    let sequenceNumResponse = await overledgerSDK.dlts.ethereum.getSequence(dltKey.dltAddress);
    let sequenceNum = sequenceNumResponse.data.dltData[0].sequence;
    const functionParameters = [
        {
            type: TypeOptions.uintM,
            name: 'withdrawalRequestId',
            uintIntMValue: UintIntMOptions.m256,
            value: withdrawalRequestId.toString()
        },
        {
            type: TypeOptions.string,
            name: 'otherLedgerTxId',
            value: otherLedgerTxId.toString()

        },
        {
            type: TypeOptions.string,
            name: 'completedStatus',
            value: completedStatus.toString()

        }
    ];
    const options = {
        amount: '0',
        sequence: sequenceNum,
        feePrice,
        feeLimit,
        functionDetails: {
            functionType: FunctionTypes.functionCall,
            functionName: "completeWithdrawalRequest",
            payable: Payable.nonPayable,
            functionParameters
        }
    }
    let migratecontractInvocationTx = buildDLTransaction(overledgerSDK, DltNames.ethereum, migrationContractAddress, DataMessageOptions.smartContractInvocation, "", options);
    let signedContractInvocationTx = await signDLTransactions(overledgerSDK, [migratecontractInvocationTx]);
    console.log(`signedContractInvocationTx ${JSON.stringify(signedContractInvocationTx)}`);
    const result = (await overledgerSDK.send(signedContractInvocationTx)).data;
    console.log(`result ${JSON.stringify(result)}`);
    const transactionHash = result.dltData[0].transactionHash
    // do more check
    return transactionHash;
}


/**
 * allows any party to check if a tx has been confirmed 
 * @param {*} readOrderParameters 
 */
async function checkForTransactionConfirmation(overledgerSDK, transactionHash, retry, maxRetry) {
    sleep(3000);
    let confirmationResp;
    let txParams = await overledgerSDK.search.getTransaction(transactionHash.toString());
    if (txParams.data.dlt && txParams.data.dlt.toUpperCase() === DltNames.ethereum.toUpperCase()) {
        confirmationResp = txParams.data.data.blockNumber;
        if (parseInt(confirmationResp, 10) > 0) {
            console.log(`ethereum transaction ${transactionHash} confirmed`);
            return true;
        }
    } else if (txParams.data.dlt && txParams.data.dlt.toUpperCase() === DltNames.xrp.toUpperCase()) {
        confirmationResp = txParams.data.data.outcome.result;
        if (confirmationResp === "tesSUCCESS") {
            console.log(`ripple transaction ${transactionHash} confirmed`);
            return true;
        }
    }
    if (retry < maxRetry) {
        return checkForTransactionConfirmation(overledgerSDK, transactionHash, retry + 1, maxRetry)
    }
    return false;
}

async function createTrustlineTransaction(overledgerSDK, dltKey, toAddress, issuedCurrency, maxCredit, feePrice, maxLedgerVersion) {
    let sequenceNumResponse = await overledgerSDK.dlts.ripple.getSequence(dltKey.dltAddress);
    let sequenceNum = sequenceNumResponse.data.dltData[0].sequence;
    const transactionMessage = `Overledger JavaScript SDK Trustline between ${dltKey.dltAddress} and ${toAddress} for ${issuedCurrency} payments`;
    const trustlineParameters = {
        asset: issuedCurrency,
        maxCredit,
        ripplingDisabled: true,
        frozen: false
    }

    const options = {
        amount: '1',
        sequence: sequenceNum,
        feePrice,
        maxLedgerVersion,
        transactionType: TransactionTypes.paymentAsset,
        trustlineParameters
    };

    let migratecontractInvocationTx = buildDLTransaction(overledgerSDK, DltNames.xrp, toAddress, DataMessageOptions.ascii, transactionMessage, options);
    console.log(`migratecontractInvocationTx trustline ${migratecontractInvocationTx}`);
    let signedContractInvocationTx = await signDLTransactions(overledgerSDK, [migratecontractInvocationTx]);
    const result = (await overledgerSDK.send(signedContractInvocationTx)).data;
    console.log(`result ${JSON.stringify(result)}`);
    const transactionHash = result.dltData[0].transactionHash
    console.log(`migratecontractInvocationTx trustline transactionHash `, transactionHash);
    return transactionHash;

}

async function makeIssuedCurrencyPayment(overledgerSDK, dltKey, toAddress, amount, issuedCurrency, feePrice, maxLedgerVersion) {
    try {
        let sequenceNumResponse = await overledgerSDK.dlts.ripple.getSequence(dltKey.dltAddress);
        let sequenceNum = sequenceNumResponse.data.dltData[0].sequence;
        const transactionMessage = `Overledger JavaScript SDK payment between ${dltKey.dltAddress} and ${toAddress} in ${issuedCurrency} currency`;
        const options = {
            amount,
            currency: issuedCurrency,
            sequence: sequenceNum,
            feePrice,
            maxLedgerVersion,
            transactionType: TransactionTypes.payment
        };
        let migratecontractInvocationTx = buildDLTransaction(overledgerSDK, DltNames.xrp, toAddress, DataMessageOptions.ascii, transactionMessage, options);
        console.log(`migratecontractInvocationTx `, migratecontractInvocationTx);
        let signedContractInvocationTx = await signDLTransactions(overledgerSDK, [migratecontractInvocationTx]);
        const result = (await overledgerSDK.send(signedContractInvocationTx)).data;
        console.log(`result ${JSON.stringify(result)}`);
        const transactionHash = result.dltData[0].transactionHash
        console.log(`makeIssuedCurrencyPayment transactionHash `, transactionHash);
        return transactionHash;
    }
    catch (e) {
        console.log(e);
        // "status":{"status":"error","code":"tecPATH_PARTIAL","message":"Path could not send full amount."}
        // result {"mappId":"asset.migration.demo","overledgerTransactionId":"3d150001-d61c-4c10-bd6e-ccc099b556a6","timestamp":"2020-02-04T10:01:18.940341Z","dltData":[{"dltMessageId":"f7aba165-f234-405a-986d-ab4f7c787971","overledgerTransactionId":"3d150001-d61c-4c10-bd6e-ccc099b556a6","dlt":"ripple","transactionHash":"F0A3F7C90A33D6CBA7CB1063C3EA42F421020B6C40CAA8C1E69BF2D0A7C0C626","status":{"status":"error","code":"tecPATH_PARTIAL","message":"Path could not send full amount."},"links":[]}]}
        console.log(`amount too big for what the left in the trustline limit`);
    }
}


/**
 * Sleeps for a number of miliseconds
 * @param {*} ms - the number of miliseconds
 */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


exports.validateConstructorMigrationParameters = validateConstructorMigrationParameters;
exports.validateAssetsMigrationRequestParameters = validateAssetsMigrationRequestParameters;
exports.startup = startup;
exports.tokenTranferApproval = tokenTranferApproval;
exports.migrateERC20AssetToLock = migrateERC20AssetToLock;
exports.instantiateOverledgerInstance = instantiateOverledgerInstance;
exports.addAccountsToOverledger = addAccountsToOverledger;
exports.validateSetOracleOtherLedgerParameters = validateSetOracleOtherLedgerParameters;
exports.setOracleOnLedger = setOracleOnLedger;
exports.readMigrationWithdraw = readMigrationWithdraw;
exports.checkForTransactionConfirmation = checkForTransactionConfirmation;
exports.readContract = readContract;
exports.createTrustlineTransaction = createTrustlineTransaction;
exports.validateTrustlineCreationParameters = validateTrustlineCreationParameters;
exports.makeIssuedCurrencyPayment = makeIssuedCurrencyPayment;
exports.getTrustline = getTrustline;
exports.validatePaymentTransactionParameters = validatePaymentTransactionParameters;
exports.unlockERC20AssetsByOracle = unlockERC20AssetsByOracle;
exports.initWithdrawAssets = initWithdrawAssets;
exports.readOracleOnOtherLedger = readOracleOnOtherLedger;
exports.validateReadOracleOtherLedgerParameters = validateReadOracleOtherLedgerParameters;
exports.readMigrationOrWithdrawalId = readMigrationOrWithdrawalId;
exports.validateCompleteMigrationParameters = validateCompleteMigrationParameters;
exports.completeMigrationRequest = completeMigrationRequest;
exports.setOracleOnLedgers = setOracleOnLedgers;
exports.validateAssetsWithdrawalRequestParameters = validateAssetsWithdrawalRequestParameters;
exports.withdrawERC20AssetRequest = withdrawERC20AssetRequest;
exports.validateCompleteWithdrawParameters = validateCompleteWithdrawParameters;
exports.completeWithdrawRequest = completeWithdrawRequest;
exports.validateReadDataParameters = validateReadDataParameters;
exports.setWithdrawalControl = setWithdrawalControl;
exports.validateMigrationWithdrawParameters = validateMigrationWithdrawParameters;
exports.validateWithdrawalControlParameters = validateWithdrawalControlParameters;
exports.getAssetMigrationContractAddress = getAssetMigrationContractAddress;

// 0x51b0387c7537c777290d8bc0732ab804cca86cbd05ab3290a3445ed5a63221e4