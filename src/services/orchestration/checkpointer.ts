import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { Pool } from "pg";

/**
 * AGENT 11 (IRONTECH) - THE CHECKPOINTER
 * Mandate: Provide immutable state persistence in PostgreSQL.
 */
export class IronTech {
  private static pool: Pool;
  private static checkpointer: PostgresSaver;

  static async getCheckpointer() {
    if (!this.checkpointer) {
      // Initialize the connection pool using your .env DATABASE_URL
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Supabase/AWS
      });

      this.checkpointer = new PostgresSaver(this.pool);

      // Physically create the checkpoint tables in Supabase if they don't exist
      await this.checkpointer.setup();
    }
    return this.checkpointer;
  }
}
