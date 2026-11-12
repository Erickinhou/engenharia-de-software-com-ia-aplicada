import z from 'zod/v4';
import type { GraphState } from '../graph.ts';
import { AppointmentService } from '../../services/appointmentService.ts';



const SchedulerRequiredFieldsSchema = z.object({
  professionalId: z.number({ error : 'Professional Id required' }),
  datetime: z.string({ error : 'Datetime is required' }),
  patientName: z.string({ error : 'Name is required' })
})


export function createSchedulerNode( appointmentService: AppointmentService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    console.log(`📅 Scheduling appointment...`);

    try {
      const validation = SchedulerRequiredFieldsSchema.safeParse(state)

      if(!validation.success){
        const errorMessage = validation.error.message
        console.log(`Validation failed -> ${errorMessage}`)
        return {
          actionError: errorMessage,
          actionSuccess: false
        }
      }
      const appointment = appointmentService.bookAppointment(
        validation.data.professionalId,
        new Date(validation.data.datetime),
        validation.data.patientName,
        state.reason ?? 'general consultation'
      )

      console.log(`✅ Appointment scheduled successfully`);

      return {
        ...state,
        actionSuccess: true,
        appointmentData: appointment
      };
    } catch (error) {
      console.log(`❌ Scheduling failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        ...state,
        actionSuccess: false,
        actionError: error instanceof Error ? error.message : 'Scheduling failed',
      };
    }
  };
}
