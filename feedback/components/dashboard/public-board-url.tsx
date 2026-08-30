"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PublicBoardUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser — the URL is
      // still selectable text in the input either way.
    }
  }

  return (
    <div className="flex gap-2">
      <label className="sr-only" htmlFor="public-board-url">
        Public feedback board URL
      </label>
      <Input
        id="public-board-url"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="font-mono text-sm"
      />
      <Button type="button" variant="outline" onClick={copy} className="shrink-0">
        {copied ? (
          <>
            <Check className="size-3.5" aria-hidden="true" />
            Copied
          </>
        ) : (
          <>
            <Copy className="size-3.5" aria-hidden="true" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}
