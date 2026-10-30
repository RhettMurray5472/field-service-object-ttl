import { z } from "zod";
import { infrai } from "./infrai_client.ts";

export const followUpRequest = z.object({
  work_order_id: z.string().min(1),
  technician_id: z.string().min(1),
  dispatch_status: z.enum(["assigned", "en_route", "complete"]),
  photo_data_base64: z.string().min(1),
  content_type: z.string().min(1),
});

export type FollowUpRequest = z.infer<typeof followUpRequest>;
const BUCKET = "field-service-throwaways";

export function decideRetention(input: Pick<FollowUpRequest, "dispatch_status">): number {
  return input.dispatch_status === "complete" ? 30 : 7;
}

export async function recordFollowUp(input: unknown) {
  const request = followUpRequest.parse(input);
  const days = decideRetention(request);
  await infrai.storage.bucket.create({ name: BUCKET, idempotency_key: "field-service-bucket-v1" });
  await infrai.storage.bucket.set_lifecycle(BUCKET, {
    rules: [{ id: "throwaway-work-order-photos", status: "enabled", expiration_days: days }],
    idempotency_key: "field-service-lifecycle-v1",
  });
  const key = `work-orders/${request.work_order_id}/follow-up-${request.technician_id}.jpg`;
  await infrai.storage.object.put(BUCKET, key, {
    data_base64: request.photo_data_base64,
    content_type: request.content_type,
    idempotency_key: `follow-up-${request.work_order_id}-${request.technician_id}`,
  });
  return { bucket: BUCKET, key, retention_days: days, dispatch_status: request.dispatch_status };
}

export async function scheduleSweep(taskUrl: string) {
  return infrai.cron.create({ cron_expr: "0 2 * * *", task: taskUrl, idempotency_key: "field-service-sweep-v1" });
}
