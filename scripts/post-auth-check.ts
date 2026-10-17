import {
  DEFAULT_POST_AUTH,
  guestRegisterCallback,
  postAuthDestination,
} from "../src/lib/post-auth";

const cases: Array<[string, string | null, string]> = [
  ["default empty", null, "/services"],
  ["default slash-slash", "//evil", "/services"],
  ["bare services", "/services", "/services"],
  ["deep services", "/services?country=US", "/services?country=US"],
  ["facebook chip", "/services?service=facebook", "/services?service=facebook"],
  ["deposit becomes services", "/deposit", "/services"],
  ["mail becomes services", "/temp-mail", "/services"],
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

if (failed) {
  process.exit(1);
}
console.log("OK: post-auth destinations");
