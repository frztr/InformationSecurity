/**
 * Собирает блок EM PKCS#1 v1.5: 00 || маркер || дополнение || 00 || данные.
 * @param marker Байт типа: 0x01 для подписи, 0x02 для шифрования.
 * @param payload Хэш или открытый фрагмент.
 * @param modulusByteLength Длина модуля в байтах.
 * @param fillPadding Заполняет область дополнения, не включая разделитель 00.
 * @param tooLongMessage Текст ошибки, если данные не входят в блок.
 */
export function encodePkcs1Block(
  marker: number,
  payload: Uint8Array,
  modulusByteLength: number,
  fillPadding: (padding: Uint8Array) => void,
  tooLongMessage: string,
): Uint8Array {
  const paddingLength = modulusByteLength - payload.length - 3;
  if (paddingLength < 8) {
    throw new Error(tooLongMessage);
  }

  const encoded = new Uint8Array(modulusByteLength);
  encoded[0] = 0x00;
  encoded[1] = marker;
  fillPadding(encoded.subarray(2, 2 + paddingLength));
  encoded[2 + paddingLength] = 0x00;
  encoded.set(payload, 3 + paddingLength);
  return encoded;
}
