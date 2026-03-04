import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallIndicator, getToolLabel } from "../ToolCallIndicator";

vi.mock("lucide-react", () => ({
  Loader2: () => <div data-testid="loader" />,
}));

afterEach(() => {
  cleanup();
});

// --- getToolLabel tests ---

test("str_replace_editor create shows Creating", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" })
  ).toBe("Creating /App.jsx");
});

test("str_replace_editor str_replace shows Editing", () => {
  expect(
    getToolLabel("str_replace_editor", {
      command: "str_replace",
      path: "/App.jsx",
    })
  ).toBe("Editing /App.jsx");
});

test("str_replace_editor insert shows Editing", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "insert", path: "/App.jsx" })
  ).toBe("Editing /App.jsx");
});

test("str_replace_editor view shows Reading", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "view", path: "/utils.ts" })
  ).toBe("Reading /utils.ts");
});

test("file_manager rename shows Renaming with both paths", () => {
  expect(
    getToolLabel("file_manager", {
      command: "rename",
      path: "/old.jsx",
      new_path: "/new.jsx",
    })
  ).toBe("Renaming /old.jsx → /new.jsx");
});

test("file_manager delete shows Deleting", () => {
  expect(
    getToolLabel("file_manager", { command: "delete", path: "/App.jsx" })
  ).toBe("Deleting /App.jsx");
});

test("unknown tool falls back to tool name", () => {
  expect(getToolLabel("some_other_tool", { command: "do_something" })).toBe(
    "some_other_tool"
  );
});

test("str_replace_editor unknown command falls back to tool name", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "something_new" })
  ).toBe("str_replace_editor");
});

// --- Component rendering tests ---

function makeInvocation(overrides: Record<string, unknown> = {}) {
  return {
    toolCallId: "call-1",
    toolName: "str_replace_editor",
    input: { command: "create", path: "/App.jsx" },
    state: "input-available" as string,
    ...overrides,
  };
}

test("shows spinner when state is input-available", () => {
  render(
    <ToolCallIndicator toolInvocation={makeInvocation({ state: "input-available" })} />
  );
  expect(screen.getByTestId("loader")).toBeDefined();
});

test("shows green dot when state is output-available with output", () => {
  render(
    <ToolCallIndicator
      toolInvocation={makeInvocation({ state: "output-available", output: "OK" })}
    />
  );
  expect(screen.queryByTestId("loader")).toBeNull();
  expect(document.querySelector(".bg-emerald-500")).not.toBeNull();
});

test("shows spinner when state is output-available but output is falsy", () => {
  render(
    <ToolCallIndicator
      toolInvocation={makeInvocation({ state: "output-available", output: null })}
    />
  );
  expect(screen.getByTestId("loader")).toBeDefined();
});

test("renders friendly label for str_replace_editor create", () => {
  render(
    <ToolCallIndicator
      toolInvocation={makeInvocation({
        input: { command: "create", path: "/Button.tsx" },
      })}
    />
  );
  expect(screen.getByText("Creating /Button.tsx")).toBeDefined();
});

test("renders friendly label for file_manager rename", () => {
  render(
    <ToolCallIndicator
      toolInvocation={makeInvocation({
        toolName: "file_manager",
        input: { command: "rename", path: "/old.jsx", new_path: "/new.jsx" },
      })}
    />
  );
  expect(screen.getByText("Renaming /old.jsx → /new.jsx")).toBeDefined();
});

test("renders tool name as fallback for unknown tool", () => {
  render(
    <ToolCallIndicator
      toolInvocation={makeInvocation({ toolName: "mystery_tool", input: {} })}
    />
  );
  expect(screen.getByText("mystery_tool")).toBeDefined();
});
