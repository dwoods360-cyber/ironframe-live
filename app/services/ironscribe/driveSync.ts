import "server-only";

import {
  IRONSCRIBE_DRIVE_DEFAULT_FOLDER,
  IRONSCRIBE_DRIVE_MIRROR_PATH as IRONSCRIBE_DRIVE_MIRROR_PATH_CONFIG,
} from "@/app/config/industryScoutFeeds";

export type DriveSyncResult = {
  ok: boolean;
  folder: string;
  mirrorPath: string;
  filesScanned: number;
  newlyIngested: number;
  errors: string[];
};

/**
 * Ironscribe Drive sync — monitor mirrored Governance/Regulations folder (or local drive-inbox).
 * Set IRONSCRIBE_DRIVE_MIRROR_PATH to sync from Google Drive desktop / rclone mount.
 */
export async function runIronscribeDriveSync(): Promise<DriveSyncResult> {
  // Serverless-safe noop: Drive mirroring now runs outside the API runtime.
  // This endpoint stays deterministic and memory-only in App Router cron execution.
  return {
    ok: true,
    folder: IRONSCRIBE_DRIVE_DEFAULT_FOLDER,
    mirrorPath: `memory://${IRONSCRIBE_DRIVE_MIRROR_PATH_CONFIG.replace(/^\/+/, "")}`,
    filesScanned: 0,
    newlyIngested: 0,
    errors: [],
  };
}
