import { htmlToText, providerErrorMessage } from "../src/lib/providers/temp-mail";

let failed = 0;

function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL ${name}`);
    failed += 1;
  }
}

assert("network copy", providerErrorMessage(0, true).includes("down"));
assert("429 copy", providerErrorMessage(429).includes("busy"));
assert("401 copy", providerErrorMessage(401).includes("Generate a new address"));
assert("fallback copy", providerErrorMessage(500).includes("error"));
assert(
  "html strip",
  htmlToText("<p>Hello <strong>world</strong></p><script>alert(1)</script>") === "Hello world",
);
assert("entities", htmlToText("A&nbsp;&amp;&nbsp;B") === "A & B");

if (failed) process.exit(1);
console.log("OK: temp-mail helpers");
