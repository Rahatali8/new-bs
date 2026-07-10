import crypto from "crypto"

// HMAC-signed cookie values: base64url(json) + "." + base64url(hmac-sha256)
// Prevents anyone from forging a session by hand-crafting the cookie.

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error("Set SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY) to sign session cookies")
  }
  return secret
}

export function signSessionValue(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url")
  const signature = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function verifySessionValue<T>(value: string): T | null {
  const dotIndex = value.lastIndexOf(".")
  if (dotIndex <= 0) return null

  const payload = value.slice(0, dotIndex)
  const signature = value.slice(dotIndex + 1)

  const expected = crypto.createHmac("sha256", getSecret()).update(payload).digest()
  let given: Buffer
  try {
    given = Buffer.from(signature, "base64url")
  } catch {
    return null
  }

  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T
  } catch {
    return null
  }
}
