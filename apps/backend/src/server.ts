import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  DecodeRequestSchema,
  GenerateRequestSchema,
} from "@linkedin-translator/shared";
import { env } from "./env.js";
import { decodePost } from "./graphs/decoder.js";
import { generatePost } from "./graphs/generator.js";

const app = Fastify({
  logger: {
    transport:
      process.env.NODE_ENV === "production"
        ? undefined
        : { target: "pino-pretty", options: { colorize: true } },
  },
});

await app.register(cors, { origin: true });

app.get("/api/health", async () => ({
  ok: true,
  provider: env.provider,
  model: env.model,
  webSearch: env.enableWebSearch,
}));

app.post("/api/decode", async (request, reply) => {
  const parsed = DecodeRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
  }
  try {
    const result = await decodePost(parsed.data.text);
    return result;
  } catch (err) {
    request.log.error(err);
    return reply
      .status(502)
      .send({ error: "Failed to decode post.", details: messageOf(err) });
  }
});

app.post("/api/generate", async (request, reply) => {
  const parsed = GenerateRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
  }
  try {
    const result = await generatePost(parsed.data);
    return result;
  } catch (err) {
    request.log.error(err);
    return reply
      .status(502)
      .send({ error: "Failed to generate post.", details: messageOf(err) });
  }
});

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

app
  .listen({ port: env.port, host: "0.0.0.0" })
  .then(() =>
    app.log.info(
      `LinkedIn Translator API on :${env.port} (provider: ${env.provider}, model: ${env.model})`,
    ),
  )
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
