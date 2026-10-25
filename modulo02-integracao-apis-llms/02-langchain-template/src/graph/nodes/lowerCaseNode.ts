import { type GraphState } from "../graph.ts";

export function lowerCaseNode(state: GraphState): Partial<GraphState> {
    return {
        output: state.output.toLowerCase(),
    }
}