import fs from "fs";
import { createClient } from "@supabase/supabase-js";

function parseEnvFile(path) {
  const text = fs.readFileSync(path, "utf8");
  return text
    .split(/\n/)
    .filter((line) => line && !line.startsWith("#"))
    .reduce((acc, line) => {
      const [key, ...rest] = line.split("=");
      acc[key.trim()] = rest.join("=").trim();
      return acc;
    }, {});
}

const env = parseEnvFile(".env");
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function normalizeTable(tableName, columnName) {
  console.log(`Scanning ${tableName}.${columnName}...`);

  const { data, error } = await supabase.from(tableName).select(`id,${columnName}`);
  if (error) {
    throw new Error(`Error loading ${tableName}: ${error.message}`);
  }

  const rows = data || [];
  const updates = [];

  for (const row of rows) {
    const original = row[columnName];
    if (typeof original !== "string") continue;
    const normalized = original.trim().toLowerCase();
    if (normalized && normalized !== original) {
      updates.push({ id: row.id, [columnName]: normalized });
    }
  }

  if (updates.length === 0) {
    console.log(`No ${tableName} ${columnName} values required normalization.`);
    return;
  }

  console.log(`Normalizing ${updates.length} rows in ${tableName}...`);

  for (const update of updates) {
    const { id, ...payload } = update;
    const { error: updateError } = await supabase
      .from(tableName)
      .update(payload)
      .eq("id", id);

    if (updateError) {
      console.error(`Failed to update row ${id} in ${tableName}:`, updateError.message);
    }
  }

  console.log(`Finished normalizing ${tableName}.${columnName}.`);
}

try {
  await normalizeTable("children", "parent_email");
  await normalizeTable("assignments", "parent_email");
  console.log("Parent email normalization complete.");
} catch (error) {
  console.error(error);
  process.exit(1);
}
