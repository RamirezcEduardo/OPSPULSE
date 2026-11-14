import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
  const url = SUPABASE_URL;
  const key = SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  // getClaims valida el token localmente (sin ir a Supabase en cada clic) y refresca la sesión si venció.
  let user: unknown = null;
  try {
    const { data } = await supabase.auth.getClaims();
    user = data?.claims?.sub ?? null;
  } catch {
    user = null;
  }
  const enLogin = request.nextUrl.pathname.startsWith("/login");
  if (!user && !enLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (user && enLogin) return NextResponse.redirect(new URL("/", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|manifest.webmanifest|icon.svg|logo.svg|logo_blanco.svg|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
