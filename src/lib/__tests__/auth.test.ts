// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      set: mockSet,
      get: mockGet,
      delete: mockDelete,
    })
  ),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("establece la cookie auth-token", async () => {
    const { createSession } = await import("@/lib/auth");

    await createSession("user-1", "test@example.com");

    expect(mockSet).toHaveBeenCalledOnce();
    expect(mockSet.mock.calls[0][0]).toBe("auth-token");
  });

  test("el token JWT contiene userId y email correctos", async () => {
    const { createSession } = await import("@/lib/auth");

    await createSession("user-42", "hello@example.com");

    const token = mockSet.mock.calls[0][1];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@example.com");
  });

  test("la cookie se configura con opciones seguras", async () => {
    const { createSession } = await import("@/lib/auth");

    await createSession("user-1", "test@example.com");

    const options = mockSet.mock.calls[0][2];

    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.expires).toBeInstanceOf(Date);
  });

  test("la cookie expira aproximadamente en 7 días", async () => {
    const { createSession } = await import("@/lib/auth");
    const before = Date.now();

    await createSession("user-1", "test@example.com");

    const after = Date.now();
    const options = mockSet.mock.calls[0][2];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });
});

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function makeToken(payload: object, secret = JWT_SECRET) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(secret);
  }

  test("retorna null cuando no hay cookie", async () => {
    mockGet.mockReturnValue(undefined);
    const { getSession } = await import("@/lib/auth");

    const result = await getSession();

    expect(result).toBeNull();
  });

  test("retorna el payload cuando el token es válido", async () => {
    const token = await makeToken({ userId: "user-1", email: "test@example.com" });
    mockGet.mockReturnValue({ value: token });
    const { getSession } = await import("@/lib/auth");

    const result = await getSession();

    expect(result?.userId).toBe("user-1");
    expect(result?.email).toBe("test@example.com");
  });

  test("retorna null cuando el token está firmado con un secret incorrecto", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await makeToken({ userId: "user-1", email: "test@example.com" }, wrongSecret);
    mockGet.mockReturnValue({ value: token });
    const { getSession } = await import("@/lib/auth");

    const result = await getSession();

    expect(result).toBeNull();
  });

  test("retorna null cuando el token está malformado", async () => {
    mockGet.mockReturnValue({ value: "token.invalido.xyz" });
    const { getSession } = await import("@/lib/auth");

    const result = await getSession();

    expect(result).toBeNull();
  });
});

describe("deleteSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("llama a delete con el nombre de cookie correcto", async () => {
    const { deleteSession } = await import("@/lib/auth");

    await deleteSession();

    expect(mockDelete).toHaveBeenCalledOnce();
    expect(mockDelete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  async function makeToken(payload: object, secret = JWT_SECRET) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(secret);
  }

  function makeRequest(cookieValue?: string) {
    return {
      cookies: {
        get: vi.fn((name: string) =>
          name === "auth-token" && cookieValue !== undefined
            ? { value: cookieValue }
            : undefined
        ),
      },
    } as unknown as import("next/server").NextRequest;
  }

  test("retorna null cuando no hay cookie en el request", async () => {
    const { verifySession } = await import("@/lib/auth");

    const result = await verifySession(makeRequest());

    expect(result).toBeNull();
  });

  test("retorna el payload cuando el token es válido", async () => {
    const token = await makeToken({ userId: "user-1", email: "test@example.com" });
    const { verifySession } = await import("@/lib/auth");

    const result = await verifySession(makeRequest(token));

    expect(result?.userId).toBe("user-1");
    expect(result?.email).toBe("test@example.com");
  });

  test("retorna null cuando el token está firmado con un secret incorrecto", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await makeToken({ userId: "user-1", email: "test@example.com" }, wrongSecret);
    const { verifySession } = await import("@/lib/auth");

    const result = await verifySession(makeRequest(token));

    expect(result).toBeNull();
  });

  test("retorna null cuando el token está malformado", async () => {
    const { verifySession } = await import("@/lib/auth");

    const result = await verifySession(makeRequest("token.invalido.xyz"));

    expect(result).toBeNull();
  });
});
