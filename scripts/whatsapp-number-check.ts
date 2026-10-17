import {
  DEFAULT_WHATSAPP_BUSINESS_NUMBER,
  formatWhatsAppDisplay,
  isRetiredWhatsAppNumber,
  normalizeWhatsAppNumber,
  whatsappChatUrl,
} from "../src/lib/whatsapp-copy";

let failed = 0;
function assert(name: string, cond: boolean) {
  if (!cond) {
    console.error(`FAIL ${name}`);
    failed += 1;
  }
}

assert("default", DEFAULT_WHATSAPP_BUSINESS_NUMBER === "923153378418");
assert("local 03", normalizeWhatsAppNumber("03153378418") === "923153378418");
assert("plus", normalizeWhatsAppNumber("+923153378418") === "923153378418");
assert("retired 0307", isRetiredWhatsAppNumber("923072577778"));
assert("retired 0328", isRetiredWhatsAppNumber("923287087121"));
assert("not retired", !isRetiredWhatsAppNumber("923153378418"));

const line = formatWhatsAppDisplay("923153378418");
assert("local display", line.localDisplay === "03153378418");
assert("plus display", line.display === "+92 315 3378418");
assert("wa.me", whatsappChatUrl(line.number, "hi").startsWith("https://wa.me/923153378418"));

if (failed) process.exit(1);
console.log("OK: WhatsApp 03153378418 / wa.me/923153378418");
