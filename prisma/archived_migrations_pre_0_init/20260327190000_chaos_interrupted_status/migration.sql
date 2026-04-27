-- Irontech: transient AgentOperation status when Ironchaos poisons an attempt
ALTER TYPE "AgentOperationStatus" ADD VALUE 'CHAOS_INTERRUPTED';
