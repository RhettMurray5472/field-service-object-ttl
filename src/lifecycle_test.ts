import { decideRetention } from "./field_service.ts";

const complete = decideRetention({ dispatch_status: "complete" });
const active = decideRetention({ dispatch_status: "en_route" });
if (complete !== 30 || active !== 7) throw new Error(`retention decision was ${complete}/${active}`);
console.log("pass: complete work orders retain photos for 30 days; active work orders retain them for 7");
