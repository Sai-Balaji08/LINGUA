import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/env";

const PROTECTED = ["/dashboard", "/learn", "/vocabulary", "/conversation", "/progress", "/settings", "/onboarding", "/admin", "/review"];
const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/verify"];

const startsWithAny = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));

/** Refreshes the Supabase session cookie on every request and guards private routes. */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isSupabaseConfigured()) {
    // Without Supabase there are no accounts, so private pages cannot work. Send people to the setup notice.
    if (startsWithAny(pathname, PROTECTED)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("setup", "1");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() verifies the token with Supabase. Never trust getSession() alone on the server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && startsWithAny(pathname, PROTECTED)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && startsWithAny(pathname, AUTH_PAGES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
