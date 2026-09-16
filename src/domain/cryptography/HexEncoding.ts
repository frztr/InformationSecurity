export function parseHexString(hex: string): Uint8Array {
  const compactHex = hex.replace(/\s+/g, "");
  if (compactHex.length % 2 !== 0) {
    throw new Error("Шестнадцатеричная строка должна содержать чётное число символов.");
  }

  const bytes = new Uint8Array(compactHex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(compactHex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function toHexString(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
