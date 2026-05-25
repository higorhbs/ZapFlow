import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@zapflow/database";
import { requireAuth } from "../middleware/auth";

export async function appointmentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/businesses/:id/appointments", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { from, to, status } = req.query as Record<string, string>;
    const business = await prisma.business.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!business) return reply.status(404).send({ error: "Not found" });

    return prisma.appointment.findMany({
      where: {
        businessId: id,
        ...(status ? { status: status as any } : {}),
        ...(from || to
          ? {
              scheduledAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { scheduledAt: "asc" },
    });
  });

  const patchBody = z.object({
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]).optional(),
    scheduledAt: z.string().datetime().optional(),
    notes: z.string().optional(),
  });

  app.patch("/businesses/:businessId/appointments/:appointmentId", async (req, reply) => {
    const { businessId, appointmentId } = req.params as { businessId: string; appointmentId: string };
    const business = await prisma.business.findFirst({ where: { id: businessId, tenantId: req.tenantId } });
    if (!business) return reply.status(404).send({ error: "Not found" });

    const body = patchBody.parse(req.body);
    return prisma.appointment.update({ where: { id: appointmentId }, data: body });
  });
}
