import { recordFollowUp, scheduleSweep } from "./field_service.ts";

const result = await recordFollowUp({
  work_order_id: "WO-1042",
  technician_id: "tech-7",
  dispatch_status: "complete",
  photo_data_base64: Buffer.from("final inspection").toString("base64"),
  content_type: "image/jpeg",
});
await scheduleSweep("https://example.com/field-service/sweep");
console.log(JSON.stringify(result));
