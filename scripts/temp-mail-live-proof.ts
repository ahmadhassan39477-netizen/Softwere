/**
 * Live mail.tm proof: create an address, try to deliver a real message, poll.
 * Never prints the mailbox password.
 */
import { createMailbox, listMessages } from "../src/lib/providers/temp-mail";
import { createConnection } from "node:net";
import { resolveMx } from "node:dns/promises";
import { randomBytes } from "node:crypto";

async function mxHost(domain: string): Promise<string | null> {
  try {
    const mx = await resolveMx(domain);
    mx.sort((a, b) => a.priority - b.priority);
    return mx[0]?.exchange ?? null;
  } catch {
    return null;
  }
}

function smtpSend(host: string, from: string, to: string, raw: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const sock = createConnection({ host, port: 25, timeout: 20_000 });
    let buf = "";
    let step = 0;
    const lines = [
      `HELO tempempire.store\r\n`,
      `MAIL FROM:<${from}>\r\n`,
      `RCPT TO:<${to}>\r\n`,
      `DATA\r\n`,
      `${raw}\r\n.\r\n`,
      `QUIT\r\n`,
    ];
    const onReady = () => {
      if (step >= lines.length) return;
      sock.write(lines[step]);
      step += 1;
    };
    sock.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      const last = buf.trim().split("\n").pop() || "";
      const code = Number(last.slice(0, 3));
      if (step === 0 && code >= 200 && code < 400) {
        onReady();
        return;
      }
      if (step > 0 && step < lines.length && code >= 200 && code < 400) {
        onReady();
        return;
      }
      if (step >= lines.length && /221|250/.test(last)) {
        sock.end();
        resolve(buf);
      }
      if (code >= 400) {
        sock.end();
        reject(new Error(`SMTP ${last.trim()}`));
      }
    });
    sock.on("error", reject);
    sock.on("timeout", () => {
      sock.destroy();
      reject(new Error("SMTP timeout"));
    });
    sock.on("end", () => resolve(buf));
  });
}

async function tryFormsubmit(to: string, subject: string, text: string): Promise<string> {
  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      name: "Temp Empire proof",
      _subject: subject,
      message: text,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.text();
  return `formsubmit ${res.status} ${body.slice(0, 180)}`;
}

async function main() {
  const box = await createMailbox();
  const token = randomBytes(3).toString("hex");
  const subject = `Temp Empire inbox proof ${token}`;
  const text = `Real delivery check ${token}`;
  console.log(`address=${box.address}`);
  console.log(`domain=${box.domain}`);

  const mx = await mxHost(box.domain);
  let sendNote = "no send attempted";
  if (mx) {
    const raw = [
      `From: proof@tempempire.store`,
      `To: ${box.address}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      text,
    ].join("\r\n");
    try {
      const log = await smtpSend(mx, "proof@tempempire.store", box.address, raw);
      sendNote = `smtp mx=${mx} ok=${/250/.test(log)}`;
      console.log(sendNote);
    } catch (err) {
      sendNote = `smtp mx=${mx} failed: ${err instanceof Error ? err.message : err}`;
      console.log(sendNote);
    }
  }

  try {
    const fs = await tryFormsubmit(box.address, subject, text);
    console.log(fs);
    sendNote = `${sendNote}; ${fs}`;
  } catch (err) {
    console.log(`formsubmit failed: ${err instanceof Error ? err.message : err}`);
  }

  let found = false;
  for (let i = 0; i < 12; i += 1) {
    await new Promise((r) => setTimeout(r, 5000));
    const msgs = await listMessages(box.address, box.password);
    console.log(`poll ${i + 1} count=${msgs.length}`);
    if (msgs.some((m) => m.subject.includes(token) || m.intro.includes(token))) {
      found = true;
      break;
    }
    if (msgs.length > 0) {
      found = true;
      console.log(`received subject=${msgs[0].subject}`);
      break;
    }
  }

  if (!found) {
    console.log("LIMIT: no inbound message within 60s. Address is live; sender path may be blocked on this host.");
    console.log(`send=${sendNote}`);
    process.exit(2);
  }
  console.log("OK: real message arrived");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
