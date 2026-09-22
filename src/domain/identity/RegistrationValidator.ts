/**
 * Поля формы регистрации и создания пользователя.
 */
export type RegistrationFormValues = {
  login: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

/**
 * Ошибка проверки полей регистрации.
 */
export type RegistrationValidationError = {
  field: keyof RegistrationFormValues | "form";
  message: string;
};

const LOGIN_PATTERN = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

/**
 * Проверяет логин, почту, пароль и подтверждение пароля.
 */
export class RegistrationValidator {
  /**
   * Возвращает список нарушений правил полей.
   * @param values Значения формы.
   * @returns Пустой массив, если поля корректны.
   */
  public validate(values: RegistrationFormValues): RegistrationValidationError[] {
    const errors: RegistrationValidationError[] = [];

    if (!LOGIN_PATTERN.test(values.login)) {
      errors.push({
        field: "login",
        message: "Логин: латинская буква, затем 3–31 символ [A-Za-z0-9_].",
      });
    }

    if (!EMAIL_PATTERN.test(values.email)) {
      errors.push({
        field: "email",
        message: "Укажите корректный адрес электронной почты.",
      });
    }

    if (!PASSWORD_PATTERN.test(values.password)) {
      errors.push({
        field: "password",
        message: "Пароль: 8–128 символов, буква, цифра и спецсимвол.",
      });
    }

    if (values.password !== values.passwordConfirmation) {
      errors.push({
        field: "passwordConfirmation",
        message: "Подтверждение пароля не совпадает.",
      });
    }

    return errors;
  }
}
