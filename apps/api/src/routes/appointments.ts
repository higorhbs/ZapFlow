import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getBusiness, listAppointments, updateAppointment, type AppointmentStatus } from "@zapflow/firebase";
import { requireAuth } from "../middleware/auth";

export async function appointmentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/businesses/:id/appointments", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { from, to, status } = req.query as Record<string, string>;
    if (!(await getBusiness(id, req.tenantId))) return reply.status(404).send({ error: "Not found" });
    return listAppointments(id, {
      from,
      to,
      status: status as AppointmentStatus | undefined,
    });
  });

  const patchBody = z.object({
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]).optional(),
    scheduledAt: z.string().datetime().optional(),
    notes: z.string().optional(),
  });

  app.patch("/businesses/:businessId/appointments/:appointmentId", async (req, reply) => {
    const { businessId, appointmentId } = req.params as { businessId: string; appointmentId: string };
    if (!(await getBusiness(businessId, req.tenantId))) return reply.status(404).send({ error: "Not found" });
    const body = patchBody.parse(req.body);
    const updated = await updateAppointment(businessId, appointmentId, body);
    if (!updated) return reply.status(404).send({ error: "Not found" });
    return updated;
  });
}
