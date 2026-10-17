import { describe, expect, it } from "vitest";

import { parseLoginForm, parseSignupForm } from "./validation";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const validSignup = {
  firstName: "  Ana ",
  lastName: " Souza ",
  email: "  Ana.Souza@Example.COM ",
  password: "segura-123",
  confirmPassword: "segura-123",
};

describe("parseSignupForm", () => {
  it("normalizes names and email", () => {
    expect(parseSignupForm(form(validSignup))).toEqual({
      success: true,
      data: {
        firstName: "Ana",
        lastName: "Souza",
        email: "ana.souza@example.com",
        password: "segura-123",
      },
    });
  });

  it("reports every invalid field at once", () => {
    const result = parseSignupForm(
      form({
        firstName: "",
        lastName: "",
        email: "not-an-email",
        password: "short",
        confirmPassword: "different",
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      "confirmPassword",
      "email",
      "firstName",
      "lastName",
      "password",
    ]);
  });

  it("requires at least one letter and one number in the password", () => {
    const result = parseSignupForm(
      form({
        ...validSignup,
        password: "somenteletras",
        confirmPassword: "somenteletras",
      }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.password).toBeDefined();
  });

  it("keeps non-secret values to refill the form", () => {
    const result = parseSignupForm(form({ ...validSignup, password: "x" }));

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.values).toEqual({
      firstName: "Ana",
      lastName: "Souza",
      email: "ana.souza@example.com",
    });
  });
});

describe("parseLoginForm", () => {
  it("normalizes the email", () => {
    expect(
      parseLoginForm(form({ email: " Ana@Example.com ", password: "abc" })),
    ).toEqual({
      success: true,
      data: { email: "ana@example.com", password: "abc" },
    });
  });

  it("requires both fields", () => {
    expect(parseLoginForm(form({ email: "", password: "" })).success).toBe(
      false,
    );
  });
});
