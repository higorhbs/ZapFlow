import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@zapflow/database";

declare module "fastify" {
  interface FastifyRequest {
    tenantId: string;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<{ tenantId: string }>();
    request.tenantId = payload.tenantId;
  } catch {
    reply.status(401).send({ error: "Unauthorized" });
  }
}
