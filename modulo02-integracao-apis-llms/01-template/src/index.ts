import { createServer } from "./server.ts";
import { config } from "./config.ts";
import { OpenRouterService } from "./openrouterService.ts";

const routerService = new OpenRouterService(config);
const app = createServer(routerService);

await app.listen({ port: 3000 , host: '0.0.0.0' })
app.log.info(`Server is running on ${await app.addresses()}`)