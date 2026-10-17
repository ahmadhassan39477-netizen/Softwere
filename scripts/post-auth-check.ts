import {
  DEFAULT_POST_AUTH,
  guestRegisterCallback,
  hasServicesDeepLink,
  postAuthDestination,
} from "../src/lib/post-auth";

const cases: Array<[string, string | null, number, string]> = [
  ["default empty", null, 0, "/deposit"],
  ["default slash-slash", "//evil", 0, "/deposit"],
  ["bare services new", "/services", 0, "/deposit"],
  ["bare services with money", "/services", 12, "/deposit"],
  ["deep services empty", "/services?country=US", 0, "/deposit"],
  ["deep services with money", "/services?country=US", 5, "/services?country=US"],
  ["facebook chip empty", "/services?service=facebook", 0, "/deposit"],
  ["facebook chip with money", "/services?service=facebook", 1, "/services?service=facebook"],
  ["keep deposit", "/deposit", 0, "/deposit"],
  ["keep mail", "/temp-mail", 0, "/temp-mail"],
];

let failed = 0;
for (const [name, raw, bal, want] of cases) {
  const got = postAuthDestination(raw, bal);
  if (got !== want) {
    console.error(`FAIL ${name}: got ${got} want ${want}`);
    failed += 1;
  }
}

if (guestRegisterCallback("/services") !== DEFAULT_POST_AUTH) {
  console.error("FAIL guest bare services");
  failed += 1;
}
if (guestRegisterCallback("/services", "?country=US") !== "/services?country=US") {
  console.error("FAIL guest deep services");
  failed += 1;
}
if (hasServicesDeepLink("/services")) {
  console.error("FAIL bare is not deep");
  failed += 1;
}

if (failed) {
  process.exit(1);
}
console.log("OK: post-auth destinations");
