import { KuznyechikCipher } from "../src/domain/cryptography/gost/KuznyechikCipher";
import { Streebog512Hasher } from "../src/domain/cryptography/gost/Streebog512Hasher";
import { parseHexString, toHexString } from "../src/domain/cryptography/HexEncoding";
import { CryptographicOddPrimeCandidateSource } from "../src/domain/cryptography/primes/CryptographicOddPrimeCandidateSource";
import { CryptographicRandomIntegerSource } from "../src/domain/cryptography/primes/CryptographicRandomIntegerSource";
import { MillerRabinPrimalityTester } from "../src/domain/cryptography/primes/MillerRabinPrimalityTester";
import { ProbablePrimeNumberGenerator } from "../src/domain/cryptography/primes/ProbablePrimeNumberGenerator";
import { RsaCipher } from "../src/domain/cryptography/rsa/RsaCipher";
import { RsaKeyPairFactory } from "../src/domain/cryptography/rsa/RsaKeyPairFactory";
import { RsaStreebogDigitalSignature } from "../src/domain/cryptography/rsa/RsaStreebogDigitalSignature";

function assertEqualHex(actual: Uint8Array, expectedHex: string, label: string): void {
  const expected = parseHexString(expectedHex);
  const actualHex = toHexString(actual);
  const normalizedExpected = toHexString(expected);
  if (actualHex !== normalizedExpected) {
    throw new Error(`${label}\n actual:   ${actualHex}\n expected: ${normalizedExpected}`);
  }
  console.log(`OK  ${label}`);
}

const kuznyechikKey = parseHexString("8899aabbccddeeff0011223344556677fedcba98765432100123456789abcdef");
const kuznyechikPlain = parseHexString("1122334455667700ffeeddccbbaa9988");
const kuznyechikCipher = new KuznyechikCipher(kuznyechikKey);
const kuznyechikEncrypted = kuznyechikCipher.encryptBlock(kuznyechikPlain);
assertEqualHex(kuznyechikEncrypted, "7f679d90bebc24305a468d42b9d4edcd", "Kuznyechik RFC 7801 encrypt");
assertEqualHex(kuznyechikCipher.decryptBlock(kuznyechikEncrypted), "1122334455667700ffeeddccbbaa9988", "Kuznyechik RFC 7801 decrypt");

const streebog = new Streebog512Hasher();
const messageM1 = parseHexString(`
  32313039383736353433323130393837
  36353433323130393837363534333231
  30393837363534333231303938373635
  343332313039383736353433323130
`);
assertEqualHex(
  streebog.hashBytes(messageM1),
  `
    486f64c1917879417fef082b3381a4e2
    11c324f074654c38823a7b76f830ad00
    fa1fbae42b1285c0352f227524bc9ab1
    6254288dd6863dccd5b9f54a1ad0541b
  `,
  "Streebog-512 RFC 6986 example 1",
);

console.log("All cryptographic self-tests passed.");

async function testRsaRoundTrip(): Promise<void> {
  const randomIntegerSource = new CryptographicRandomIntegerSource();
  const primeNumberGenerator = new ProbablePrimeNumberGenerator(
    new CryptographicOddPrimeCandidateSource(randomIntegerSource),
    new MillerRabinPrimalityTester(randomIntegerSource),
  );
  const keyPair = await new RsaKeyPairFactory(primeNumberGenerator).generateAsync(1024, 65537n, {
    millerRabinWitnessRoundCount: 3,
    trialDivisionPrimeCount: 200,
  });
  const cipher = new RsaCipher(randomIntegerSource);
  const plaintext = new TextEncoder().encode("rsa-self-test");
  const decrypted = cipher.decrypt(cipher.encrypt(plaintext, keyPair.publicKey), keyPair.privateKey);
  if (new TextDecoder().decode(decrypted) !== "rsa-self-test") {
    throw new Error("RSA round-trip failed");
  }
  const signatureService = new RsaStreebogDigitalSignature();
  const signature = signatureService.sign(plaintext, keyPair.privateKey);
  if (!signatureService.verify(plaintext, signature, keyPair.publicKey)) {
    throw new Error("RSA-Streebog signature failed");
  }
  const { rsaCrtModularPower, modularPower } = await import("../src/domain/cryptography/primes/BigIntegerArithmetic");
  const sample = 42n;
  const naive = modularPower(sample, keyPair.privateKey.privateExponent, keyPair.privateKey.modulus);
  const crt = rsaCrtModularPower(
    sample,
    keyPair.privateKey.privateExponent,
    keyPair.privateKey.primeP,
    keyPair.privateKey.primeQ,
  );
  if (naive !== crt) {
    throw new Error("RSA CRT mismatch");
  }
  console.log("OK  RSA-1024 round-trip, EDS and CRT");

  const { encodeRsaPrivateKeyPkcs1Pem, encodeRsaPublicKeySpkiPem } = await import(
    "../src/domain/cryptography/rsa/RsaPemEncoding"
  );
  const { createPrivateKey, createPublicKey, publicEncrypt, privateDecrypt, constants } = await import("node:crypto");
  const privatePem = encodeRsaPrivateKeyPkcs1Pem(
    keyPair.privateKey.modulus,
    keyPair.privateKey.publicExponent,
    keyPair.privateKey.privateExponent,
    keyPair.privateKey.primeP,
    keyPair.privateKey.primeQ,
  );
  const publicPem = encodeRsaPublicKeySpkiPem(keyPair.publicKey.modulus, keyPair.publicKey.publicExponent);
  createPrivateKey(privatePem);
  createPublicKey(publicPem);
  const nodeCiphertext = publicEncrypt(
    { key: publicPem, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from("pem-interop"),
  );
  const nodePlaintext = privateDecrypt({ key: privatePem, padding: constants.RSA_PKCS1_PADDING }, nodeCiphertext);
  if (nodePlaintext.toString("utf8") !== "pem-interop") {
    throw new Error("PEM PKCS#1 interop with Node crypto failed");
  }
  console.log("OK  RSA PKCS#1 PEM imported by Node crypto");
}

void testRsaRoundTrip();
