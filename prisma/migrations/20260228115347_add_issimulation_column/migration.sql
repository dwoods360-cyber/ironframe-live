-- Add isSimulation as lowercase column (PostgreSQL default); Prisma schema uses @map("issimulation")
ALTER TABLE "active_risks" ADD COLUMN IF NOT EXISTS issimulation BOOLEAN NOT NULL DEFAULT false;
