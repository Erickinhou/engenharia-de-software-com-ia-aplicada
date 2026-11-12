import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.ts';
import { professionals } from '../src/services/appointmentService.ts';

const app = createServer();

async function makeARequest(question: string) {
    return await app.inject({
        method: 'POST',
        url: '/chat',
        payload: {
            question,
        },
    });
}

describe('Medical Appointment System - E2E Tests', async () => {

    it('Schedule appointment - Success', async () => {
        const response = await makeARequest(
            `Olá, sou Maria Santos e quero agendar uma consulta com ${professionals.at(0)?.name} Dr. Alicio da Silva para amanhã às 16h para um check-up regular`
        )

        console.log('Schedule Success Response:', response.body);

        assert.equal(response.statusCode, 200);
        const body = JSON.parse(response.body);
        assert.equal(body.intent, 'schedule');
        // assert.equal(body.success, true);
    });

    it('Should not Schedule appointment in same datetime - Reject', async () => {
        const response = await makeARequest(
            `Olá, sou Maria Santos e quero agendar uma consulta com ${professionals.at(1)?.name} Dr. Alicio da Silva para amanhã às 16h para um check-up regular`
        )
        const response2 = await makeARequest(
            `Olá, me chamo Maria Santos, quero agendar uma consulta com ${professionals.at(1)?.name} Dr. Alicio da Silva no dia seguinte a que estou falando, às 16h pra olhar o esôfago`
        )

        console.log('Schedule Success Response:', response.body);

        assert.equal(response2.statusCode, 200);
        const body = JSON.parse(response2.body);
        assert.equal(body.actionSuccess, false);
        assert.equal(body.actionError, "Horário indisponível para este profissional");
        // assert.equal(body.intent, 'schedule');
        // assert.equal(body.success, true);
    });


    it('Cancel appointment - Success', async () => {

        await makeARequest(
            `Sou Joao da Silva e quero agendar uma consulta com ${professionals.at(1)?.name} para hoje às 14h`
        )

        const response = await makeARequest(
            `Cancele minha consulta com ${professionals.at(1)?.name} que tenho hoje às 14h, me chamo Joao da Silva`
        );

        console.log('Cancel Success Response:', response.body);

        assert.equal(response.statusCode, 200);
        // const body = JSON.parse(response.body);
        // assert.equal(body.intent, 'cancel');
        // assert.equal(body.success, true);
    });
});
