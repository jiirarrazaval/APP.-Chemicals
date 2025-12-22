# CAPEX Sync Pro – Runbook

Guía operativa para levantar y mantener la app end-to-end con Supabase.

## Prerrequisitos
- Node.js 20+ y npm.
- Supabase CLI (https://supabase.com/docs/guides/cli).
- Credenciales del proyecto Supabase (`SUPABASE_DB_URL` con service role key para migraciones, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

## Variables de entorno
1. Copia `.env.example` a `.env` y completa:
   ```bash
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   ```
2. **No** compartas `.env` (ya está en `.gitignore`).

## Migraciones y seed (producción/staging)
1. Exporta la URL del Postgres gestionado por Supabase (service role) en `SUPABASE_DB_URL`.
2. Aplica migraciones:
   ```bash
   supabase migration up --db-url $SUPABASE_DB_URL
   ```
3. Carga el seed 2025:
   ```bash
   supabase db execute --file supabase/seed/2025_seed.sql --db-url $SUPABASE_DB_URL
   ```
4. Valida la vista `project_forecast_status`:
   ```sql
   select * from project_forecast_status limit 5;
   ```
   - Confirma que `forecast_ready` es TRUE sólo cuando hay forecast Sep–Dic y `updated_at` <= 7 días.

## Crear usuarios y roles
1. Crea usuario en el dashboard de Supabase (Auth > Users) o vía CLI:
   ```bash
   supabase auth signups create --email admin@example.com --password "StrongPass123"
   ```
2. El trigger `handle_new_user` creará `profiles` y rol `user`.
3. Para marcar admin (reemplaza `<user_id>`):
   ```sql
   insert into public.user_roles (user_id, role)
   values ('<user_id>', 'admin')
   on conflict (user_id) do update set role = 'admin';
   ```
4. Ajusta `profiles.full_name` si necesitas que el RLS matchee `responsable_3`:
   ```sql
   update public.profiles set full_name = 'Nombre Apellido' where user_id = '<user_id>';
   ```

## Ejecución local / Codespaces
1. Instala dependencias:
   ```bash
   npm install
   ```
   - Si el entorno tiene proxy, asegúrate de poder resolver `registry.npmjs.org`.
2. Levanta Vite (expone puerto 5173 y host 0.0.0.0 para Codespaces):
   ```bash
   npm run dev
   ```
3. Abre el puerto 5173 en Codespaces y navega a la URL pública que genera.
4. Inicia sesión con un usuario válido (admin verá `/users` y `/upload`).

## Datos y RLS
- Tablas principales: `capex_data`, `profiles`, `user_roles`.
- RLS: admin ve todo; usuario sólo filas donde `responsable_3` coincide con su `profiles.full_name`; sólo puede actualizar forecast de meses >= mes actual.
- Vista `project_forecast_status` alimenta dashboards y estados READY/PENDING.

## Checks rápidos
- `npm run lint` (requiere dependencias instaladas).
- `supabase db lint` (opcional) para validar SQL.
