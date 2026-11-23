import { cookies } from "next/headers";
import { isValidTimeZone } from "@/lib/stats";

/** The learner's IANA time zone, set by <TimezoneCookie /> in the app shell. Falls back to UTC. */
export async function getTimeZone(): Promise<string> {
  const value = (await cookies()).get("tz")?.value;
  const decoded = value ? decodeURIComponent(value) : undefined;
  return isValidTimeZone(decoded) ? decoded : "UTC";
}
