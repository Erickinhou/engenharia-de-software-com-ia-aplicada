import { config } from '../config.ts';
import { AppointmentService } from '../services/appointmentService.ts';
import { LlmService } from '../services/openRouterServices.ts';
import { buildAppointmentGraph } from './graph.ts';

export function buildGraph() {
  const llmClient = new LlmService(config)
  const appointmentService = new AppointmentService();
  return buildAppointmentGraph(
    llmClient,
    appointmentService
  );
}

export const graph = async () => {
  return buildGraph();
};