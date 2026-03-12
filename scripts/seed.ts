import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required");
  process.exit(1);
}

async function seed() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = "austin@merchmakers.com";
  const password = "testpassword123";

  // Check if user exists
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    console.log(`User ${email} already exists, skipping.`);
    return;
  }

  // Create via Supabase Auth
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Austin" },
    app_metadata: { role: "admin" },
  });

  if (error) {
    console.error("Failed to create user:", error);
    process.exit(1);
  }

  // Ensure public.users row exists with admin role
  await supabase.from("users").upsert({
    id: data.user.id,
    email,
    name: "Austin",
    role: "admin",
  });

  console.log(`Seeded admin user: ${email}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
