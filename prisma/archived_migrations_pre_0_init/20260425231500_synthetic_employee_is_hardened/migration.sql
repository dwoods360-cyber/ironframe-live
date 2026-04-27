-- VIP hardening flag (PhishBot success model + lab invest action)
ALTER TABLE "SyntheticEmployee" ADD COLUMN "is_hardened" BOOLEAN NOT NULL DEFAULT false;
