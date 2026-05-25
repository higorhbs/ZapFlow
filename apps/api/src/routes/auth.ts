import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@zapflow/database";

const registerBody = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const body = registerBody.parse(req.body);

    const exists = await prisma.tenant.findUnique({ where: { email: body.email } });
    if (exists) return reply.status(409).send({ error: "E-mail já cadastrado" });

    const passwordHash = await bcrypt.hash(body.password, 12);
    const tenant = await prisma.tenant.create({
      data: { name: body.name, email: body.email, passwordHash },
    });

    const token = app.jwt.sign({ tenantId: tenant.id }, { expiresIn: "30d" });
    return { token, tenant: { id: tenant.id, name: tenant.name, email: tenant.email, plan: tenant.plan } };
  });

  app.post("/auth/login", async (req, reply) => {
    const body = loginBody.parse(req.body);

    const tenant = await prisma.tenant.findUnique({ where: { email: body.email } });
    if (!tenant) return reply.status(401).send({ error: "Credenciais inválidas" });

    const valid = await bcrypt.compare(body.password, tenant.passwordHash);
    if (!valid) return reply.status(401).send({ error: "Credenciais inválidas" });

    const token = app.jwt.sign({ tenantId: tenant.id }, { expiresIn: "30d" });
    return { token, tenant: { id: tenant.id, name: tenant.name, email: tenant.email, plan: tenant.plan } };
  });

  app.get("/auth/me", { preHandler: [async (req, rep) => { try { const p = await req.jwtVerify<{tenantId:string}>(); (req as any).tenantId = p.tenantId; } catch { rep.status(401).send({ error: "Unauthorized" }); } }] }, async (req) => {
    const tenant = await prisma.tenant.findUnique({ where: { id: (req as any).tenantId } });
    return { id: tenant!.id, name: tenant!.name, email: tenant!.email, plan: tenant!.plan };
  });
}
