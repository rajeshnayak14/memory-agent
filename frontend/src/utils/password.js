const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,100}$/;

export const PASSWORD_REQUIREMENT =
  "At least 8 characters, with an uppercase letter, a lowercase letter, a digit, and a special character.";

export function isPasswordValid(password) {
  return PASSWORD_PATTERN.test(password);
}
