-- Sprint 6.9: Remote tech queue + remote access authorization flag
ALTER TYPE "ThreatState" ADD VALUE 'PENDING_REMOTE_INTERVENTION';

ALTER TABLE "ThreatEvent" ADD COLUMN "remoteAccessAuthorized" BOOLEAN NOT NULL DEFAULT false;
