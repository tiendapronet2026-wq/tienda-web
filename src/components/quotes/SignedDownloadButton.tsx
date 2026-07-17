"use client";

import { useState, useTransition } from "react";
import { getSignedQuoteAttachmentUrl } from "@/app/admin/actions/quotes";
import { Button } from "@/components/ui/Button";

export function SignedDownloadButton({
  attachmentId,
  filename,
}: {
  attachmentId: string;
  filename: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await getSignedQuoteAttachmentUrl(attachmentId);
            if ("error" in result && result.error) {
              setError(result.error);
              return;
            }
            if ("url" in result && result.url) {
              window.open(result.url, "_blank", "noopener,noreferrer");
            }
          });
        }}
      >
        {pending ? "Generando..." : `Descargar ${filename}`}
      </Button>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
