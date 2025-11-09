import http from "http";

import { createApp } from "./app.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { registerChatGateway } from "./websocket/chatGateway.js";

const app = createApp();
const server = http.createServer(app);

registerChatGateway(server);

server.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT}`);
});
