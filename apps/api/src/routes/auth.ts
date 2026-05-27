import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createTenant, getTenant, getAdminAuth } from "@zapflow/firebase";
import { requireAuth } from "../middleware/auth";

const syncBody = z.object({
  name: z.string().min(2).optional(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/sync", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const body = syncBody.parse(req.body ?? {});
      let tenant = await getTenant(req.tenantId);
      if (tenant) return tenant;

      let email = req.tenantEmail;
      if (!email) {
        const user = await getAdminAuth().getUser(req.tenantId);
        email = user.email;
      }
      if (!email) {
        return reply.status(400).send({ error: "E-mail não encontrado na conta Firebase" });
      }

      tenant = await createTenant(req.tenantId, {
        name: body.name ?? email.split("@")[0] ?? "Usuário",
        email,
      });
      return reply.status(201).send(tenant);
    } catch (err) {
      req.log.error({ err }, "auth/sync failed");
      return reply.status(500).send({ error: "Erro ao sincronizar perfil no servidor" });
    }
  });

  app.get("/auth/me", { preHandler: requireAuth }, async (req) => {
    const tenant = await getTenant(req.tenantId);
    if (!tenant) return { id: req.tenantId, name: "", email: req.tenantEmail ?? "", plan: "STARTER" as const };
    return { id: tenant.id, name: tenant.name, email: tenant.email, plan: tenant.plan };
  });
}
