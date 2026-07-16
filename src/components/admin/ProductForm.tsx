"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import type { Product } from "@/types/database";
import { adjustStock, toggleProduct } from "@/app/admin/actions/products";

type CategoryOption = { id: string; name: string };

export function ProductForm({
  action,
  categories,
  product,
}: {
  action: (formData: FormData) => Promise<{ error?: string; success?: string } | void>;
  categories: CategoryOption[];
  product?: Product;
}) {
  const [message, setMessage] = useState<{ error?: string; success?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-6 rounded-2xl border border-border bg-surface p-6"
      action={(formData) => {
        startTransition(async () => {
          const result = await action(formData);
          if (result && "error" in result) setMessage({ error: result.error });
          if (result && "success" in result) setMessage({ success: result.success });
        });
      }}
      encType="multipart/form-data"
    >
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" name="name" defaultValue={product?.name} required />
        <Field label="SKU" name="sku" defaultValue={product?.sku ?? ""} />
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium">Categoría</label>
          <select
            name="category_id"
            defaultValue={product?.category_id ?? ""}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm"
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Field label="Precio" name="price" type="number" step="0.01" defaultValue={product?.price} required />
        <Field
          label="Precio anterior"
          name="compare_at_price"
          type="number"
          step="0.01"
          defaultValue={product?.compare_at_price ?? ""}
        />
        <Field
          label="Costo"
          name="cost_price"
          type="number"
          step="0.01"
          defaultValue={product?.cost_price ?? ""}
        />
        <Field label="Stock" name="stock" type="number" defaultValue={product?.stock ?? 0} />
        <Field
          label="Umbral stock bajo"
          name="low_stock_threshold"
          type="number"
          defaultValue={product?.low_stock_threshold ?? 5}
        />
      </div>

      <Field
        label="Descripción corta"
        name="short_description"
        defaultValue={product?.short_description ?? ""}
      />
      <div>
        <label className="mb-1 block text-sm font-medium">Descripción</label>
        <textarea
          name="description"
          defaultValue={product?.description ?? ""}
          rows={4}
          className="w-full rounded-xl border border-border px-4 py-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Imagen</label>
        {product?.image_url && (
          <div className="relative mb-3 h-32 w-32 overflow-hidden rounded-xl">
            <Image src={product.image_url} alt="" fill className="object-cover" sizes="128px" />
          </div>
        )}
        <input name="image" type="file" accept="image/*" className="text-sm" />
      </div>

      <div className="flex flex-wrap gap-4">
        <Checkbox label="Activo" name="is_active" defaultChecked={product?.is_active ?? true} />
        <Checkbox label="Destacado" name="is_featured" defaultChecked={product?.is_featured ?? false} />
        <Checkbox label="Controlar stock" name="track_stock" defaultChecked={product?.track_stock ?? true} />
      </div>

      {message?.error && <p className="text-sm text-error">{message.error}</p>}
      {message?.success && <p className="text-sm text-brand">{message.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Guardando..." : product ? "Actualizar producto" : "Crear producto"}
      </button>
    </form>
  );
}

export function StockAdjustForm({ productId }: { productId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-6 rounded-2xl border border-border bg-surface p-6"
      action={(formData) => {
        startTransition(async () => {
          const result = await adjustStock(formData);
          setMessage(result.error ?? result.success ?? null);
        });
      }}
    >
      <h3 className="font-semibold">Ajuste manual de stock</h3>
      <input type="hidden" name="product_id" value={productId} />
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <select name="movement_type" className="rounded-xl border border-border px-4 py-3 text-sm">
          <option value="manual_in">Entrada</option>
          <option value="manual_out">Salida</option>
          <option value="adjustment">Ajuste</option>
        </select>
        <input
          name="quantity"
          type="number"
          min={1}
          required
          placeholder="Cantidad"
          className="rounded-xl border border-border px-4 py-3 text-sm"
        />
        <input
          name="reason"
          placeholder="Motivo"
          className="rounded-xl border border-border px-4 py-3 text-sm"
        />
      </div>
      {message && <p className="mt-3 text-sm text-text-secondary">{message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-xl bg-hero px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Aplicando..." : "Aplicar ajuste"}
      </button>
    </form>
  );
}

export function ProductToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!isActive || confirm("¿Desactivar este producto?")) {
          startTransition(async () => {
            await toggleProduct(id, !isActive);
          });
        }
      }}
      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold"
    >
      {pending ? "..." : isActive ? "Desactivar" : "Activar"}
    </button>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        step={step}
        className="w-full rounded-xl border border-border px-4 py-3 text-sm"
      />
    </div>
  );
}

function Checkbox({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}
