"use client";

import { Loader2 } from "lucide-react";

interface ToolCallIndicatorProps {
  toolInvocation: {
    toolName: string;
    toolCallId: string;
    input?: Record<string, unknown>;
    output?: unknown;
    state: string;
  };
}

export function getToolLabel(
  toolName: string,
  input: Record<string, unknown>
): string {
  const path = typeof input.path === "string" ? input.path : "";

  if (toolName === "str_replace_editor") {
    switch (input.command) {
      case "create":
        return `Creating ${path}`;
      case "str_replace":
      case "insert":
        return `Editing ${path}`;
      case "view":
        return `Reading ${path}`;
      default:
        return toolName;
    }
  }

  if (toolName === "file_manager") {
    switch (input.command) {
      case "rename": {
        const newPath = typeof input.new_path === "string" ? input.new_path : "";
        return `Renaming ${path} → ${newPath}`;
      }
      case "delete":
        return `Deleting ${path}`;
      default:
        return toolName;
    }
  }

  return toolName;
}

export function ToolCallIndicator({ toolInvocation }: ToolCallIndicatorProps) {
  const label = getToolLabel(
    toolInvocation.toolName,
    (toolInvocation.input || {}) as Record<string, unknown>
  );
  const isDone = toolInvocation.state === "output-available" && toolInvocation.output;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
