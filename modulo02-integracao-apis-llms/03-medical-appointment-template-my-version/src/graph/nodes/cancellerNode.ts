import z from 'zod/v4';
import type { GraphState } from '../graph.ts';
import { AppointmentService } from '../../services/appointmentService.ts';

const CancelRequiredFieldsSchema = z.object({
  professionalId: z.number({ error: 'Professional ID is required' }),
  datetime: z.string({ error: 'Appointment datetime is required' }),
  patientName: z.string({ error: 'Patient name is required' }),
});

export function createCancellerNode(appointmentService: AppointmentService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {

    try {
      console.log(`❌ Cancelling appointment...`);

      const validation = CancelRequiredFieldsSchema.safeParse(state)
      if (validation.error) {
        const errorMessage = validation.error.message;
        console.log(`⚠️  Validation failed: ${errorMessage}`);
        return {
          actionSuccess: false,
          actionError: errorMessage,
        }
      }

      appointmentService.cancelAppointment(
        validation.data.professionalId,
        validation.data.patientName,
        new Date(validation.data.datetime)
      )

      return {
        actionSuccess: true,
      };
    } catch (error) {
      console.log(`❌ Cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        ...state,
        actionSuccess: false,
        actionError: error instanceof Error ? error.message : 'Cancellation failed',
      };
    }
  };
}
