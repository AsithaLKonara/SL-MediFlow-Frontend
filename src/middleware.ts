import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const roleCookie = request.cookies.get("mediflow_role")?.value || request.cookies.get("amaz_role")?.value;

  if (pathname.startsWith("/superadmin")) {
    if (roleCookie) {
      const decodedRole = decodeURIComponent(roleCookie).toLowerCase();
      
      // If user is receptionist, pharmacist, cashier, nurse -> redirect immediately to /frontdesk
      const frontdeskRoles = ["receptionist", "pharmacist", "cashier", "nurse", "frontdesk"];
      if (frontdeskRoles.includes(decodedRole)) {
        return NextResponse.redirect(new URL("/frontdesk", request.url));
      }

      // If user is doctor or labtech -> redirect to their role home
      if (["doctor", "labtech"].includes(decodedRole)) {
        return NextResponse.redirect(new URL(`/${decodedRole}`, request.url));
      }

      // If user is extra services -> redirect to extra services unless accessing catalog
      if (
        ["extra services", "extra_services", "extraservices"].includes(decodedRole) &&
        !pathname.startsWith("/superadmin/extra-services")
      ) {
        return NextResponse.redirect(new URL("/extra-services", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/superadmin/:path*"],
};
