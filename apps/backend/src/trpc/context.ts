import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../db";

export function createContext({ req, res }: { req: FastifyRequest; res: FastifyReply }) {
  return { prisma, req, res };
}

export type Context = ReturnType<typeof createContext>;
