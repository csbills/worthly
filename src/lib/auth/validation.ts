export type SignupField =
  | "firstName"
  | "lastName"
  | "email"
  | "password"
  | "confirmPassword";

export type SignupData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

type ParseResult<Data, Field extends string> =
  | { success: true; data: Data }
  | {
      success: false;
      errors: FieldErrors<Field>;
      /** Non-secret values to refill the form after a failed submit. */
      values: Record<string, string>;
    };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
export const MIN_PASSWORD_LENGTH = 8;

function read(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function cleanName(value: string) {
  return value.trim().replace(/\s+/gu, " ");
}

export function parseSignupForm(
  formData: FormData,
): ParseResult<SignupData, SignupField> {
  const firstName = cleanName(read(formData, "firstName"));
  const lastName = cleanName(read(formData, "lastName"));
  const email = normalizeEmail(read(formData, "email"));
  const password = read(formData, "password");
  const confirmPassword = read(formData, "confirmPassword");
  const errors: FieldErrors<SignupField> = {};

  if (firstName.length < 2) errors.firstName = "Informe seu nome.";
  if (lastName.length < 2) errors.lastName = "Informe seu sobrenome.";
  if (!emailPattern.test(email)) errors.email = "Informe um e-mail válido.";

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  } else if (!/\p{L}/u.test(password) || !/\d/u.test(password)) {
    errors.password = "Combine letras e números.";
  }

  if (confirmPassword !== password) {
    errors.confirmPassword = "As senhas não conferem.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
      values: { firstName, lastName, email },
    };
  }

  return { success: true, data: { firstName, lastName, email, password } };
}

export function parseLoginForm(
  formData: FormData,
): ParseResult<{ email: string; password: string }, "email" | "password"> {
  const email = normalizeEmail(read(formData, "email"));
  const password = read(formData, "password");
  const errors: FieldErrors<"email" | "password"> = {};

  if (!email) errors.email = "Informe seu e-mail.";
  if (!password) errors.password = "Informe sua senha.";

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, values: { email } };
  }

  return { success: true, data: { email, password } };
}
