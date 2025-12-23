do $$
declare
  projects jsonb := '[
    {"nombre":"Reemplazo bomba planta A","segmento":"Mantenimiento","categoria":"Mantenciones y OVH","responsable":"Paula Rojas","bdgt":5200000},
    {"nombre":"Modernización subestación nitrato","segmento":"Mantenimiento","categoria":"Normativos/Seguridad","responsable":"Gonzalo Pérez","bdgt":6800000},
    {"nombre":"Sistema monitoreo corrosión","segmento":"Confiabilidad","categoria":"Nuevas Tecnologías","responsable":"Marcela Díaz","bdgt":3100000},
    {"nombre":"Mejora logística puerto","segmento":"Logistica","categoria":"Crecimiento/Rentabilidad","responsable":"Iván Castillo","bdgt":4500000},
    {"nombre":"Expansión tanque Prillex","segmento":"Bodega Prillex","categoria":"Crecimiento/Rentabilidad","responsable":"Tamara Muñoz","bdgt":3900000},
    {"nombre":"Rediseño almacén repuestos","segmento":"Bodega Prillex","categoria":"Mantenciones y OVH","responsable":"Andrea Silva","bdgt":2600000},
    {"nombre":"Línea piloto I+D polímeros","segmento":"I+D","categoria":"Nuevas Tecnologías","responsable":"Felipe Gutiérrez","bdgt":2400000},
    {"nombre":"Certificación seguridad nitrato","segmento":"HSEC Prillex","categoria":"Normativos/Seguridad","responsable":"Claudia Vera","bdgt":2800000},
    {"nombre":"Renovación flota montacargas","segmento":"Logistica","categoria":"Mantenciones y OVH","responsable":"Iván Castillo","bdgt":3300000},
    {"nombre":"Automatización carga camiones","segmento":"Logistica","categoria":"Crecimiento/Rentabilidad","responsable":"Tamara Muñoz","bdgt":3600000},
    {"nombre":"Optimización digestor","segmento":"Mantenimiento","categoria":"Crecimiento/Rentabilidad","responsable":"Paula Rojas","bdgt":5400000},
    {"nombre":"Nuevo laboratorio analítica","segmento":"I+D","categoria":"Otros","responsable":"Felipe Gutiérrez","bdgt":2100000},
    {"nombre":"Detección fugas NH3","segmento":"HSEC Prillex","categoria":"Normativos/Seguridad","responsable":"Claudia Vera","bdgt":3200000},
    {"nombre":"Sustitución caldera backup","segmento":"Mantenimiento","categoria":"Normativos/Seguridad","responsable":"Gonzalo Pérez","bdgt":4100000},
    {"nombre":"Plan maestro ductos","segmento":"Confiabilidad","categoria":"Mantenciones y OVH","responsable":"Marcela Díaz","bdgt":2950000},
    {"nombre":"Capacidad aireación biotratar","segmento":"Mantenimiento","categoria":"Normativos/Seguridad","responsable":"Sergio Molina","bdgt":3600000},
    {"nombre":"Mejora iluminación HSEC","segmento":"HSEC Prillex","categoria":"Normativos/Seguridad","responsable":"Claudia Vera","bdgt":1800000},
    {"nombre":"Sistema backup energía crítica","segmento":"Administración","categoria":"Normativos/Seguridad","responsable":"Laura Herrera","bdgt":2500000},
    {"nombre":"Recubrimiento antiabrasión","segmento":"Mantenimiento","categoria":"Mantenciones y OVH","responsable":"Sergio Molina","bdgt":2700000},
    {"nombre":"Mejoras SAP mantenimiento","segmento":"Mantenimiento","categoria":"Nuevas Tecnologías","responsable":"Andrea Silva","bdgt":2300000},
    {"nombre":"Digital twins nitrato","segmento":"I+D","categoria":"Nuevas Tecnologías","responsable":"Felipe Gutiérrez","bdgt":2600000},
    {"nombre":"Nueva línea embolsado","segmento":"Nittra","categoria":"Crecimiento/Rentabilidad","responsable":"Tamara Muñoz","bdgt":4100000},
    {"nombre":"Centro control integrado","segmento":"Administración","categoria":"Otros","responsable":"Laura Herrera","bdgt":2400000},
    {"nombre":"Modernización planta agua","segmento":"Mantenimiento","categoria":"Normativos/Seguridad","responsable":"Gonzalo Pérez","bdgt":3300000},
    {"nombre":"Revestimiento tambor secador","segmento":"Mantenimiento","categoria":"Mantenciones y OVH","responsable":"Paula Rojas","bdgt":2800000},
    {"nombre":"Implementación AGV bodega","segmento":"Bodega Prillex","categoria":"Nuevas Tecnologías","responsable":"Andrea Silva","bdgt":3000000},
    {"nombre":"Bodega automatizada Prillex","segmento":"Bodega Prillex","categoria":"Crecimiento/Rentabilidad","responsable":"Tamara Muñoz","bdgt":4700000},
    {"nombre":"Incremento capacidad prilling","segmento":"Mantenimiento","categoria":"Crecimiento/Rentabilidad","responsable":"Sergio Molina","bdgt":5200000},
    {"nombre":"Programa confiabilidad bombas","segmento":"Confiabilidad","categoria":"Mantenciones y OVH","responsable":"Marcela Díaz","bdgt":3100000},
    {"nombre":"Plataforma planificación CAPEX","segmento":"Administración","categoria":"Otros","responsable":"Laura Herrera","bdgt":2200000}
  ]';
  item jsonb;
  month integer;
  bdgt numeric;
  real_accum numeric;
  remaining numeric;
  real_month numeric;
  forecast_month numeric;
  base_bdgt_month numeric;
  project_id uuid;
begin
  delete from public.capex_data where ano = 2025;

  for item in select * from jsonb_array_elements(projects) loop
    bdgt := (item ->> 'bdgt')::numeric;
    base_bdgt_month := bdgt / 12;
    real_accum := 0;
    for month in 1..12 loop
      if month <= 8 then
        real_month := base_bdgt_month * (0.7 + random() * 0.2);
        real_accum := real_accum + real_month;
        insert into public.capex_data (
          ano, mes, numero_oi, nombre_proyecto, desc_ceco, segmento, area, tipo_proyecto, categoria, responsable_3,
          monto_usd, bdgt_mes_usd, is_forecast
        ) values (
          2025,
          month,
          concat('OI-', floor(random()*9000 + 1000)::text),
          item ->> 'nombre',
          item ->> 'segmento',
          item ->> 'segmento',
          item ->> 'segmento',
          item ->> 'categoria',
          item ->> 'categoria',
          item ->> 'responsable',
          round(real_month,2),
          round(base_bdgt_month,2),
          false
        );
      else
        remaining := greatest(bdgt - real_accum, 0);
        forecast_month := (remaining / (12 - 8)) * (0.95 + random() * 0.1);
        insert into public.capex_data (
          ano, mes, numero_oi, nombre_proyecto, desc_ceco, segmento, area, tipo_proyecto, categoria, responsable_3,
          monto_usd, bdgt_mes_usd, is_forecast
        ) values (
          2025,
          month,
          concat('OI-', floor(random()*9000 + 1000)::text),
          item ->> 'nombre',
          item ->> 'segmento',
          item ->> 'segmento',
          item ->> 'segmento',
          item ->> 'categoria',
          item ->> 'categoria',
          item ->> 'responsable',
          round(forecast_month,2),
          round(base_bdgt_month,2),
          true
        );
      end if;
    end loop;
  end loop;
end $$;
