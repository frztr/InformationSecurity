/**
 * Ошибка разбора контракта HTTP-запроса.
 */
export class ContractValidationError extends Error {
  public readonly messages: string[];

  /**
   * @param messages Одно или несколько сообщений; в Error.message склеиваются пробелом.
   */
  public constructor(messages: string | string[]) {
    const list = Array.isArray(messages) ? messages : [messages];
    super(list.join(" "));
    this.name = "ContractValidationError";
    this.messages = list;
  }
}

/**
 * Читает поля объекта-тела запроса с накоплением ошибок.
 */
export class ContractReader {
  private readonly data: Record<string, unknown>;
  private readonly errors: string[] = [];

  /**
   * Принимает объект; иначе бросает ContractValidationError.
   * @param input Сырое тело.
   * @param invalidShapeMessage Сообщение при не-объекте.
   */
  public constructor(input: unknown, invalidShapeMessage = "Некорректное тело запроса.") {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new ContractValidationError(invalidShapeMessage);
    }
    this.data = input as Record<string, unknown>;
  }

  /**
   * Требует непустую строку и обрезает пробелы. При ошибке копит сообщение и возвращает "".
   * @param field Имя поля.
   * @param message Текст ошибки.
   * @returns Строка или пустая при ошибке.
   */
  public requiredString(field: string, message: string): string {
    const value = this.data[field];
    if (typeof value !== "string" || value.trim().length === 0) {
      this.errors.push(message);
      return "";
    }
    return value.trim();
  }

  /**
   * Требует boolean. При ошибке копит сообщение и возвращает false.
   * @param field Имя поля.
   * @param message Текст ошибки.
   * @returns Значение или false при ошибке.
   */
  public requiredBoolean(field: string, message: string): boolean {
    const value = this.data[field];
    if (typeof value !== "boolean") {
      this.errors.push(message);
      return false;
    }
    return value;
  }

  /**
   * Требует строку из списка. При ошибке копит сообщение и возвращает первый элемент allowed.
   * @param field Имя поля.
   * @param allowed Допустимые значения.
   * @param message Текст ошибки.
   * @returns Значение или allowed[0] при ошибке.
   */
  public requiredEnum<T extends string>(field: string, allowed: readonly T[], message: string): T {
    const value = this.data[field];
    if (typeof value !== "string" || !allowed.includes(value as T)) {
      this.errors.push(message);
      return allowed[0];
    }
    return value as T;
  }

  /**
   * Читает необязательное перечисление; пустое и отсутствующее дают fallback.
   * @param field Имя поля.
   * @param allowed Допустимые значения.
   * @param fallback Значение по умолчанию.
   * @param message Текст ошибки при неверном значении.
   * @returns Значение, fallback при отсутствии или при ошибке.
   */
  public optionalEnum<T extends string>(field: string, allowed: readonly T[], fallback: T, message: string): T {
    const value = this.data[field];
    if (value === undefined || value === null || value === "") {
      return fallback;
    }
    if (typeof value !== "string" || !allowed.includes(value as T)) {
      this.errors.push(message);
      return fallback;
    }
    return value as T;
  }

  /**
   * Бросает ContractValidationError, если накопились ошибки.
   * @returns Ничего.
   */
  public throwIfInvalid(): void {
    if (this.errors.length > 0) {
      throw new ContractValidationError(this.errors);
    }
  }
}
