import { HmacStreebog512 } from "@/domain/cryptography/gost/HmacStreebog512";

const TOTP_TIME_STEP_SECONDS = 30;
const TOTP_DIGIT_COUNT = 6;
const TOTP_ALLOWED_STEP_DRIFT = 1;

/**
 * TOTP (схема RFC 6238) на HMAC-Стрибог-512 — третий фактор 3FA.
 */
export class TotpOneTimePasswordService {
  public constructor(private readonly hmac: HmacStreebog512 = new HmacStreebog512()) {}

  /**
   * Проверяет код с допуском ±1 шаг (30 с).
   * @param secret Секрет в сырых байтах.
   * @param presentedCode Предъявленный шестизначный код.
   * @param unixTimeSeconds Unix-время в секундах.
   * @returns `true`, если код совпадает с одним из допустимых шагов.
   */
  public verifyCode(secret: Uint8Array, presentedCode: string, unixTimeSeconds: number = Math.floor(Date.now() / 1000)): boolean {
    const normalizedCode = presentedCode.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      return false;
    }

    const currentTimeStep = Math.floor(unixTimeSeconds / TOTP_TIME_STEP_SECONDS);
    for (let drift = -TOTP_ALLOWED_STEP_DRIFT; drift <= TOTP_ALLOWED_STEP_DRIFT; drift += 1) {
      const expectedCode = this.generateCodeForTimeStep(secret, currentTimeStep + drift);
      if (this.constantTimeStringEquals(expectedCode, normalizedCode)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Строит шестизначный код для заданного шага времени (динамическое усечение HMAC).
   * @param secret Секрет в сырых байтах.
   * @param timeStep Номер 30-секундного интервала.
   */
  private generateCodeForTimeStep(secret: Uint8Array, timeStep: number): string {
    const digest = this.hmac.digest(secret, timeStepToBytes(timeStep));
    const offset = digest[digest.length - 1] & 0x0f;
    const truncated =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);
    const code = truncated % 10 ** TOTP_DIGIT_COUNT;
    return code.toString().padStart(TOTP_DIGIT_COUNT, "0");
  }

  /**
   * Сравнивает строки за время, не зависящее от совпадения префикса.
   * @param left Первая строка.
   * @param right Вторая строка.
   * @returns `true`, если строки равны.
   */
  private constantTimeStringEquals(left: string, right: string): boolean {
    if (left.length !== right.length) {
      return false;
    }
    let difference = 0;
    for (let index = 0; index < left.length; index += 1) {
      difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }
    return difference === 0;
  }
}

function timeStepToBytes(timeStep: number): Uint8Array {
  let remaining = BigInt(timeStep);
  const bytes = new Uint8Array(8);
  for (let index = 7; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return bytes;
}
