import {
  DEFAULT_POST_AUTH,
  guestRegisterCallback,
  postAuthDestination,
} from "../src/lib/post-auth";
import { shopHref } from "../src/lib/guest-links";

const cases: Array<[string, string | null, string]> = [
  ["default empty", null, "/services"],
  ["default slash-slash", "//evil", "/services"],
  ["bare services", "/services", "/services"],
  ["deep services", "/services?country=US", "/services?country=US"],
  ["facebook chip", "/services?service=facebook", "/services?service=facebook"],
  ["deposit becomes services", "/deposit", "/services"],
  ["mail becomes services", "/temp-mail", "/services"],
  ["vpn becomes services", "/vpn", "/services"],
  ["public mail becomes services", "/mail", "/services"],
  ["api docs stays api-docs", "/api-docs", "/api-docs"],
];

let failed = 0;
for (const [name, raw, want] of cases) {
  const got = postAuthDestination(raw);
  if (got !== want) {
    console.error(`FAIL ${name}: got ${got} want ${want}`);
    failed += 1;
  }
}

if (DEFAULT_POST_AUTH !== "/services") {
  console.error("FAIL default is not /services");
  failed += 1;
}
if (guestRegisterCallback("/services") !== "/services") {
  console.error("FAIL guest bare services");
  failed += 1;
}
if (guestRegisterCallback("/services", "?country=US") !== "/services?country=US") {
  console.error("FAIL guest deep services");
  failed += 1;
}
if (guestRegisterCallback("/deposit") !== "/services") {
  console.error("FAIL guest deposit → services");
  failed += 1;
}
if (guestRegisterCallback("/temp-mail") !== "/services") {
  console.error("FAIL guest temp-mail → services");
  failed += 1;
}
if (guestRegisterCallback("/vpn") !== "/services") {
  console.error("FAIL guest vpn → services");
  failed += 1;
}
if (guestRegisterCallback("/mail") !== "/services") {
  console.error("FAIL guest /mail → services");
  failed += 1;
}
if (guestRegisterCallback("/api-docs") !== "/api-docs") {
  console.error("FAIL guest /api-docs stays /api-docs");
  failed += 1;
}

if (shopHref(true, "/temp-mail") !== "/temp-mail") {
  console.error("FAIL signed-in mail href");
  failed += 1;
}
if (shopHref(true, "/vpn") !== "/vpn") {
  console.error("FAIL signed-in vpn href");
  failed += 1;
}
if (shopHref(false, "/temp-mail") !== "/temp-mail") {
  console.error("FAIL guest mail path still /temp-mail (middleware 307)");
  failed += 1;
}
if (shopHref(false, "/vpn") !== "/vpn") {
  console.error("FAIL guest vpn path still /vpn (middleware 307)");
  failed += 1;
}

if (failed) {
  process.exit(1);
}
console.log("OK: post-auth destinations");
