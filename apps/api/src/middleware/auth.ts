import { FastifyRequest, FastifyReply } from "fastify";
import { getAdminAuth } from "@zapflow/firebase";

declare module "fastify" {
  interface FastifyRequest {
    tenantId: string;
    tenantEmail?: string;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    request.tenantId = decoded.uid;
    request.tenantEmail = decoded.email;
  } catch (err) {
    request.log.warn({ err }, "verifyIdToken failed");
    return reply.status(401).send({ error: "Token inválido ou API sem credencial Firebase Admin" });
  }
}
