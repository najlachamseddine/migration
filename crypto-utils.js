const elliptic = require('elliptic');
const bs58 = require('bs58');
const rippleKeys = require('ripple-keypairs');
const secp256k1 = elliptic.ec('secp256k1');
const sha256 = require("crypto-js/sha256");


function convertBs58ToHexFormat(b58Str) {
    return bs58.decode(b58Str).toString('hex');
}

function computePublicKeyFromPrivateKey(b58PrivateKey) {
    // if the address is in base 58 format
    const hexPrivateKey = convertBs58ToHexFormat(b58PrivateKey); // without 0x
    // compute the public key from the hex private key
    const bytesPubKey = secp256k1.keyFromPrivate(hexPrivateKey).getPublic().encodeCompressed();
    const pubKey = Buffer.from(bytesPubKey, 'hex').toString('hex');
    return pubKey;
}

function signMessage(messageStr, b58PrivateKey) {
    const hexPrivateKey = convertBs58ToHexFormat(b58PrivateKey)
    const messageHash = sha256(messageStr).toString();
    const signature = rippleKeys.sign(messageHash, hexPrivateKey);
    return signature;
}

function verifyMessageSource(messageStr, signature, hexPubKey) {
    const messageHash = sha256(messageStr).toString();
    const validateSource = rippleKeys.verify(messageHash, signature, hexPubKey);
    return validateSource;
}

exports.verifyMessageSource = verifyMessageSource;
exports.signMessage = signMessage;
exports.computePublicKeyFromPrivateKey = computePublicKeyFromPrivateKey;


// const privateKey = 'sn7L76XFhNkCDgunGPbrxSvappogc';
// const messageStr = "oracle";
// console.log(`privateKey: sn7L76XFhNkCDgunGPbrxSvappogc`);
// const hexPrivateKey = convertBs58ToHexFormat(privateKey);
// console.log(`hexPrivateKey `, hexPrivateKey);
// const hexPubKey = computePublicKeyFromPrivateKey('sn7L76XFhNkCDgunGPbrxSvappogc');
// console.log(`hexPubKey `, hexPubKey);
// const signature = signMessage(messageStr, privateKey);
// console.log(`signature `, signature);
// const verifSource = verifyMessageSource(messageStr, signature, hexPubKey);
// console.log(`verifSource `, verifSource);

// privateKey: sn7L76XFhNkCDgunGPbrxSvappogc
// hexPrivateKey  0339c48a831e7c3c9f01d6d9a44da10dd1f1100b4d19
// hexPubKey  02e89f5bfdd730ba446dcc2a02099db67aa6e05a344f83f9759997a0c59e3bfaf8
// signature  30440220321162C82F78E0D658AE16A260C98C79911202867E79362F242FF67E3D5F236B02203987CB765B692FBBF11566DB92E953887D862F65DBC3EA774D39E91930F1546F
// verifSource  true

