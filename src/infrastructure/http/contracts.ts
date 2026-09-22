import { EncryptionMethod } from "@/domain/cryptography/EncryptionMethod";
import { UserRole } from "@/domain/identity/UserRole";
import { ContractReader } from "@/infrastructure/http/ContractValidation";

/**
 * Тело входа: логин и пароль.
 */
export class LoginPasswordRequest {
  public readonly login: string;
  public readonly password: string;

  public constructor(input: unknown) {
    const reader = new ContractReader(input);
    this.login = reader.requiredString("login", "Укажите логин.");
    this.password = reader.requiredString("password", "Укажите пароль.");
    reader.throwIfInvalid();
  }
}

/**
 * Тело проверки email-OTP: код из письма.
 */
export class VerifyEmailOtpRequest {
  public readonly otpCode: string;

  public constructor(input: unknown) {
    const reader = new ContractReader(input);
    this.otpCode = reader.requiredString("otpCode", "Укажите код из письма.");
    reader.throwIfInvalid();
  }
}

/**
 * Тело третьего фактора: TOTP или код восстановления.
 */
export class VerifyThirdFactorRequest {
  public readonly code: string;

  public constructor(input: unknown) {
    const reader = new ContractReader(input);
    this.code = reader.requiredString("code", "Укажите TOTP или код восстановления.");
    reader.throwIfInvalid();
  }
}

function readAccountCredentials(reader: ContractReader) {
  return {
    login: reader.requiredString("login", "Укажите логин."),
    email: reader.requiredString("email", "Укажите почту."),
    password: reader.requiredString("password", "Укажите пароль."),
    passwordConfirmation: reader.requiredString("passwordConfirmation", "Подтвердите пароль."),
  };
}

/**
 * Тело регистрации: логин, почта, пароль и подтверждение.
 */
export class RegisterUserRequest {
  public readonly login: string;
  public readonly email: string;
  public readonly password: string;
  public readonly passwordConfirmation: string;

  public constructor(input: unknown) {
    const reader = new ContractReader(input);
    const credentials = readAccountCredentials(reader);
    this.login = credentials.login;
    this.email = credentials.email;
    this.password = credentials.password;
    this.passwordConfirmation = credentials.passwordConfirmation;
    reader.throwIfInvalid();
  }
}

/**
 * Тело запроса сброса пароля: почта.
 */
export class RequestPasswordResetRequest {
  public readonly email: string;

  public constructor(input: unknown) {
    const reader = new ContractReader(input);
    this.email = reader.requiredString("email", "Укажите почту.");
    reader.throwIfInvalid();
  }
}

/**
 * Тело подтверждения сброса: почта, OTP, токен и новый пароль.
 */
export class ConfirmPasswordResetRequest {
  public readonly email: string;
  public readonly otpCode: string;
  public readonly resetToken: string;
  public readonly newPassword: string;

  public constructor(input: unknown) {
    const reader = new ContractReader(input);
    this.email = reader.requiredString("email", "Укажите почту.");
    this.otpCode = reader.requiredString("otpCode", "Укажите код из письма.");
    this.resetToken = reader.requiredString("resetToken", "Укажите токен сброса.");
    this.newPassword = reader.requiredString("newPassword", "Укажите новый пароль.");
    reader.throwIfInvalid();
  }
}

/**
 * Тело шифрования сообщения: открытый текст и метод.
 */
export class EncryptMessageRequest {
  public readonly plaintext: string;
  public readonly method: EncryptionMethod;

  public constructor(input: unknown) {
    const reader = new ContractReader(input);
    this.plaintext = reader.requiredString("plaintext", "Сообщение не должно быть пустым.");
    this.method = reader.requiredEnum(
      "method",
      [EncryptionMethod.RSA, EncryptionMethod.KUZNYECHIK],
      "Укажите метод шифрования.",
    );
    reader.throwIfInvalid();
  }
}

/**
 * Тело включения или выключения метода шифрования.
 */
export class SetEncryptionMethodRequest {
  public readonly method: EncryptionMethod;
  public readonly enabled: boolean;

  public constructor(input: unknown) {
    const reader = new ContractReader(input);
    this.method = reader.requiredEnum(
      "method",
      [EncryptionMethod.RSA, EncryptionMethod.KUZNYECHIK],
      "Укажите метод шифрования.",
    );
    this.enabled = reader.requiredBoolean("enabled", "Укажите, включён ли метод.");
    reader.throwIfInvalid();
  }
}

/**
 * Тело создания пользователя администратором; роль по умолчанию USER.
 */
export class CreateUserByAdminRequest {
  public readonly login: string;
  public readonly email: string;
  public readonly password: string;
  public readonly passwordConfirmation: string;
  public readonly role: UserRole;

  public constructor(input: unknown) {
    const reader = new ContractReader(input);
    const credentials = readAccountCredentials(reader);
    this.login = credentials.login;
    this.email = credentials.email;
    this.password = credentials.password;
    this.passwordConfirmation = credentials.passwordConfirmation;
    this.role = reader.optionalEnum("role", [UserRole.USER, UserRole.ADMIN], UserRole.USER, "Укажите корректную роль.");
    reader.throwIfInvalid();
  }
}

/**
 * Параметры маршрута с идентификатором сообщения.
 */
export class MessageIdRouteParams {
  public readonly messageId: string;

  public constructor(input: unknown) {
    const reader = new ContractReader(input, "Некорректные параметры запроса.");
    this.messageId = reader.requiredString("messageId", "Не указано сообщение.");
    reader.throwIfInvalid();
  }
}
