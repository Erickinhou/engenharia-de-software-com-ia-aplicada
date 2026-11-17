import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'
import { PostgresStore } from '@langchain/langgraph-checkpoint-postgres/store'
import { config } from '../config.ts';

export type MemoryService = {
  checkpointer: PostgresSaver
  store: PostgresStore
}

export async function createMemoryService(): Promise<MemoryService> {
  const dbUri = config.memory.dbUri;
  const [store, checkpointer] = [PostgresStore.fromConnString(dbUri), PostgresSaver.fromConnString(dbUri)]
  await Promise.all([store.setup(), checkpointer.setup()])

  console.log("✅ Memória configurada com sucesso: PostgreSQL");

  return {
    checkpointer,
    store
  }
}