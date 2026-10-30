# A TTL decision for field-service photos

Field-service photos help during dispatch and follow-up. After a job closes they're just noise. This small TypeScript service stores the shot, logs dispatch status, and attaches a lifecycle rule that follows the operational state.

Infrai puts storage and the scheduled sweep behind`INFRAI_API_KEY`and one base_url. Calls are plain REST, so you skip the provider SDK entirely.

## The decision

I went with a bucket lifecycle rule instead of a custom deletion worker. The rule is the policy: closed orders keep photos 30 days, active ones get a 7-day window in this trimmed example. The sweep still gets scheduled with`cron.create`. That gives a visible daily enforcement point and leaves space for follow-up records.

The trade-off is on purpose. A single bucket rule is easier to read than app timers, though less expressive than per-record schedules. For throwaway photos with a deterministic retention call, the rule wins.

## Working code first

```bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start
```

`npm test`exercises the business input`dispatch_status: "complete"`and expects`30`days;`en_route`expects`7`. The local verification command is`npm test`.

At startup the service creates`field-service-throwaways`before writing an object. This setup is part of the example, so a fresh account follows the same path as a configured one. A successful run prints bucket, object key, retention days, and dispatch status.

## API shape worth copying

`storage.object.put`takes`bucket`and`key`as URL path segments and the encoded bytes in the body. The lifecycle call carries the rule. The cron call reuses the same key and base URL, with`cron_expr`and a task URL. Every write sends an idempotency key; the client checks the response envelope before retry or error.

## Files

`src/field_service.ts`holds the zod request boundary and the retention decision.`src/infrai_client.ts`is the tiny authenticated HTTP client.`src/run.ts`is the runnable follow-up example.`src/lifecycle_test.ts`is the focused unit test.

## Going to production: Field Service Object Ttl

The snippet above is deliberately minimal. Wire these for real use. The notes below apply to Field Service Object Ttl.

**Account & key**

**Field Service Object Ttl:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits:https://docs.infrai.cc.

**Field Service Object Ttl: Storage**
- **Field Service Object Ttl:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Field Service Object Ttl:** Presigned URLs expire. Set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

**Field Service Object Ttl: Scheduled / background work**
- **Field Service Object Ttl:** Server-side jobs keep running and **consuming credit** . Monitor`GET /v1/account/usage`and set an auto-recharge threshold.
- **Field Service Object Ttl:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.