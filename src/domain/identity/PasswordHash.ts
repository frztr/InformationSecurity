export type PasswordHash = {
  algorithm: "streebog512";
  saltHex: string;
  hashHex: string;
};
