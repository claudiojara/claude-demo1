import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// Mocks
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

const mockRouterPush = vi.fn();

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuth — estado inicial", () => {
  test("isLoading comienza en false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("expone las funciones signIn y signUp", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });
});

describe("signIn — happy paths", () => {
  test("llama a signInAction con email y password", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([{ id: "p1" }] as any);

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("user@example.com", "password123"));

    expect(signInAction).toHaveBeenCalledWith("user@example.com", "password123");
  });

  test("devuelve el resultado de signInAction", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([{ id: "p1" }] as any);

    const { result } = renderHook(() => useAuth());
    let returned: any;
    await act(async () => {
      returned = await result.current.signIn("user@example.com", "password123");
    });

    expect(returned).toEqual({ success: true });
  });

  test("isLoading es true durante la llamada y false al terminar", async () => {
    let resolveSignIn!: (v: any) => void;
    vi.mocked(signInAction).mockReturnValue(
      new Promise((res) => { resolveSignIn = res; })
    );

    const { result } = renderHook(() => useAuth());

    act(() => { result.current.signIn("user@example.com", "password123"); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolveSignIn({ success: false }); });
    expect(result.current.isLoading).toBe(false);
  });
});

describe("signIn — cuando las credenciales fallan", () => {
  test("no llama a handlePostSignIn si success es false", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("bad@example.com", "wrong"));

    expect(getProjects).not.toHaveBeenCalled();
    expect(createProject).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  test("isLoading vuelve a false aunque la acción falle", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: false, error: "err" });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@e.com", "p"));

    expect(result.current.isLoading).toBe(false);
  });

  test("isLoading vuelve a false si signInAction lanza una excepción", async () => {
    vi.mocked(signInAction).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      try { await result.current.signIn("u@e.com", "p"); } catch {}
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("signUp — happy paths", () => {
  test("llama a signUpAction con email y password", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([{ id: "p1" }] as any);

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signUp("new@example.com", "securepass"));

    expect(signUpAction).toHaveBeenCalledWith("new@example.com", "securepass");
  });

  test("devuelve el resultado de signUpAction", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([{ id: "p2" }] as any);

    const { result } = renderHook(() => useAuth());
    let returned: any;
    await act(async () => {
      returned = await result.current.signUp("new@example.com", "securepass");
    });

    expect(returned).toEqual({ success: true });
  });

  test("isLoading es true durante la llamada y false al terminar", async () => {
    let resolveSignUp!: (v: any) => void;
    vi.mocked(signUpAction).mockReturnValue(
      new Promise((res) => { resolveSignUp = res; })
    );

    const { result } = renderHook(() => useAuth());

    act(() => { result.current.signUp("new@example.com", "securepass"); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolveSignUp({ success: false }); });
    expect(result.current.isLoading).toBe(false);
  });

  test("no llama a handlePostSignIn si success es false", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signUp("existing@example.com", "pass1234"));

    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(createProject).not.toHaveBeenCalled();
  });
});

describe("handlePostSignIn — trabajo anónimo con mensajes", () => {
  test("crea proyecto con datos anónimos y navega a él", async () => {
    const anonWork = {
      messages: [{ role: "user", content: "hello" }],
      fileSystemData: { "/": { type: "directory" }, "/app.tsx": { type: "file" } },
    };
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(anonWork);
    vi.mocked(createProject).mockResolvedValue({ id: "anon-project-1" } as any);

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@e.com", "pass"));

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringMatching(/^Design from /),
      messages: anonWork.messages,
      data: anonWork.fileSystemData,
    });
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith("/anon-project-1");
  });

  test("no consulta proyectos existentes si hay trabajo anónimo con mensajes", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({
      messages: [{ role: "user", content: "hello" }],
      fileSystemData: {},
    });
    vi.mocked(createProject).mockResolvedValue({ id: "anon-p" } as any);

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@e.com", "pass"));

    expect(getProjects).not.toHaveBeenCalled();
  });
});

describe("handlePostSignIn — sin trabajo anónimo, con proyectos existentes", () => {
  test("navega al primer proyecto existente del usuario", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([
      { id: "existing-1" },
      { id: "existing-2" },
    ] as any);

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@e.com", "pass"));

    expect(mockRouterPush).toHaveBeenCalledWith("/existing-1");
    expect(createProject).not.toHaveBeenCalled();
  });
});

describe("handlePostSignIn — sin trabajo anónimo ni proyectos", () => {
  test("crea un nuevo proyecto y navega a él", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue({ id: "new-project-42" } as any);

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@e.com", "pass"));

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringMatching(/^New Design #\d+/),
      messages: [],
      data: {},
    });
    expect(mockRouterPush).toHaveBeenCalledWith("/new-project-42");
  });
});

describe("handlePostSignIn — trabajo anónimo sin mensajes", () => {
  test("ignora datos anónimos vacíos y consulta proyectos existentes", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(getAnonWorkData).mockReturnValue({ messages: [], fileSystemData: {} });
    vi.mocked(getProjects).mockResolvedValue([{ id: "proj-99" }] as any);

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.signIn("u@e.com", "pass"));

    expect(createProject).not.toHaveBeenCalled();
    expect(clearAnonWork).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith("/proj-99");
  });
});
