import { PI_INVERSE_TABLE, STransform } from "@/domain/cryptography/gost/PiSubstitution";

const BLOCK_SIZE_BYTES = 16;
const ROUND_KEY_COUNT = 10;
const KEY_SIZE_BYTES = 32;

/**
 * Коэффициенты линейного преобразования l(a_15,...,a_0) над GF(2^8)/p(x),
 * p(x) = x^8 + x^7 + x^6 + x + 1.
 * В RFC 7801 опечатка во втором слагаемом: должно быть 32 * δ(a_14).
 */
const LINEAR_TRANSFORMATION_COEFFICIENTS: readonly number[] = [
  148, 32, 133, 16, 194, 192, 1, 251, 1, 192, 194, 16, 133, 32, 148, 1,
];

const GALOIS_FIELD_REDUCTION_POLYNOMIAL = 0xc3;

/**
 * Блочный шифр «Кузнечик» (ГОСТ Р 34.12-2015 / RFC 7801): 128-битный блок, 256-битный ключ.
 */
export class KuznyechikCipher {
  private readonly roundKeys: Uint8Array[];

  /**
   * Разворачивает десять раундовых ключей из 32-байтного мастер-ключа.
   * @param masterKey Ключ длиной 32 байта.
   */
  public constructor(masterKey: Uint8Array) {
    if (masterKey.length !== KEY_SIZE_BYTES) {
      throw new Error("Ключ «Кузнечика» должен занимать 256 бит (32 байта).");
    }

    this.roundKeys = expandRoundKeys(masterKey);
  }

  /**
   * Шифрует один 16-байтный блок.
   * @param plainBlock Открытый блок.
   * @returns Шифрблок той же длины.
   */
  public encryptBlock(plainBlock: Uint8Array): Uint8Array {
    assertBlockSize(plainBlock);
    let state: Uint8Array<ArrayBufferLike> = new Uint8Array(plainBlock);

    for (let roundIndex = 0; roundIndex < ROUND_KEY_COUNT - 1; roundIndex += 1) {
      state = LTransform(STransform(xOr(state, this.roundKeys[roundIndex])));
    }

    return xOr(state, this.roundKeys[ROUND_KEY_COUNT - 1]);
  }

  /**
   * Расшифровывает один 16-байтный блок.
   * @param cipherBlock Шифрблок.
   * @returns Открытый блок.
   */
  public decryptBlock(cipherBlock: Uint8Array): Uint8Array {
    assertBlockSize(cipherBlock);
    let state: Uint8Array<ArrayBufferLike> = xOr(cipherBlock, this.roundKeys[ROUND_KEY_COUNT - 1]);

    for (let roundIndex = ROUND_KEY_COUNT - 2; roundIndex >= 0; roundIndex -= 1) {
      state = xOr(STransform(applyInverseLinear(state), PI_INVERSE_TABLE), this.roundKeys[roundIndex]);
    }

    return state;
  }

  /**
   * Шифрует данные в режиме CBC с дополнением PKCS#7.
   * @param plaintext Открытый текст произвольной длины.
   * @param initializationVector 16-байтный вектор инициализации.
   * @returns Шифртекст, кратный 16 байтам.
   */
  public encryptCbc(plaintext: Uint8Array, initializationVector: Uint8Array): Uint8Array {
    assertBlockSize(initializationVector);
    const paddedPlaintext = applyPkcs7Padding(plaintext);
    const ciphertext = new Uint8Array(paddedPlaintext.length);
    let previousBlock: Uint8Array<ArrayBufferLike> = new Uint8Array(initializationVector);

    for (let offset = 0; offset < paddedPlaintext.length; offset += BLOCK_SIZE_BYTES) {
      const currentPlainBlock = paddedPlaintext.subarray(offset, offset + BLOCK_SIZE_BYTES);
      const encryptedBlock = this.encryptBlock(xOr(currentPlainBlock, previousBlock));
      ciphertext.set(encryptedBlock, offset);
      previousBlock = encryptedBlock;
    }

    return ciphertext;
  }

  /**
   * Расшифровывает данные в режиме CBC и снимает дополнение PKCS#7.
   * @param ciphertext Шифртекст, кратный 16 байтам.
   * @param initializationVector 16-байтный вектор инициализации.
   * @returns Открытый текст без дополнения.
   */
  public decryptCbc(ciphertext: Uint8Array, initializationVector: Uint8Array): Uint8Array {
    assertBlockSize(initializationVector);
    if (ciphertext.length === 0 || ciphertext.length % BLOCK_SIZE_BYTES !== 0) {
      throw new Error("Шифртекст «Кузнечика» должен быть кратен 16 байтам.");
    }

    const plaintext = new Uint8Array(ciphertext.length);
    let previousBlock: Uint8Array<ArrayBufferLike> = new Uint8Array(initializationVector);

    for (let offset = 0; offset < ciphertext.length; offset += BLOCK_SIZE_BYTES) {
      const currentCipherBlock = ciphertext.subarray(offset, offset + BLOCK_SIZE_BYTES);
      plaintext.set(xOr(this.decryptBlock(currentCipherBlock), previousBlock), offset);
      previousBlock = new Uint8Array(currentCipherBlock);
    }

    return removePkcs7Padding(plaintext);
  }
}

/**
 * Строит десять раундовых ключей по схеме развёртки ГОСТ Р 34.12-2015.
 * @param masterKey 32-байтный мастер-ключ.
 * @returns Массив из 10 раундовых ключей по 16 байт.
 */
function expandRoundKeys(masterKey: Uint8Array): Uint8Array[] {
  const roundKeys: Uint8Array[] = [
    new Uint8Array(masterKey.subarray(0, BLOCK_SIZE_BYTES)),
    new Uint8Array(masterKey.subarray(BLOCK_SIZE_BYTES, KEY_SIZE_BYTES)),
  ];

  let leftPart: Uint8Array<ArrayBufferLike> = new Uint8Array(roundKeys[0]);
  let rightPart: Uint8Array<ArrayBufferLike> = new Uint8Array(roundKeys[1]);

  for (let iteration = 0; iteration < 4; iteration += 1) {
    for (let constantIndex = 0; constantIndex < 8; constantIndex += 1) {
      const constantVector = new Uint8Array(BLOCK_SIZE_BYTES);
      constantVector[BLOCK_SIZE_BYTES - 1] = iteration * 8 + constantIndex + 1;
      const roundConstant = LTransform(constantVector);
      const nextLeft = xOr(LTransform(STransform(xOr(leftPart, roundConstant))), rightPart);
      rightPart = leftPart;
      leftPart = nextLeft;
    }
    roundKeys.push(new Uint8Array(leftPart));
    roundKeys.push(new Uint8Array(rightPart));
  }

  return roundKeys;
}

/**
 * Применяет линейное преобразование L = R¹⁶.
 * @param block Входной блок.
 */
function LTransform(block: Uint8Array): Uint8Array {
  let state: Uint8Array<ArrayBufferLike> = new Uint8Array(block);
  for (let iteration = 0; iteration < BLOCK_SIZE_BYTES; iteration += 1) {
    state = applyR(state);
  }
  return state;
}

/**
 * Применяет обратное линейное преобразование L⁻¹.
 * @param block Входной блок.
 */
function applyInverseLinear(block: Uint8Array): Uint8Array {
  let state: Uint8Array<ArrayBufferLike> = new Uint8Array(block);
  for (let iteration = 0; iteration < BLOCK_SIZE_BYTES; iteration += 1) {
    state = applyInverseR(state);
  }
  return state;
}

/**
 * Один шаг R линейного преобразования: линейная комбинация в первый байт и сдвиг.
 * @param block Входной блок.
 */
function applyR(block: Uint8Array): Uint8Array {
  const rotated = new Uint8Array(BLOCK_SIZE_BYTES);
  rotated[0] = computeLinearCombination(block);
  rotated.set(block.subarray(0, BLOCK_SIZE_BYTES - 1), 1);
  return rotated;
}

/**
 * Обратный шаг R⁻¹.
 * @param block Входной блок.
 */
function applyInverseR(block: Uint8Array): Uint8Array {
  const linearInput = new Uint8Array(BLOCK_SIZE_BYTES);
  linearInput.set(block.subarray(1), 0);
  linearInput[BLOCK_SIZE_BYTES - 1] = block[0];
  const result = new Uint8Array(BLOCK_SIZE_BYTES);
  result.set(block.subarray(1), 0);
  result[BLOCK_SIZE_BYTES - 1] = computeLinearCombination(linearInput);
  return result;
}

/**
 * Считает l(a₁₅,…,a₀) — линейную комбинацию байт блока в GF(2⁸).
 * @param block 16-байтный блок.
 */
function computeLinearCombination(block: Uint8Array): number {
  let accumulator = 0;
  for (let index = 0; index < BLOCK_SIZE_BYTES; index += 1) {
    accumulator ^= multiplyInGaloisField(block[index], LINEAR_TRANSFORMATION_COEFFICIENTS[index]);
  }
  return accumulator;
}

/**
 * Умножает два элемента поля GF(2⁸) с редукцией по p(x) = x⁸ + x⁷ + x⁶ + x + 1.
 * @param left Левый множитель.
 * @param right Правый множитель.
 */
function multiplyInGaloisField(left: number, right: number): number {
  let product = 0;
  let multiplicand = left;
  let multiplier = right;

  for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
    if ((multiplier & 1) !== 0) {
      product ^= multiplicand;
    }
    const highBitWasSet = (multiplicand & 0x80) !== 0;
    multiplicand = (multiplicand << 1) & 0xff;
    if (highBitWasSet) {
      multiplicand ^= GALOIS_FIELD_REDUCTION_POLYNOMIAL;
    }
    multiplier >>= 1;
  }

  return product;
}

/**
 * Покомпонентное сложение двух блоков по модулю 2.
 * @param left Левый операнд.
 * @param right Правый операнд.
 */
function xOr(left: Uint8Array, right: Uint8Array): Uint8Array {
  return Uint8Array.from(left, (byte, index) => byte ^ right[index]);
}

/**
 * Дополняет открытый текст по PKCS#7 до кратности 16 байтам.
 * @param plaintext Открытый текст.
 */
function applyPkcs7Padding(plaintext: Uint8Array): Uint8Array {
  const paddingLength = BLOCK_SIZE_BYTES - (plaintext.length % BLOCK_SIZE_BYTES);
  const padded = new Uint8Array(plaintext.length + paddingLength);
  padded.set(plaintext);
  padded.fill(paddingLength, plaintext.length);
  return padded;
}

/**
 * Снимает дополнение PKCS#7.
 * @param paddedPlaintext Блок с дополнением.
 */
function removePkcs7Padding(paddedPlaintext: Uint8Array): Uint8Array {
  const paddingLength = paddedPlaintext[paddedPlaintext.length - 1];
  if (paddingLength < 1 || paddingLength > BLOCK_SIZE_BYTES) {
    throw new Error("Некорректное дополнение PKCS#7.");
  }
  for (let index = paddedPlaintext.length - paddingLength; index < paddedPlaintext.length; index += 1) {
    if (paddedPlaintext[index] !== paddingLength) {
      throw new Error("Некорректное дополнение PKCS#7.");
    }
  }
  return paddedPlaintext.subarray(0, paddedPlaintext.length - paddingLength);
}

/**
 * Проверяет, что блок занимает 16 байт.
 * @param block Проверяемый блок.
 */
function assertBlockSize(block: Uint8Array): void {
  if (block.length !== BLOCK_SIZE_BYTES) {
    throw new Error("Блок «Кузнечика» должен занимать 128 бит (16 байт).");
  }
}
