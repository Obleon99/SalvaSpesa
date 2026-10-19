import Fastify from "fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/context";

const server = Fastify({ logger: true });

server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: { router: appRouter, createContext },
});

const port = Number(process.env.PORT ?? 4000);

server
  .listen({ port })
  .then(() => server.log.info(`backend listening on :${port}`))
  .catch((err) => {
    server.log.error(err);
    process.exit(1);
  });
