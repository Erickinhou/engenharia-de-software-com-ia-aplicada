import { type GraphState } from "../graph.ts";

export function fallbackNode(_state: GraphState): Partial<GraphState> {
    return {
        output: "Unknown command. Try 'make this uppercase' or 'convert to lowercase'",
    }
}