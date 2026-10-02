"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  cancelIntegrationLink,
  pollIntegrationLinkStatus,
  revokeIntegrationConnection,
  startIntegrationLink,
  verifyIntegrationConnection,
} from "@/app/admin/actions/integrations";
import type { SafeConnectionRow } from "@/lib/integrations/connections-read";
import { listIntegrationCatalog } from "@/lib/integrations/providers/registry";

const section =
  "rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]";

type LinkModal = {
  providerId: string;
  providerTitle: string;
  sessionId: string;
  connectUrl: string;
  expiresAt: string;
};

function statusLabel(status: string): string {
  switch (status) {
    case "connected":
      return "Conectado";
    case "pending":
      return "Pendiente";
    case "error":
      return "Error";
    case "revoked":
      return "Revocado";
    case "expired":
      return "Expirado";
    default:
      return status;
  }
}

export function IntegrationsPanel({ connections }: { connections: SafeConnectionRow[] }) {
  const catalog = listIntegrationCatalog();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [linkModal, setLinkModal] = useState<LinkModal | null>(null);
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const connectionFor = (providerId: string) =>
    connections.find((c) => c.provider === providerId && c.status === "connected" && c.is_active);

  const stopPolling = useCallback(() => setPollStatus(null), []);

  useEffect(() => {
    if (!linkModal?.connectUrl) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    import("qrcode")
      .then((QR) => QR.toDataURL(linkModal.connectUrl, { margin: 1, width: 256 }))
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [linkModal?.connectUrl]);

  useEffect(() => {
    if (!linkModal) return;
    let cancelled = false;
    const tick = async () => {
      const r = await pollIntegrationLinkStatus(linkModal.sessionId);
      if (cancelled) return;
      if (r.error) {
        setPollStatus(r.error);
        return;
      }
      const st = String((r.data as { status?: string })?.status ?? "");
      setPollStatus(st);
      if (st === "completed") {
        setMsg("Vinculación completada.");
        setLinkModal(null);
        window.location.reload();
      } else if (st === "expired" || st === "cancelled") {
        setLinkModal(null);
      }
    };
    const id = window.setInterval(tick, 2500);
    tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [linkModal]);

  const onConnect = (providerId: string, title: string) => {
    setMsg(null);
    startTransition(async () => {
      const r = await startIntegrationLink(providerId);
      if (r.error) {
        setMsg(r.error);
        return;
      }
      const d = r.data as { sessionId: string; connectUrl: string; expiresAt: string };
      setLinkModal({
        providerId,
        providerTitle: title,
        sessionId: d.sessionId,
        connectUrl: d.connectUrl,
        expiresAt: d.expiresAt,
      });
      setPollStatus("pending");
    });
  };

  const onCancelLink = () => {
    if (!linkModal) return;
    startTransition(async () => {
      await cancelIntegrationLink(linkModal.sessionId);
      setLinkModal(null);
      stopPolling();
    });
  };

  return (
    <div className="space-y-6">
      {msg && <p className="rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand">{msg}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {catalog.map((card) => {
          const conn = connectionFor(card.id);
          return (
            <article key={card.id} className={section}>
              <h2 className="text-lg font-semibold">{card.title}</h2>
              <p className="mt-1 text-sm text-muted">{card.subtitle}</p>
              <p className="mt-3 text-sm">
                Estado:{" "}
                <span className="font-medium">
                  {conn ? statusLabel(conn.status) : "No conectado"}
                </span>
              </p>
              {conn?.external_account_label && (
                <p className="mt-1 text-xs text-muted">Cuenta: {conn.external_account_label}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {card.isImplemented ? (
                  <button
                    type="button"
                    disabled={pending || Boolean(conn)}
                    className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    onClick={() => onConnect(card.id, card.title)}
                  >
                    {conn ? "Conectado" : "Conectar"}
                  </button>
                ) : (
                  <span className="rounded-xl border border-border px-4 py-2 text-sm text-muted">
                    Próximamente
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {connections.length > 0 && (
        <section className={section}>
          <h2 className="text-lg font-semibold">Conexiones</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {connections.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{c.display_name}</p>
                  <p className="text-muted">
                    {c.provider} · {statusLabel(c.status)}
                    {c.external_account_label ? ` · ${c.external_account_label}` : ""}
                  </p>
                  {c.connected_at && (
                    <p className="text-xs text-muted">
                      Conectado: {new Date(c.connected_at).toLocaleString("es-AR")}
                    </p>
                  )}
                </div>
                {c.status === "connected" && c.is_active && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await verifyIntegrationConnection(c.id);
                          setMsg(r.error ?? "Verificación OK.");
                        })
                      }
                    >
                      Verificar conexión
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-error/40 px-3 py-1.5 text-xs text-error"
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm("¿Desvincular esta integración?")) return;
                        startTransition(async () => {
                          const r = await revokeIntegrationConnection(c.id, "admin_ui");
                          setMsg(r.error ?? "Desvinculado.");
                          window.location.reload();
                        });
                      }}
                    >
                      Desvincular
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Vincular {linkModal.providerTitle}</h3>
            <p className="mt-2 text-sm text-muted">
              Escaneá el QR con tu teléfono o abrí el enlace. Expira a las{" "}
              {new Date(linkModal.expiresAt).toLocaleTimeString("es-AR")}.
            </p>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL QR generado en cliente
              <img
                src={qrDataUrl}
                alt="QR de vinculación"
                className="mx-auto mt-4 h-48 w-48 rounded-lg border border-border bg-white p-2"
              />
            ) : (
              <p className="mt-4 break-all text-xs text-muted">{linkModal.connectUrl}</p>
            )}
            <p className="mt-2 break-all text-center text-xs text-muted">{linkModal.connectUrl}</p>
            <p className="mt-3 text-center text-xs text-muted">Estado: {pollStatus ?? "pending"}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-border px-4 py-2 text-sm"
                onClick={onCancelLink}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
