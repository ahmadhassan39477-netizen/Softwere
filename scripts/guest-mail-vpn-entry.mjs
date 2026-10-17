/** Probe guest 307 → /register for Temp Mail + VPN entries. */
const base = process.argv[2] || "http://127.0.0.1:3000";

const paths = ["/temp-mail", "/mail", "/vpn"];
let failed = 0;

for (const path of paths) {
  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  const loc = res.headers.get("location") || "";
  const ok =
    res.status === 307 &&
    /\/register/.test(loc) &&
    /callbackUrl=/.test(loc);
  if (!ok) {
    console.error(`FAIL ${path}: ${res.status} ${loc}`);
    failed += 1;
  } else {
    console.log(`OK ${path} → ${res.status} ${loc}`);
  }
}

if (failed) process.exit(1);
console.log("OK: guest mail/vpn/mail entries 307 to register");
