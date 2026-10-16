import type { SmsStatus } from "./types";

/** Pull a plausible OTP (4–8 digits) from free text. */
export function extractOtpCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;
  // Prefer explicit code= / otp= patterns
  const labeled = text.match(
    /(?:code|otp|pin|пароль|код)\s*[=:#]?\s*([0-9]{4,8})/i,
  );
  if (labeled?.[1]) return labeled[1];
  // Bare numeric payload (STATUS_OK:123456)
  if (/^[0-9]{4,8}$/.test(text)) return text;
  // Digits with optional spaces/dashes (e.g. 12-34-56 or 123 456)
  const spaced = text.match(/\b([0-9](?:[- ]?[0-9]){3,7})\b/);
  if (spaced?.[1]) {
    const digits = spaced[1].replace(/[- ]/g, "");
    if (digits.length >= 4 && digits.length <= 8) return digits;
  }
  const any = text.match(/\b([0-9]{4,8})\b/);
  return any?.[1] ?? null;
}

/**
 * Parse SA/Grizzly getStatus plain-text responses:
 * STATUS_OK:code | STATUS_WAIT_RETRY:lastcode | STATUS_WAIT_CODE | STATUS_CANCEL
 */
export function parseSaGetStatusText(text: string): SmsStatus {
  const t = text.trim();
  if (!t) return { status: "WAIT", code: null, message: null };

  if (t.startsWith("STATUS_OK:") || t === "STATUS_OK") {
    const payload = t.startsWith("STATUS_OK:") ? t.slice("STATUS_OK:".length).trim() : "";
    const code = extractOtpCode(payload) ?? (payload || null);
    if (code) {
      return {
        status: "RECEIVED",
        code,
        message: payload && payload !== code ? payload : `Your verification code is ${code}`,
      };
    }
    return { status: "WAIT", code: null, message: null };
  }

  // Prior code available — surface it so the shop shows OTP immediately
  if (t.startsWith("STATUS_WAIT_RETRY:")) {
    const last = t.slice("STATUS_WAIT_RETRY:".length).trim();
    const code = extractOtpCode(last) ?? (last || null);
    if (code) {
      return {
        status: "RECEIVED",
        code,
        message: last && last !== code ? last : `Your verification code is ${code}`,
      };
    }
  }

  if (t.includes("STATUS_CANCEL")) {
    return { status: "CANCELLED", code: null, message: null };
  }

  // STATUS_WAIT_CODE / STATUS_WAIT_RESEND / STATUS_WAIT_RETRY (no code) / unknown
  return { status: "WAIT", code: null, message: null };
}

/** Parse Grizzly getStatusV2 JSON body. */
export function parseSaGetStatusV2Json(json: unknown): SmsStatus | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const obj = json as Record<string, unknown>;
  if (typeof obj.error === "string" || typeof obj.error_code === "string") return null;

  const sms = obj.sms;
  if (sms && typeof sms === "object" && !Array.isArray(sms)) {
    const cell = sms as Record<string, unknown>;
    const code =
      extractOtpCode(cell.code != null ? String(cell.code) : null) ??
      extractOtpCode(cell.text != null ? String(cell.text) : null);
    if (code) {
      const text = cell.text != null ? String(cell.text) : null;
      return {
        status: "RECEIVED",
        code,
        message: text || `Your verification code is ${code}`,
      };
    }
  }

  const call = obj.call;
  if (call && typeof call === "object" && !Array.isArray(call)) {
    const cell = call as Record<string, unknown>;
    const code =
      extractOtpCode(cell.code != null ? String(cell.code) : null) ??
      extractOtpCode(cell.text != null ? String(cell.text) : null);
    if (code) {
      return {
        status: "RECEIVED",
        code,
        message: `Your verification code is ${code}`,
      };
    }
  }

  return { status: "WAIT", code: null, message: null };
}

/** Match activation in getActiveActivations list by id. */
export function parseActiveActivationSms(
  json: unknown,
  providerOrderId: string,
): SmsStatus | null {
  const id = String(providerOrderId);
  let rows: unknown[] = [];
  if (Array.isArray(json)) rows = json;
  else if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.activeActivations)) rows = obj.activeActivations;
    else if (Array.isArray(obj.activations)) rows = obj.activations;
    else if (Array.isArray(obj.data)) rows = obj.data;
  }
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const aid = String(r.activationId ?? r.id ?? r.activation_id ?? "");
    if (aid !== id) continue;
    const code =
      extractOtpCode(r.smsCode != null ? String(r.smsCode) : null) ??
      extractOtpCode(r.code != null ? String(r.code) : null) ??
      extractOtpCode(r.smsText != null ? String(r.smsText) : null) ??
      extractOtpCode(r.text != null ? String(r.text) : null);
    if (code) {
      const text = r.smsText != null ? String(r.smsText) : null;
      return {
        status: "RECEIVED",
        code,
        message: text || `Your verification code is ${code}`,
      };
    }
    return { status: "WAIT", code: null, message: null };
  }
  return null;
}
