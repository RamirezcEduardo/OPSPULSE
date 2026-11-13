# OpsPulse · Supply Chain Control

App web de control de inventario y seguimiento operativo (CD11).

## Desarrollo

1. Copia `.env.example` a `.env.local` y completa la llave anon de Supabase.
2. `npm install`
3. `npm run dev` → http://localhost:3000
4. `npm test` → tests de reglas de clasificación y valorización.

Base de datos: `supabase/migrations/`. Brief del proyecto: `docs/BRIEF.md`.

En Vercel define `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Settings → Environment Variables.
