import "dotenv/config";
import pg from "pg";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const manifest = require("../.next/server/server-reference-manifest.json").node;
const id = (name) => Object.entries(manifest).find(([, v]) => v.exportedName === name)[0];

const base = "http://localhost:3100";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const q = async (sql, args) => (await db.query(sql, args)).rows;
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { (ok ? pass++ : fail++); console.log(ok ? "PASS" : "FAIL", name, extra); };

// Posts like a no-JS <form action={serverAction}>: hidden $ACTION_* fields + the form fields.
async function callAction(actionName, bound, fields, cookie, path = "/en/orders/new") {
  const fd = new FormData();
  fd.append("$ACTION_REF_1", "");
  fd.append("$ACTION_1:0", JSON.stringify({ id: id(actionName), bound: "$@1" }));
  fd.append("$ACTION_1:1", JSON.stringify(bound));
  fd.append("$ACTION_KEY", "k0");
  for (const [k, v] of fields) fd.append(k, v);
  return fetch(`${base}${path}`, { method: "POST", body: fd, redirect: "manual", headers: { Origin: base, ...(cookie ? { Cookie: cookie } : {}) } });
}

// --- login ---
const [email, password] = process.env.SEED_USERS.split(",")[0].split(":");
const html = await (await fetch(`${base}/en/login`)).text();
const hidden = [...html.matchAll(/<input[^>]*type="hidden"[^>]*>/g)].map((m) => ({ name: m[0].match(/name="([^"]+)"/)[1], value: (m[0].match(/value="([^"]*)"/)?.[1] ?? "").replaceAll("&quot;", '"') }));
async function login(em, pw) {
  const fd = new FormData();
  for (const h of hidden) fd.append(h.name, h.value);
  fd.set("email", em); fd.set("password", pw);
  const r = await fetch(`${base}/en/login`, { method: "POST", body: fd, redirect: "manual", headers: { Origin: base } });
  return { status: r.status, location: r.headers.get("location"), setCookie: r.headers.get("set-cookie"), text: await r.text() };
}
const bad = await login(email, "definitely-wrong");
check("wrong password rejected with generic error", /Incorrect email or password/.test(bad.text) && !bad.setCookie, `status ${bad.status}`);
const unknown = await login("nobody@example.com", "whatever1");
check("unknown email gives the same generic error", /Incorrect email or password/.test(unknown.text));
const good = await login(email, password);
check("valid login redirects to dashboard", good.location?.endsWith("/en/dashboard"), `${good.status} ${good.location}`);
const flags = good.setCookie ?? "";
check("session cookie is HttpOnly + SameSite=Lax", /HttpOnly/i.test(flags) && /SameSite=lax/i.test(flags));
const cookie = flags.split(";")[0];

// --- auth gating ---
const g = (p, c = cookie) => fetch(base + p, { headers: c ? { Cookie: c } : {}, redirect: "manual" });
check("signed-out /en/orders -> login", (await g("/en/orders", null)).headers.get("location")?.endsWith("/en/login"));
check("signed-in /en/login -> dashboard", (await g("/en/login")).headers.get("location")?.endsWith("/en/dashboard"));
check("tampered cookie rejected", (await g("/en/dashboard", cookie.slice(0, -4) + "AAAA")).headers.get("location")?.endsWith("/en/login"));
check("no /register route", (await g("/en/register")).status === 404);

// --- pages render ---
for (const p of ["/en/dashboard", "/en/orders", "/en/orders/new", "/ms/orders?status=PAID&branch=CBD&q=kopi", "/zh/dashboard?range=7d", "/ta/orders"]) {
  const r = await g(p);
  check(`GET ${p}`, r.status === 200, String(r.status));
}
{
  const r = await g("/en/orders/does-not-exist/edit");
  const body = await r.text();
  check("unknown order id shows not-found", r.status === 404 || /NEXT_HTTP_ERROR_FALLBACK;404|not-found|404/i.test(body), `status ${r.status}`);
}
await q(`delete from "Order" where "customerName"='E2E Test'`); // leftovers from an earlier run

// --- dashboard totals vs SQL ---
const dash = await (await g("/en/dashboard?range=30d")).text();
const sgtMidnightToday = (() => { const n = new Date(Date.now() + 8 * 3600e3); return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()) - 8 * 3600e3; })();
const from = new Date(sgtMidnightToday - 29 * 86400e3), to = new Date(sgtMidnightToday + 86400e3);
// "orderedAt" is timestamp-without-tz holding UTC: pass UTC strings so pg doesn't shift by local zone.
const fromS = from.toISOString().replace("Z", ""), toS = to.toISOString().replace("Z", "");
const [{ sum, cnt }] = await q(`select sum("totalCents")::int sum, count(*)::int cnt from "Order" where status<>'CANCELLED' and "orderedAt" >= $1 and "orderedAt" < $2`, [fromS, toS]);
const money = (c) => "S$" + (c / 100).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
check("dashboard total sales == SQL sum", dash.includes(money(sum)), `${money(sum)} (${cnt} orders)`);
const cbd = await (await g("/en/dashboard?range=30d&branch=CBD")).text();
const [{ sum: sumCbd }] = await q(`select sum(o."totalCents")::int sum from "Order" o join "Branch" b on b.id=o."branchId" where b.code='CBD' and o.status<>'CANCELLED' and o."orderedAt" >= $1 and o."orderedAt" < $2`, [fromS, toS]);
check("branch filter total == SQL sum for CBD", cbd.includes(money(sumCbd)), money(sumCbd));
const perBranch = await q(`select sum(o."totalCents")::int s from "Order" o where o.status<>'CANCELLED' and o."orderedAt" >= $1 and o."orderedAt" < $2 group by o."branchId"`, [fromS, toS]);
check("All == sum of the three branches", perBranch.reduce((a, b) => a + b.s, 0) === sum);

// --- order CRUD through the real server actions ---
const [branch] = await q(`select id from "Branch" where code='CBD'`);
const count = async () => (await q(`select count(*)::int c from "Order"`))[0].c;
const before = await count();
const fields = (over = {}) => [
  ["lang", "en"], ["branchId", branch.id], ["orderedAt", "2026-10-28T09:15"], ["status", "PAID"], ["paymentMethod", "CARD"], ["customerName", "E2E Test"],
  ["itemName", "Test Latte"], ["itemQuantity", "2"], ["itemPrice", "5.50"],
  ["itemName", "Test Cake"], ["itemQuantity", "1"], ["itemPrice", "4"],
  ...Object.entries(over),
];

await callAction("createOrder", [{}], fields(), null);
check("create without a session is rejected (no row added)", (await count()) === before);

await callAction("createOrder", [{}], fields({ branchId: "" }).filter(([k, v]) => !(k === "branchId" && v !== "")), cookie);
check("create without branch is rejected", (await count()) === before);
await callAction("createOrder", [{}], [["lang", "en"], ["branchId", branch.id], ["orderedAt", "2026-10-28T09:15"], ["status", "PAID"], ["paymentMethod", "CASH"], ["customerName", ""]], cookie);
check("create with no items is rejected", (await count()) === before);
await callAction("createOrder", [{}], fields().map(([k, v]) => (k === "itemPrice" && v === "5.50" ? [k, "abc"] : [k, v])), cookie);
check("create with invalid price is rejected", (await count()) === before);

await callAction("createOrder", [{}], [...fields(), ["totalCents", "1"]], cookie);
check("valid create adds one order", (await count()) === before + 1);
const [created] = await q(`select *, to_char("orderedAt", 'YYYY-MM-DD"T"HH24:MI') as ordered_utc from "Order" where "customerName"='E2E Test' order by "createdAt" desc limit 1`);
check("total recomputed server-side (2x5.50 + 1x4.00 = 1500), client total ignored", created?.totalCents === 1500, String(created?.totalCents));
check("09:15 Singapore time stored as 01:15 UTC", created?.ordered_utc === "2026-10-28T01:15", String(created?.ordered_utc));
const items1 = await q(`select name from "OrderItem" where "orderId"=$1`, [created.id]);
check("two line items saved", items1.length === 2);

const upd = [["lang", "en"], ["id", created.id], ["branchId", branch.id], ["orderedAt", "2026-10-28T10:00"], ["status", "PENDING"], ["paymentMethod", "CASH"], ["customerName", "E2E Test"], ["itemName", "Only Item"], ["itemQuantity", "3"], ["itemPrice", "2.50"]];
await callAction("updateOrder", [{}], upd, cookie);
const [after] = await q(`select * from "Order" where id=$1`, [created.id]);
const items2 = await q(`select name from "OrderItem" where "orderId"=$1`, [created.id]);
check("update replaced items (1 item, 'Only Item')", items2.length === 1 && items2[0].name === "Only Item");
check("update recomputed total (3x2.50 = 750) and status", after.totalCents === 750 && after.status === "PENDING", `${after.totalCents} ${after.status}`);
const ordersPage = await (await g("/en/orders?q=Only%20Item")).text();
check("orders list shows the edited order (search by item name)", ordersPage.includes("E2E Test") && ordersPage.includes("S$7.50"));

const noSession = await callAction("deleteOrder", [created.id, "en"], [], null, "/en/orders");
check("delete without a session is rejected", (await q(`select 1 from "Order" where id=$1`, [created.id])).length === 1, `${noSession.status} ${noSession.headers.get("location") ?? ""}`);
await callAction("deleteOrder", [created.id, "en"], [], cookie, "/en/orders");
check("delete removes the order", (await q(`select 1 from "Order" where id=$1`, [created.id])).length === 0);
check("delete cascades to its items", (await q(`select 1 from "OrderItem" where "orderId"=$1`, [created.id])).length === 0);
check("order count back to original", (await count()) === before);

let limited = false;
for (let i = 0; i < 7; i++) { const r = await login("ratelimit@example.com", "nope" + i); if (/Too many attempts/.test(r.text)) limited = true; }
check("login is rate-limited after repeated failures", limited);

await db.end();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
