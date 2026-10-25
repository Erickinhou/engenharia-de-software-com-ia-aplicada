import { type GraphState } from "../graph.ts";

export function upperCaseNode(state: GraphState): Partial<GraphState> {
    return {
        output: state.output.toUpperCase(),
    }
}