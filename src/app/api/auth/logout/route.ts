import { NextRequest, NextResponse } from "next/server";
import { logoutUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await logoutUser();
  const origin = req.nextUrl.origin;
  return NextResponse.redirect(new URL("/?logged_out=true", origin));
}
