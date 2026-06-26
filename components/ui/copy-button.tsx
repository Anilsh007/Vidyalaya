"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyButton({
  text,
  label = "Copy text"
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Fall back for non-secure LAN contexts where the async clipboard API is blocked.
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  return (
    <Button
      variant="secondary"
      onClick={async () => {
        try {
          await copyText();
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch (error) {
          console.error("Failed to copy text", error);
        }
      }}
    >
      <Copy className="h-4 w-4" />
      {copied ? "Copied" : label}
    </Button>
  );
}
