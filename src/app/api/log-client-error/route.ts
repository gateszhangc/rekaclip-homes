import { db } from "@/db";
import { errorLogs } from "@/db/schema";
import { getUuid } from "@/lib/hash";
import { respData, respErr } from "@/lib/resp";
import { getIsoTimestr } from "@/lib/time";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { error_msg, stack_trace, url, user_id } = body;

    const request_id = getUuid();

    // Insert into database
    // We use void to not await this if we wanted fire-and-forget, but for error logging API 
    // it is often better to await to ensure it's written before the browser closes, 
    // or use sendBeacon on frontend. Here we await to be safe.
    await db().insert(errorLogs).values({
      request_id: request_id, 
      user_id: user_id || null, // Ensure explicit null if undefined/empty
      api_path: url || "client-side-unknown", // Reusing api_path column for URL
      error_msg: error_msg || "Unknown error",
      stack_trace: stack_trace || "",
      created_at: new Date(), 
    });

    return respData({ success: true, request_id });
  } catch (e: any) {
    console.error("[API] Failed to log client error:", e);
    // Even if logging fails, we return a success-like object or ignore it to not break the client
    // But for debugging, we return json with error info
    return Response.json({ success: false, msg: "Internal Logger Error" }, { status: 500 });
  }
}
