import { vi } from "vitest";

// Server Actions call verifySession() first. Unit tests exercise the logic
// behind that gate, so they run as a signed-in user; the gate itself is
// covered in src/lib/auth.
vi.mock("@/lib/auth/dal", () => {
  const user = {
    id: "test-user",
    firstName: "Teste",
    lastName: "Bytewave",
    email: "teste@example.com",
  };

  return {
    verifySession: vi.fn(async () => user),
    getCurrentUser: vi.fn(async () => user),
  };
});
