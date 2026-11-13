# OpsPulse · Supply Chain Control — Brief para Claude Code

## Contexto
Soy analista de control de inventario del CD11 (operador logístico Adecco, Perú, zona horaria America/Lima, moneda S/).
Hoy todo vive en varios Google Sheets con fórmulas pesadas y Apps Script que ya no escalan (DATA de bolsa tiene 114k filas y los scripts se caen por tiempo).
Quiero migrarlo a una app web llamada **OpsPulse** ("Supply Chain Control"): primero inventario, luego seguimiento operativo de recepción, almacenamiento, reabastecimiento, picking y despacho, y a futuro producción (multi-sitio: CD11, CD06, plantas).

## Stack
- Repo Git nuevo `opspulse`.
- **Supabase**: Postgres + Auth (email) + Storage (fotos) + Edge Functions si hace falta.
- Frontend: **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui**, gráficos con **Recharts**. Deploy en Vercel.
- Carga de archivos: Excel/CSV (`.xlsx`, `.xlsb`, `.csv`) parseados con SheetJS, validados y subidos por lotes a Supabase.
- Todo en español. Formato numérico S/ 1,234.56; fechas dd/mm/yyyy.
- Marca: rojo `#EC2227`, gris `#2B2B2B`, fondo `#F2F2F2`. Logo e ícono en `/public` (te los paso: logo.svg, icon.svg, logo_blanco.svg).

## Base de datos
Usa `schema.sql` (adjunto) como migración inicial (`supabase/migrations/0001_init.sql`). Revísalo y mejóralo si ves problemas, pero respeta las reglas de negocio de abajo.

## Módulos y reglas de negocio

### 1. Bolsa de inventario (prioridad 1)
- Fuentes: ERU (conteo cíclico/ajustes LPN, archivo "Bolsa mes" A:T) y SHORTPICK (DATA A:X, solo cód. actividad 4 y 17), más ajustes manuales del auditor.
- Clasificación:
  - TIPO: cód 19 en ubicación `XX-` = AJUSTE LPN; 19 en otra ubicación, 17, 53 y shortpick = CONTEO CICLICO; 29/52 = AJUSTE LPN.
  - MOTIVO OP: 19 en activo = AJUSTE ACTIVO; 19 en `XX-` según tabla de virtuales (AJUSTE SIN UBICACION, AJUSTE DROP, AJUSTE CARTONES, AJUSTE B2B, AJUSTE PERDIDO…); 17 = AJUSTE RESERVA LPN; 53 = AJUSTE RESERVA DETALLE LPN; 52 = VAS; 29 = CREACION LPN / CREA LPN VAS / CREA LPN MERMA según pantalla; shortpick = SHORTPICK.
- Valor = un_ajuste × costo_unitario del producto. Sin costo → listar en "Cod Alternat sin valor unitario".
- Gestión: NO CONSIDERAR si el grupo (o grupo+SKU) está en `no_considerar`, o motivo AJUSTE SIEMBRA / CREA LPN MULTISKU / CREA LPN CARTONES.
- Área: por la ubicación (tabla `ubicacion`); virtuales → "VIRTUAL …"; vacías → "LPN SIN UBICACION".
- Dashboard con filtros Mes, Semana, Día, Tipo, Gestión y Trimestre:
  - KPIs: Faltante, Sobrante, Neto, Movimientos, SKUs, SKUs sin costo.
  - Evolutivo mensual y semanal, neto por motivo y por área.
  - Top 15 productos y top 10 proveedores con mayor pérdida.
  - Tabla de códigos sin costo.
- Cierres trimestrales oficiales: Q1 −17,853.57; Q2 −37,423.59; Q3 −26,235.46. Deben cuadrar con un ajuste manual de "DIFERENCIA VALORIZACION".

### 2. Cruces (faltante de un SKU compensado por sobrante de otro)
- Netear por grupo+SKU y considerar solo cód. 17/19 de ERU con gestión CONSIDERAR.
- Emparejar faltante con sobrante con ventana de ±3 días y misma cantidad en unidades o en cajas (`producto.caja_estandar`).
- Cercanía:
  - mismo módulo = 3, módulo vecino = 2, mismo pasillo (≤3 módulos) = 1;
  - si alguna de las dos ubicaciones es virtual, se exige mismo proveedor o misma marca.
- Darle mucho peso a la **misma marca o línea** (primera palabra de la descripción y familias como ENFAMIL/ENFAGROW o HUGG/HUGGIES), a cantidades >1 y a parejas únicas 1-a-1. Casi todos los matches de 1 unidad con productos distintos son coincidencias.
- Flujo: Pendiente → Confirmado → "Pasar a NO CONSIDERAR" con motivo CRUCE. Se excluyen los dos movimientos; no se crea un ajuste manual.
- Caso real ya confirmado: grupo 733461386 Enfamil 137325 (−84 und) con grupo 733147420 Enfagrow 138780 (+56 und), 14 cajas. Mejora la bolsa en S/ 3,054.80.
- Debe correr en el servidor (SQL o Edge Function), no en el navegador.

### 3. ERU / ERI
- % de ubicaciones contadas sin error, por mes, área y piso.
- Referencias Q4: CD 93.9%, Mezzanine 1 73.4%, Knapp manual 76.3%.

### 4. VAS (auditoría de cartones)
- Sale de los ajustes con motivo VAS (cód. 52) y CREA LPN VAS (recuperado).
- Vistas por mes, clase de picking (ADAPTO/AFRAME = Knapp), origen del cartón, familia, auditor, top productos y proveedores.

### 5. Merma
- Evolutivo por área y familia, top N productos del CD y por área.

### 6. Procesos pendientes (LPN perdidos, sin ubicación, pendientes de operaciones)
- Cada LPN registra quién lo causó (DNI), quién lo levantó (DNI) y la fecha de levantamiento.
- Días de demora = (levantamiento o hoy) − creación, en tramos 0-2 / 3-7 / 8-15 / 16-30 / >30.
- Estado: LEVANTADO o PENDIENTE. Si el LPN deja de figurar en la carga nueva, avisar "YA NO FIGURA – PONER FECHA".

### 7. Auditoría de reabasto
- Carga diaria del CSV de reabasto. Solo entran tareas con estado Finalizada o Cancelado.
- Clave = `Tarea|LPN|Cod|UbicDestino`. Turno: Mañana 7–15, Tarde 15–23, Noche.
- Muestra diaria (parametrizable): todas las canceladas, hasta 5 REAB-CONSOL-CAJA y 25 aleatorias estratificadas por área, máximo 3 por usuario.
- Checklist P1–P6 con Sí/No/N.A. y cantidad contada:
  - P1 ubicación correcta;
  - P2 sin mezcla de SKU;
  - P3 cantidad cuadra;
  - P4 lote;
  - P5 FEFO;
  - P6 pasillo limpio / LPN retirado.
- Resultado:
  - CONFORME si todos los puntos evaluados cumplen;
  - NO CONFORME si alguno no cumple;
  - SIN EVALUAR si hay fecha pero no checklist;
  - PENDIENTE si no hay nada.
- "Auditadas" cuenta solo CONFORME + NO CONFORME.
- Dashboard por área, usuario, turno, punto del checklist y evolución diaria. Formulario móvil para el auditor.

### 8. Auditoría 5S
- 21 ítems en 5 bloques (Seiri, Seiton, Seiso, Seiketsu, Shitsuke).
- Puntaje por ítem: Cumple = 2, Parcial = 1, No cumple = 0; N.A. no cuenta.
- % por S y % total. Nivel: Excelente ≥85, Bueno ≥70, Regular ≥50, Deficiente.
- Fotos en Storage. Dashboard por área y semana.

### 9. Incidencias
- Formulario de supervisores: tipo, proceso, código, ubicación asignada, cantidad, LPN, si lo ubicó, ubicación donde lo encontró, si lo devolvió, y fotos.
- Galería por área (Knapp, Mezzanine…).

### 10. Seguimiento operativo (fase 2)
- Tabla `kpi_operativo` genérica por sitio, fecha, proceso, área, turno e indicador, con meta.
- Tablero por proceso: recepción, almacenamiento, reabastecimiento, picking, despacho; y a futuro producción.

## Lo que necesito que hagas, en este orden
1. Crear el repo, el proyecto Next.js y la estructura `supabase/`; aplicar la migración inicial.
2. Auth con roles: admin (yo), auditor, supervisor y lectura (gerencia).
3. Módulo **Cargas**:
   - subir archivo → previsualizar → validar columnas → insertar por lotes;
   - registro en `carga`, deduplicación por claves únicas, opción de deshacer una carga.
4. Módulo **Bolsa**: dashboard, filtros, tablas y exportación a Excel.
5. Cruces.
6. Auditoría de reabasto y 5S, con formularios responsive pensados para celular.
7. Procesos pendientes, VAS, merma, ERU e incidencias.
8. Seeds de ejemplo y tests de las reglas de clasificación y valorización, que son críticas.

Te iré compartiendo los Excel reales (Bolsa ERU, Shortpick, VALOR, UBICACIONES, Motivos, USUARIOS, PRODUCTOS, REABASTO.csv, MERMA .xlsb, Control de procesos, Incidencias). Primero revisa sus columnas y ajusta el mapeo de carga. Pregúntame antes de asumir reglas que no estén aquí.

**Importante:** no subas al repo datos sensibles (contraseñas, correos de jefaturas). Usa `.env.local` para las llaves de Supabase.
