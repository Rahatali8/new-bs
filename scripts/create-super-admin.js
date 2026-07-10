const fs = require("fs")
const path = require("path")
const bcrypt = require("bcryptjs")
const { createClient } = require("@supabase/supabase-js")

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local")
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "")
    }
  }
}

async function main() {
  const [email, password, name] = process.argv.slice(2)

  if (!email || !password) {
    console.error("Usage: node scripts/create-super-admin.js <email> <password> [name]")
    process.exit(1)
  }
  if (password.length < 6) {
    console.error("Password must be at least 6 characters")
    process.exit(1)
  }

  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error("Supabase credentials missing — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }

  const supabase = createClient(url, key)
  const passwordHash = await bcrypt.hash(password, 10)
  const cleanEmail = email.toLowerCase().trim()

  const { data: existing } = await supabase.from("admins").select("id").eq("email", cleanEmail).maybeSingle()

  let error
  if (existing) {
    ;({ error } = await supabase
      .from("admins")
      .update({ password_hash: passwordHash, name: name || null, is_active: true })
      .eq("id", existing.id))
  } else {
    ;({ error } = await supabase
      .from("admins")
      .insert({ email: cleanEmail, password_hash: passwordHash, name: name || null, is_active: true }))
  }

  if (error) {
    console.error("Failed:", error.message)
    process.exit(1)
  }

  console.log(existing ? "SuperAdmin password updated!" : "SuperAdmin created!")
  console.log("")
  console.log("Login at:  /admin/login")
  console.log("Email:    ", cleanEmail)
  console.log("Password: ", password)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
