import {
    END,
    MessagesZodMeta,
    START,
    StateGraph,
} from '@langchain/langgraph'
import { withLangGraph } from '@langchain/langgraph/zod'
import { BaseMessage } from 'langchain'
import { z } from 'zod/v3'
import { chatResponseNode } from './nodes/chatResponseNode.ts'
import { identifyIntent } from './nodes/identifyIntentNode.ts'
import { lowerCaseNode } from './nodes/lowerCaseNode.ts'
import { upperCaseNode } from './nodes/upperCaseNode.ts'
import { fallbackNode } from './nodes/fallbackNode.ts'


const GraphStateSchema = z.object({
    // This is the new
    messages: withLangGraph( 
        z.custom<BaseMessage[]>(),
        MessagesZodMeta
    ),
    output: z.string(),
    command: z.enum(['uppercase', 'lowercase', 'unknown'])
})

export type GraphState = z.infer<typeof GraphStateSchema>

export function buildGraph() {
    const workflow = new StateGraph(GraphStateSchema)
    .addNode('identifyIntent', identifyIntent)
    .addNode('lowercase', lowerCaseNode)
    .addNode('uppercase', upperCaseNode)
    .addNode('fallback', fallbackNode)
    .addNode('chatResponse', chatResponseNode)
    .addEdge(START, "identifyIntent")
    .addConditionalEdges("identifyIntent", ({command}) => {
        switch (command) {
            case "uppercase":
                return 'uppercase'
            case "lowercase":
                return "lowercase"
            default:
                return "fallback"
        }
    },  {
        "uppercase": "uppercase",
        "lowercase": "lowercase",
        "fallback": "fallback",
    })
    .addEdge("uppercase", "chatResponse")
    .addEdge("lowercase", "chatResponse")
    .addEdge("fallback", "chatResponse")
    .addEdge("chatResponse", END)

    return workflow.compile();
}