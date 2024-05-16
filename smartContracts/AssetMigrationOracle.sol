pragma solidity ^0.5.0;

import "./EIP20Interface.sol";

contract MigrationContract {

    //sees who sends their balance here to this contract for lockup
    mapping (uint256 => migrationRequest) userMigrationRequests; //logs migration requests
    mapping (string => string) oracleAccountOnOtherLedger; //maps ledger name -> oracle ledger account creating the assets
    mapping (uint256 => withdrawRequest) userWithdrawRequests;
    uint256 public totalWithdrawalRequests = 0; //total number ever (i.e. we do not delete a withdrawal request after it was completed)
    uint256 public totalMigrationRequests = 0; //total number ever (i.e. we do not delete a withdrawal request after it was completed)
    uint256 public completedMigrations = 0;
    uint256 public completedWithdraws = 0;
    ERC20Interface linkedContract;
    address public oracle; //the ethereum address of the oracle
    string public contractIdentifier;

    struct migrationRequest {
        
        address user;
        string ledger;
        string destinationAccount;
        uint256 amount;
        string otherLedgerTxID;
        uint8 completed; //0 for no, 1 for yes, 2 for ignored (malicious migration request)
        
    }
    
    struct withdrawRequest {
        
        address user;
        string ledger;
        uint256 amount;
        string otherLedgerAddress;
        string otherLedgerPubKey;
        string otherLedgerAddressProof;
        string otherLedgerTxID;
        string otherLedgerIncomeTxID;
        string oracleTrustlineTxID;
        uint8 completed; //0 for no, 1 for yes, 2 for ignored (malicious withdrawal request)
        
    }
    
    //contractAddress = address of token contract to migrate
    //oracleOwner = the oracle in charge of this contract
    //contractByteCodeHash = the sha256 hash of the smart contract byte code
    constructor(address contractAddress, address oracleOwner, string memory contractByteCodeHash) public {
         oracle = oracleOwner;
         linkedContract = ERC20Interface(contractAddress);
         contractIdentifier = contractByteCodeHash;
    }
        
    function migrateAssetsRequest(uint256 numberOfAssetsToLockHere, string calldata ledgerToMigrateTo, string calldata destinationAccountOnOtherLedger) external {
        //validation check - does oracle connect to this ledger?
        if (keccak256(abi.encodePacked(oracleAccountOnOtherLedger[ledgerToMigrateTo])) != keccak256(abi.encodePacked(""))){
               //update local storage
            migrationRequest memory thisMigrationRequest; 
            thisMigrationRequest.user = msg.sender;
            thisMigrationRequest.ledger = ledgerToMigrateTo;
            thisMigrationRequest.destinationAccount = destinationAccountOnOtherLedger;
            thisMigrationRequest.amount = numberOfAssetsToLockHere;
            thisMigrationRequest.otherLedgerTxID = ""; //to be filed in by the oracle
            thisMigrationRequest.completed = 0; //to be filled in by the oracle
            userMigrationRequests[totalMigrationRequests] = thisMigrationRequest;
            totalMigrationRequests++;
            //call linked contract transfer function
            linkedContract.transferFrom(msg.sender, address(this), numberOfAssetsToLockHere);         
        } else {
            revert("This ledger is not supported by the oracle");    
        }
        
    }
    
    function withdrawAssetsRequest(uint256 numberOfAssetsToWithdraw, string calldata ledgerToWithdrawFrom, string calldata otherLedgerAddress, string calldata otherLedgerPubKey, string calldata otherLedgerAddressOwnershipProof) external {
        //validation check - does oracle connect to this ledger?
        if (keccak256(abi.encodePacked(oracleAccountOnOtherLedger[ledgerToWithdrawFrom])) == keccak256(abi.encodePacked(""))){
            revert("This ledger is not supported by the oracle"); 
        } else if (keccak256(abi.encodePacked(otherLedgerAddressOwnershipProof)) == keccak256(abi.encodePacked(""))){
            revert("You must provide proof that you own this account"); //what proof shall we provide -> a digital signature of the word "oracle" using the other ledgers private key?
        } else if (keccak256(abi.encodePacked(otherLedgerAddress)) == keccak256(abi.encodePacked(""))){
            revert("You must have sent the oracle on the other ledger the assets to withdraw. You need to provide that transaction ID of the other ledger now"); 
        } else {
               //update local storage
            withdrawRequest memory thisWithdrawRequest;
            thisWithdrawRequest.user = msg.sender;
            thisWithdrawRequest.ledger = ledgerToWithdrawFrom;
            thisWithdrawRequest.amount = numberOfAssetsToWithdraw;
            thisWithdrawRequest.otherLedgerAddress = otherLedgerAddress;
            thisWithdrawRequest.otherLedgerPubKey = otherLedgerPubKey;
            thisWithdrawRequest.otherLedgerAddressProof = otherLedgerAddressOwnershipProof;
            thisWithdrawRequest.otherLedgerTxID = "";
            thisWithdrawRequest.otherLedgerIncomeTxID = "";
            thisWithdrawRequest.completed = 0;
            thisWithdrawRequest.oracleTrustlineTxID = "";
            userWithdrawRequests[totalWithdrawalRequests] = thisWithdrawRequest;
            totalWithdrawalRequests++;
        }
        
    }
    
    function completedMigrationRequest(uint256 migrationRequestId, string calldata otherLedgerTxId, uint8 completedStatus) external {
        //validation check - does oracle connect to this ledger?
               // update local storage
               // ADDING CHECK ON THE OWNER
            if (msg.sender == oracle){
                if(userMigrationRequests[migrationRequestId].completed == 0){
                userMigrationRequests[migrationRequestId].completed = completedStatus;
                userMigrationRequests[migrationRequestId].otherLedgerTxID = otherLedgerTxId;
                completedMigrations++;
                } else {
                    revert("This migration request is already completed");
                }
                } else {
                    revert("only the owner of this contract can call this function");
                }
            }
    
    function completeWithdrawalRequest(uint256 withdrawalRequestId, uint8 completedStatus) external {
        //validation check - does oracle connect to this ledger?
               // update local storage
            if (msg.sender == oracle) {
                if(userWithdrawRequests[withdrawalRequestId].completed == 0) {
                userWithdrawRequests[withdrawalRequestId].completed = completedStatus;
                completedWithdraws++;
                //call linked function if a corrected completed flag has been passed in
                if (completedStatus == 1) {
                    linkedContract.transfer(userWithdrawRequests[withdrawalRequestId].user, userWithdrawRequests[withdrawalRequestId].amount);                                   
                } 
                } else {
                    revert("This withdrawal request is already completed");
                }
            }  else {
                    revert("only the owner of this contract can call this function");
                }   
    }
    
    function addCreationAccountOnOtherLedger(string calldata ledger, string calldata creationAccount) external{
        //validation check - only owner can call this function
        if (msg.sender == oracle){
            oracleAccountOnOtherLedger[ledger] = creationAccount;      
        } else {
            revert("only the owner of this contract can call this function");
        }

    }

    function setOracleWithdrawalTrustline(uint256 withdrawalRequestId, string calldata oracleTrustlineTxHash) external {
       userWithdrawRequests[withdrawalRequestId].oracleTrustlineTxID = oracleTrustlineTxHash;
    }

    function setOtherLedgerWithdrawalTransaction(uint256 withdrawalRequestId, string calldata otherLedgerTxHash ) external {
        userWithdrawRequests[withdrawalRequestId].otherLedgerTxID = otherLedgerTxHash;
    }

    function setOtherLedgerIncomeTransaction(uint256 withdrawalRequestId, string calldata otherLedgerIncomeTxHash ) external {
        userWithdrawRequests[withdrawalRequestId].otherLedgerIncomeTxID = otherLedgerIncomeTxHash;
    }

    function getMigrationUser(uint256 id) external view returns (address){
    
        return userMigrationRequests[id].user;
        
    }
    
    function getMigrationLedger(uint256 id) external view returns (string memory){
    
        return userMigrationRequests[id].ledger;
        
    }
    
    function getMigrationDestinationAccount(uint256 id) external view returns (string memory){
    
        return userMigrationRequests[id].destinationAccount;
        
    }
    
    function getMigrationAmount(uint256 id) external view returns (uint256){
    
        return userMigrationRequests[id].amount;
        
    }
    
    function getMigrationOtherLedgerTxId(uint256 id) external view returns (string memory){
    
        return userMigrationRequests[id].otherLedgerTxID;
        
    }
    
    function getMigrationCompleted(uint256 id) external view returns (uint8){
    
        return userMigrationRequests[id].completed;
        
    }
    
    
    function getOracleAccountOnOtherLedger(string calldata ledgerName) external view returns (string memory){
    
        return oracleAccountOnOtherLedger[ledgerName];
        
    }
    
    function getWithdrawalRequestAccount(uint256 id) external view returns (address){
        
        return userWithdrawRequests[id].user;
        
    }
    
    function getWithdrawalRequestFromLedger(uint256 id) external view returns (string memory){
        
        return userWithdrawRequests[id].ledger;
        
    }
    
    function getWithdrawalRequestAmount(uint256 id) external view returns (uint256){
        
        return userWithdrawRequests[id].amount;
        
    }
    
    function getWithdrawalRequestOtherLedgerTxID(uint256 id) external view returns (string memory){
        
        return userWithdrawRequests[id].otherLedgerTxID;
        
    }
    
    function getWithdrawalRequestOtherLedgerAddressProof(uint256 id) external view returns (string memory){
        
        return userWithdrawRequests[id].otherLedgerAddressProof;
        
    }

    function getWithdrawalRequestOtherLedgerPubKey(uint256 id) external view returns (string memory){
        
        return userWithdrawRequests[id].otherLedgerPubKey;
        
    }

     function getWithdrawalOtherLedgerAddress(uint256 id) external view returns (string memory){
        
        return userWithdrawRequests[id].otherLedgerAddress;
        
    }



      function getWithdrawalOracleTrustlineTxID(uint256 id) external view returns (string memory){
        
        return userWithdrawRequests[id].oracleTrustlineTxID;
        
    }

      function getWithdrawalOtherLedgerTxID(uint256 id) external view returns (string memory){
        
        return userWithdrawRequests[id].otherLedgerTxID;
        
    }

      function getWithdrawalOtherLedgerIncomeTxID(uint256 id) external view returns (string memory){
        
        return userWithdrawRequests[id].otherLedgerIncomeTxID;
        
    }

    
    function getWithdrawalRequestCompleted(uint256 id) external view returns (uint8){
        
        return userWithdrawRequests[id].completed;
        
    }
    

}


