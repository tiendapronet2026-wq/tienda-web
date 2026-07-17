# Motor interno de costos

El módulo usa valores decimales con hasta cuatro posiciones en PostgreSQL. Las funciones de
`src/lib/cost-engine.ts` escalan temporalmente los importes a enteros (`× 10.000`) para reducir
errores de coma flotante.

## Fórmulas

- Material: `costo unitario × cantidad consumida`.
- Merma: `costo × (1 + porcentaje / 100)`.
- Máquina: `costo total por hora × minutos / 60`.
- Energía: `(potencia W / 1.000) × precio kWh`.
- Depreciación: `precio de compra / vida útil estimada en horas`.
- Mano de obra: `costo por hora × minutos / 60`.
- Gastos indirectos: `subtotal × (1 + porcentaje / 100)`.
- Precio sugerido: `costo interno × (1 + margen / 100)`.
- Impuesto opcional: se conserva como configuración; no se aplica al catálogo ni a cotizaciones.

## Unidades y redondeo

Cada material define su unidad de consumo. Las conversiones de compra se guardan en
`supplier_materials.unit_conversion_factor`. Los cálculos internos conservan cuatro decimales y la
presentación monetaria redondea según el contexto.

## Costo vs. precio

El costo interno incluye recursos consumidos. El precio sugerido agrega merma, gastos indirectos y
margen. Ninguna función guarda datos ni modifica cotizaciones: recibe valores explícitos y devuelve
un resultado puro.
