import { createHmac, timingSafeEqual } from "node:crypto";

const TOTP_TIME_STEP_SECONDS = 30;
const TOTP_DIGIT_COUNT = 6;
const TOTP_ALLOWED_STEP_DRIFT = 1;

/**
 * TOTP (RFC 6238) на HMAC-SHA1 — третий фактор 3FA.
 */
export class TotpOneTimePasswordService {
  public generateCode(secret: Uint8Array, unixTimeSeconds: number = Math.floor(Date.now() / 1000)): string {
    const timeStep = Math.floor(unixTimeSeconds / TOTP_TIME_STEP_SECONDS);
    return this.generateCodeForTimeStep(secret, timeStep);
  }

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

  private generateCodeForTimeStep(secret: Uint8Array, timeStep: number): string {
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigUInt64BE(BigInt(timeStep));
    const digest = createHmac("sha1", Buffer.from(secret)).update(timeBuffer).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const truncated =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);
    const code = truncated % 10 ** TOTP_DIGIT_COUNT;
    return code.toString().padStart(TOTP_DIGIT_COUNT, "0");
  }

  private constantTimeStringEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }
    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
