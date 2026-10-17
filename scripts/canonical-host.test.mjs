import assert from "node:assert/strict";

function normalizeHost(host) {
  return (host ?? "").toLowerCase().split(":")[0];
}
function normalizeProto(proto) {
  return (proto ?? "").toLowerCase().replace(/:$/, "");
}
function needsCanonicalRedirect(host, proto) {
  const h = normalizeHost(host);
  const p = normalizeProto(proto);
  if (h !== "tempempire.store" && h !== "www.tempempire.store") return false;
  return h !== "www.tempempire.store" || p === "http";
}

assert.equal(needsCanonicalRedirect("tempempire.store", "https"), true);
assert.equal(needsCanonicalRedirect("tempempire.store", "http"), true);
assert.equal(needsCanonicalRedirect("www.tempempire.store", "http"), true);
assert.equal(needsCanonicalRedirect("www.tempempire.store", "https"), false);
assert.equal(needsCanonicalRedirect("software-8fet.vercel.app", "https"), false);
assert.equal(needsCanonicalRedirect("TEMPEMPIRE.STORE:443", "HTTPS"), true);
assert.equal(needsCanonicalRedirect("www.tempempire.store:80", "http:"), true);

console.log("OK: canonical host redirect cases");
