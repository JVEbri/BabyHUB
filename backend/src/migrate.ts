import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://babyhub:babyhub_local@localhost:5432/babyhub",
});
const migrations = `
CREATE TABLE IF NOT EXISTS cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rtsp_url TEXT NOT NULL,
  stream_name TEXT,
  sensor_device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE cameras ADD COLUMN IF NOT EXISTS sensor_device_id TEXT;
CREATE TABLE IF NOT EXISTS buttons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  interval_hours INTEGER,
  last_pressed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE buttons ADD COLUMN IF NOT EXISTS interval_hours INTEGER;
CREATE TABLE IF NOT EXISTS button_presses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  button_id UUID REFERENCES buttons(id) ON DELETE CASCADE,
  pressed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  low_stock_threshold INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('consume', 'restock')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  noise_level NUMERIC,
  temperature NUMERIC,
  humidity NUMERIC,
  camera_id UUID REFERENCES cameras(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;
async function runMigrations() {
  try {
    await pool.query(migrations);
    console.log("Migrations completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}
runMigrations();
