# CAPEX Sync Pro

Aplicación ejecutiva para control de CAPEX con Supabase, Vite + React + TypeScript, Tailwind y shadcn-style components.

## Configuración rápida

1. Copia `.env.example` en `.env` y completa credenciales de Supabase:

   ```bash
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   ```

2. Instala dependencias y levanta el entorno local:

   ```bash
   npm install
   npm run dev
   ```

## Supabase: migraciones y seed

1. Exporta las variables de entorno de Supabase CLI o configura la URL y el anon/service key.
2. Aplica la migración inicial (tablas, RLS, view `project_forecast_status`):

   ```bash
   supabase migration up --db-url $SUPABASE_DB_URL
   ```

3. Carga el seed 2025 (30 proyectos con real vs forecast):

   ```bash
   supabase db execute --file supabase/seed/2025_seed.sql --db-url $SUPABASE_DB_URL
   ```

## Rutas principales

- `/dashboard`: KPIs ejecutivos, gráficos YTD/BDGT, filtros por área y categoría, top desembolsos.
- `/projects`: lista filtrable y edición de forecast Sep–Dic (solo filas permitidas por RLS).
- `/users`: vista jerárquica segmentos → responsables → proyectos, solo admin.
- `/upload`: carga CSV para insertar/actualizar `capex_data`, solo admin.

## Autenticación y roles

- Supabase Auth email/password.
- Tabla `user_roles` define `admin` o `user`. El trigger `handle_new_user` asigna rol `user` y crea perfil.
- RLS:
  - Admin ve todo y puede insertar/actualizar.
  - Usuario solo ve proyectos donde `responsable_3` coincide con su `profiles.full_name` y solo actualiza forecast de meses futuros.

## SQL de la view `project_forecast_status`

```sql
create or replace view public.project_forecast_status as
with base as (
  select
    coalesce(numero_oi, nombre_proyecto) as project_key,
    nombre_proyecto,
    segmento,
    categoria,
    responsable_3 as responsable,
    mes,
    is_forecast,
    monto_usd,
    bdgt_mes_usd,
    updated_at
  from public.capex_data
  where ano = extract(year from now())
)
select
  project_key,
  nombre_proyecto,
  segmento,
  categoria,
  responsable,
  sum(case when mes <= 8 and is_forecast = false then monto_usd else 0 end) as real_ytd,
  sum(case when mes <= 8 then bdgt_mes_usd else 0 end) as bdgt_ytd,
  coalesce(max(case when mes = 9 then monto_usd end), 0) as forecast_sep,
  coalesce(max(case when mes = 10 then monto_usd end), 0) as forecast_oct,
  coalesce(max(case when mes = 11 then monto_usd end), 0) as forecast_nov,
  coalesce(max(case when mes = 12 then monto_usd end), 0) as forecast_dec,
  max(updated_at) filter (where is_forecast and mes >= 9) as forecast_last_updated_at,
  (
    count(*) filter (where is_forecast and mes in (9,10,11,12)) = 4
    and coalesce(max(updated_at) filter (where is_forecast and mes >= 9), now() - interval '8 days') >= now() - interval '7 days'
  ) as forecast_ready
from base
group by project_key, nombre_proyecto, segmento, categoria, responsable;
```

### ¿Cómo validarla?

1. Ejecuta un `select * from project_forecast_status limit 5;` para revisar agregados.
2. Cambia un forecast de Sep–Dic y confirma que `forecast_last_updated_at` se actualiza.
3. Verifica que `forecast_ready` solo sea verdadero cuando existen las cuatro filas de forecast y su `updated_at` está dentro de 7 días.

## Notas de datos

- Año 2025 con 30 proyectos.
- Segmentos: Administración, Bodega Prillex, Confiabilidad, Mantenimiento, I+D, Logistica, HSEC Prillex, Nittra.
- Categorías: Crecimiento/Rentabilidad, Mantenciones y OVH, Normativos/Seguridad, Nuevas Tecnologías, Otros.
- Mantenimiento concentra mayor presupuesto y número de proyectos.
- Real sólo enero-agosto (`is_forecast=false`), forecast sep-dic (`is_forecast=true`).

## Runbook

Consulta [RUNBOOK.md](./RUNBOOK.md) para pasos detallados de Supabase (migraciones, seed, creación de usuarios/admin) y ejecución en Codespaces.
