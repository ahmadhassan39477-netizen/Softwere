import assert from "node:assert/strict";
import {
  extractMailPriceRests,
  GMAIL_CANCEL_WINDOW_SECONDS,
  GMAIL_MARKUP_PERCENT,
  GMAIL_TTL_MINUTES,
  isGmailMailOperator,
  retailFromGmailWholesale,
} from "../src/lib/smsbower-mail";
import { parseSaGetStatusText, extractOtpCode } from "../src/lib/sms/sa-status";

// Markup: retail = wholesale × 1.40
assert.equal(GMAIL_MARKUP_PERCENT, 40);
assert.equal(retailFromGmailWholesale(1), 1.4);
assert.equal(retailFromGmailWholesale(0.25), 0.35);

// Product window mirrors SMSBower temporary Gmail (25 min)
assert.equal(GMAIL_TTL_MINUTES, 25);
assert.equal(GMAIL_CANCEL_WINDOW_SECONDS, 25 * 60);

assert.equal(isGmailMailOperator("mail:gmail.com"), true);
assert.equal(isGmailMailOperator("mail:gmail"), true);
assert.equal(isGmailMailOperator("virtual28"), false);
assert.equal(isGmailMailOperator(null), false);

// getPriceRests shape → gmail.com cells only kept when price+count > 0
{
  const map = extractMailPriceRests({
    status: 1,
    data: {
      tg: {
        "gmail.com": { price: 0.12, count: 40 },
        "mailnestpro.com": { price: 0.05, count: 100 },
      },
      ig: {
        "gmail.com": { price: 0, count: 5 },
      },
      fb: {
        "gmail.com": { price: 0.2, count: 0 },
      },
    },
  });
  assert.ok(map.tg?.["gmail.com"]);
  assert.equal(map.tg!["gmail.com"]!.price, 0.12);
  assert.equal(map.tg!["gmail.com"]!.count, 40);
  assert.ok(map.tg?.["mailnestpro.com"]);
  assert.equal(map.ig, undefined); // price 0 dropped
  assert.equal(map.fb, undefined); // count 0 dropped
}

// SMSBower-style STATUS_OK must surface for Extra order cards / SSE
{
  const ok = parseSaGetStatusText("STATUS_OK:482913");
  assert.equal(ok.status, "RECEIVED");
  assert.equal(ok.code, "482913");
}
{
  const full = extractOtpCode("Your Telegram code is 119922");
  assert.equal(full, "119922");
}

console.log("gmail-smsbower-mail.test.ts: ok");
