import { PrismaCheckpointer } from "@/lib/orchestration/prismaCheckpointer";

/**
 * AGENT 11 (IRONTECH) - THE CHECKPOINTER
 * Mandate: Provide immutable state persistence in PostgreSQL.
 */
export class IronTech {
  private static checkpointer: PrismaCheckpointer;

  static async getCheckpointer() {
    if (!this.checkpointer) {
      this.checkpointer = new PrismaCheckpointer();
    }
    return this.checkpointer;
  }
}
