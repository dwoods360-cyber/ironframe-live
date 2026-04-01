-- Ironlock auto-quarantine: distinct ThreatEvent state for DMZ / malicious Irongate verdict
ALTER TYPE "ThreatState" ADD VALUE 'QUARANTINED';
