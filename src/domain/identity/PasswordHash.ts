/**
 * Хэш пароля: Стрибог-512 от соли и UTF-8 пароля.
 */
export type PasswordHash = {
  algorithm: "streebog512";
  saltHex: string;
  hashHex: string;
};
