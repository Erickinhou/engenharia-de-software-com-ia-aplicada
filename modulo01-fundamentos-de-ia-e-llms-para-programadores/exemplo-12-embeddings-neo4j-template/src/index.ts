import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { CONFIG } from "./config.ts";
import { DocumentProcessor } from "./documentProcessor.ts"
import { type PretrainedOptions } from "@huggingface/transformers";
import { Neo4jVectorStore } from "@langchain/community/vectorstores/neo4j_vector";
import { displayResults } from "./util.ts";

let _neo4jVectorStore = null;


async function clearAll(vectorStore: Neo4jVectorStore, nodeLabel: string){

  console.log("🗑️ Removing all documents existing");
  
  
  await vectorStore.query(
    `MATCH (n:\`${nodeLabel}\`)DETACH DELETE n`
  )
  
  console.log("remove with success");
}

try {

  console.log("Starting embedding system with neo4j...\n");
  
  const documentProcessor =  new DocumentProcessor(
    CONFIG.pdf.path,
    CONFIG.textSplitter,
  );

  const documents = await documentProcessor.loadAndSplit();
  const embeddings = new HuggingFaceTransformersEmbeddings({
    model: CONFIG.embedding.modelName,
    pretrainedOptions: CONFIG.embedding.pretrainedOptions as PretrainedOptions
  })
  // Just for testing purpose
  // const response = await embeddings.embedQuery("javascript")
  // console.log(response)
  _neo4jVectorStore = await Neo4jVectorStore.fromExistingGraph(
    embeddings,
    CONFIG.neo4j
  )

  clearAll(_neo4jVectorStore, CONFIG.neo4j.nodeLabel)

  for (const [index, doc] of documents.entries()) {
    console.log(`✅ Adding document ${index + 1}/${documents.length}`)
    await _neo4jVectorStore.addDocuments([doc])
  }

  console.log("\n Database populated with success")

  // ==================== STEP 2: RUN SIMILARITY SEARCH ====================
  console.log("🔍 ETAPA 2: Executando buscas por similaridade...\n");

  const questions = ["O que é normalização de dados e porque ela é necessária?" ]

  for (const question of questions) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Question: ${question}`);
    console.log('='.repeat(80));

    const results = await _neo4jVectorStore.similaritySearch(question, CONFIG.similarity.topK)

    displayResults(results)

  }

}
catch (err) {
 console.error("Some error occur", err);
} finally {
  await _neo4jVectorStore?.close()
}