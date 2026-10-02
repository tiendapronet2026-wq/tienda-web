export default function MercadoPagoConnectErrorPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6 text-center">
      <h1 className="text-xl font-semibold">No se pudo vincular</h1>
      <p className="mt-2 text-sm text-muted">
        No se pudo completar la vinculación con Mercado Pago. Generá un nuevo QR desde Integraciones en
        la PC.
      </p>
    </div>
  );
}
