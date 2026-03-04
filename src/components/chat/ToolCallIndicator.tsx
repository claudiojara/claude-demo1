"use client";

import type { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

interface ToolCallIndicatorProps {
  toolInvocation: ToolInvocation;
}

export function getToolLabel(
  toolName: string,
  args: Record<string, unknown>
): string {
  const path = typeof args.path === "string" ? args.path : "";

  if (toolName === "str_replace_editor") {
    switch (args.command) {
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
    switch (args.command) {
      case "rename": {
        const newPath = typeof args.new_path === "string" ? args.new_path : "";
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
    toolInvocation.args as Record<string, unknown>
  );
  const isDone = toolInvocation.state === "result" && toolInvocation.result;

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
