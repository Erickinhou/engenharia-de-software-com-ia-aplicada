import { AIMessage } from "langchain";
import { type GraphState } from "../graph.ts";

export function chatResponseNode(state: GraphState): Partial<GraphState> {
    return {
        messages: [new AIMessage(state.output)],
    }
}