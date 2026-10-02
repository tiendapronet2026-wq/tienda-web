import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { ProductBomSection, type ProductBomLine } from "@/components/admin/ProductBomSection";
import {
  ProductCostSummary,
  type ProductionCostRpc,
} from "@/components/admin/ProductCostSummary";
import {
  ProductPricingSection,
  type ProductPricingRpc,
} from "@/components/admin/ProductPricingSection";
import {
  ProductChannelProfitabilitySection,
} from "@/components/admin/ProductChannelProfitabilitySection";
import type { ChannelProfileRow } from "@/components/admin/ChannelProfileForm";
import {
  ProductProcessSection,
  type ProcessResourceRow,
  type ProcessStepRow,
} from "@/components/admin/ProductProcessSection";
import { ProductForm, ProductToggle, StockAdjustForm } from "@/components/admin/ProductForm";
import { updateProduct } from "@/app/admin/actions/products";
import type { Product } from "@/types/database";

function parseProductPricing(data: unknown): ProductPricingRpc | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const num = (k: string) => (o[k] != null ? Number(o[k]) : Number.NaN);
  const production = num("production_cost");
  const current = num("current_sale_price");
  const suggested = num("suggested_price");
  const targetPct = num("target_margin_on_sale_percent");
  const net = num("net_price");
  const taxPct = num("tax_rate_percent");
  const taxAmt = num("tax_amount");
  if ([production, current, suggested, targetPct, net, taxPct, taxAmt].some((n) => !Number.isFinite(n))) {
    return null;
  }
  const margin = o.actual_margin_on_sale;
  const markup = o.actual_markup_on_cost;
  const unit = o.unit_result;
  const currentNetRaw = o.current_net_sale_price;
  return {
    production_cost: production,
    manual_cost_price: o.manual_cost_price != null ? Number(o.manual_cost_price) : null,
    current_sale_price: current,
    current_net_sale_price:
      currentNetRaw != null && Number.isFinite(Number(currentNetRaw))
        ? Number(currentNetRaw)
        : null,
    target_margin_on_sale_percent: targetPct,
    net_price: net,
    tax_rate_percent: taxPct,
    tax_amount: taxAmt,
    rounding_rule: String(o.rounding_rule ?? "none"),
    suggested_price: suggested,
    actual_margin_on_sale:
      margin != null && Number.isFinite(Number(margin)) ? Number(margin) : null,
    actual_markup_on_cost:
      markup != null && Number.isFinite(Number(markup)) ? Number(markup) : null,
    unit_result: unit != null && Number.isFinite(Number(unit)) ? Number(unit) : null,
    below_cost: Boolean(o.below_cost),
  };
}

function parseProductionCost(data: unknown): ProductionCostRpc | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const num = (k: string) => (o[k] != null ? Number(o[k]) : Number.NaN);
  const materials = num("materials_cost");
  const machine = num("machine_cost");
  const labor = num("labor_cost");
  const production = num("production_cost");
  const total = num("total_cost");
  if ([materials, machine, labor, production, total].some((n) => !Number.isFinite(n))) return null;
  return {
    materials_cost: materials,
    machine_cost: machine,
    labor_cost: labor,
    production_cost: production,
    total_cost: total,
  };
}

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mensaje?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { mensaje } = await searchParams;
  const supabase = await createClient();

  const [
    { data: product },
    { data: categories },
    { data: bomLines },
    { data: materialOptions },
    { data: processSteps },
    { data: machineOptions },
    { data: laborOptions },
    rpcMaterial,
    rpcProduction,
    rpcPricing,
    { data: pricingHistory },
    { data: channelProfiles },
  ] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle<Product>(),
    supabase.from("categories").select("id, name").order("name"),
    supabase
      .from("product_bom_lines")
      .select("id, quantity, materials(id, name, unit_type, current_cost, currency, is_active)")
      .eq("product_id", id)
      .eq("is_active", true)
      .is("product_variant_id", null)
      .order("created_at"),
    supabase.from("materials").select("id, name, unit_type").eq("is_active", true).order("name"),
    supabase
      .from("product_process_steps")
      .select(
        `id, name, position, batch_size, is_active,
        product_process_resources (
          id, resource_type, run_minutes, setup_minutes, is_active,
          machines ( id, name, total_cost_per_hour, is_active ),
          labor_rates ( id, name, cost_per_hour, is_active )
        )`,
      )
      .eq("product_id", id)
      .eq("is_active", true)
      .order("position"),
    supabase.from("machines").select("id, name").eq("is_active", true).order("name"),
    supabase.from("labor_rates").select("id, name").eq("is_active", true).order("name"),
    supabase.rpc("calculate_product_material_cost", { p_product_id: id }),
    supabase.rpc("calculate_product_production_cost", { p_product_id: id }),
    supabase.rpc("calculate_product_pricing", { p_product_id: id }),
    supabase
      .from("product_pricing_history")
      .select(
        "id, previous_price, adopted_price, production_cost, suggested_price, actual_margin_after_adoption, reason, created_at, created_by",
      )
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("channel_cost_profiles")
      .select("*")
      .eq("is_active", true)
      .order("name"),
  ]);

  if (!product) notFound();

  const rpcTotal =
    rpcMaterial.error == null && rpcMaterial.data != null ? Number(rpcMaterial.data) : null;

  const productionBreakdown =
    rpcProduction.error == null ? parseProductionCost(rpcProduction.data) : null;

  const pricingAnalysis =
    rpcPricing.error == null ? parseProductPricing(rpcPricing.data) : null;

  const normalizedBomLines: ProductBomLine[] = (bomLines ?? []).map((row) => {
    const mat = row.materials;
    const material = (Array.isArray(mat) ? mat[0] : mat) as ProductBomLine["materials"];
    return { id: row.id, quantity: Number(row.quantity), materials: material };
  });

  const bomCurrency = normalizedBomLines[0]?.materials.currency ?? "ARS";

  const normalizedProfiles: ChannelProfileRow[] = (channelProfiles ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    channel_fee_percent: Number(r.channel_fee_percent),
    payment_fee_percent: Number(r.payment_fee_percent),
    fixed_fee_per_order: Number(r.fixed_fee_per_order),
    shipping_absorbed_per_order: Number(r.shipping_absorbed_per_order),
    other_cost_per_order: Number(r.other_cost_per_order),
    default_units_per_order: Number(r.default_units_per_order),
    target_channel_margin_percent:
      r.target_channel_margin_percent != null ? Number(r.target_channel_margin_percent) : null,
    is_active: r.is_active,
  }));

  const normalizedSteps: ProcessStepRow[] = (processSteps ?? []).map((row) => {
    const resources = (row.product_process_resources ?? []) as unknown[];
    const mapped: ProcessResourceRow[] = resources.map((r) => {
      const res = r as ProcessResourceRow & {
        machines: ProcessResourceRow["machines"] | ProcessResourceRow["machines"][];
        labor_rates: ProcessResourceRow["labor_rates"] | ProcessResourceRow["labor_rates"][];
      };
      const machine = Array.isArray(res.machines) ? res.machines[0] : res.machines;
      const labor = Array.isArray(res.labor_rates) ? res.labor_rates[0] : res.labor_rates;
      return {
        ...res,
        run_minutes: Number(res.run_minutes),
        setup_minutes: Number(res.setup_minutes),
        machines: machine ?? null,
        labor_rates: labor ?? null,
      };
    });
    return {
      id: row.id,
      name: row.name,
      position: row.position,
      batch_size: Number(row.batch_size),
      is_active: row.is_active,
      product_process_resources: mapped.filter((r) => r.is_active),
    };
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/productos" className="text-sm text-brand hover:underline">
            ← Volver a productos
          </Link>
          <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
        </div>
        <ProductToggle id={product.id} isActive={product.is_active} />
      </div>

      {mensaje === "creado" && (
        <p className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand">
          Producto creado correctamente.
        </p>
      )}

      <div className="mt-8">
        <ProductForm action={updateProduct} categories={categories ?? []} product={product} />
        {product.track_stock && <StockAdjustForm productId={product.id} />}
        <ProductBomSection
          productId={product.id}
          lines={normalizedBomLines}
          materials={materialOptions ?? []}
          rpcTotal={rpcTotal}
          currency={bomCurrency}
        />
        <ProductProcessSection
          productId={product.id}
          steps={normalizedSteps}
          machines={machineOptions ?? []}
          laborRates={laborOptions ?? []}
          currency={bomCurrency}
        />
        <ProductCostSummary breakdown={productionBreakdown} currency={bomCurrency} />
        <ProductChannelProfitabilitySection
          productId={product.id}
          catalogPrice={Number(product.price)}
          currency={bomCurrency}
          profiles={normalizedProfiles}
          initialProfileId={normalizedProfiles[0]?.id ?? null}
        />
        <ProductPricingSection
          productId={product.id}
          pricing={pricingAnalysis}
          currency={bomCurrency}
          history={(pricingHistory ?? []).map((row) => ({
            id: row.id,
            previous_price: Number(row.previous_price),
            adopted_price: Number(row.adopted_price),
            production_cost: Number(row.production_cost),
            suggested_price: Number(row.suggested_price),
            actual_margin_after_adoption:
              row.actual_margin_after_adoption != null
                ? Number(row.actual_margin_after_adoption)
                : null,
            reason: row.reason,
            created_at: row.created_at,
            created_by: row.created_by,
          }))}
        />
      </div>
    </div>
  );
}
