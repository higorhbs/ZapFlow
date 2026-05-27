import { FastifyInstance } from "fastify";
import { getBusiness, getAnalytics } from "@zapflow/firebase";
import { requireAuth } from "../middleware/auth";

export async function analyticsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/businesses/:id/analytics", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await getBusiness(id, req.tenantId))) return reply.status(404).send({ error: "Not found" });
    return getAnalytics(id);
  });
}
