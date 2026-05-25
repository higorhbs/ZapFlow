import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@zapflow/database";
import { requireAuth } from "../middleware/auth";

const businessBody = z.object({
  name: z.string().min(2),
  type: z.enum(["BARBERSHOP", "SALON", "RESTAURANT", "DENTAL", "STORE", "OTHER"]),
  phone: z.string().min(10),
  address: z.string().optional(),
  description: z.string().optional(),
  greetingMsg: z.string().optional(),
  awayMsg: z.string().optional(),
  workingHours: z.record(z.union([z.tuple([z.string(), z.string()]), z.null()])).optional(),
});

export async function businessRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/businesses", async (req) => {
    return prisma.business.findMany({ where: { tenantId: req.tenantId } });
  });

  app.post("/businesses", async (req, reply) => {
    const body = businessBody.parse(req.body);
    const business = await prisma.business.create({
      data: { ...body, tenantId: req.tenantId },
    });
    return reply.status(201).send(business);
  });

  app.get("/businesses/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const business = await prisma.business.findFirst({
      where: { id, tenantId: req.tenantId },
      include: { catalog: true, faqs: true, autoReplies: true },
    });
    if (!business) return reply.status(404).send({ error: "Not found" });
    return business;
  });

  app.put("/businesses/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = businessBody.partial().parse(req.body);
    const exists = await prisma.business.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!exists) return reply.status(404).send({ error: "Not found" });

    return prisma.business.update({ where: { id }, data: body });
  });

  // ─── Catalog ────────────────────────────────────────────────────────────────

  const catalogBody = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().positive(),
    imageUrl: z.string().url().optional(),
    available: z.boolean().default(true),
    sortOrder: z.number().default(0),
  });

  app.get("/businesses/:id/catalog", async (req, reply) => {
    const { id } = req.params as { id: string };
    const exists = await prisma.business.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!exists) return reply.status(404).send({ error: "Not found" });
    return prisma.catalogItem.findMany({ where: { businessId: id }, orderBy: { sortOrder: "asc" } });
  });

  app.post("/businesses/:id/catalog", async (req, reply) => {
    const { id } = req.params as { id: string };
    const exists = await prisma.business.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!exists) return reply.status(404).send({ error: "Not found" });
    const body = catalogBody.parse(req.body);
    return reply.status(201).send(await prisma.catalogItem.create({ data: { ...body, businessId: id } }));
  });

  app.put("/businesses/:businessId/catalog/:itemId", async (req, reply) => {
    const { businessId, itemId } = req.params as { businessId: string; itemId: string };
    const exists = await prisma.business.findFirst({ where: { id: businessId, tenantId: req.tenantId } });
    if (!exists) return reply.status(404).send({ error: "Not found" });
    const body = catalogBody.partial().parse(req.body);
    return prisma.catalogItem.update({ where: { id: itemId }, data: body });
  });

  app.delete("/businesses/:businessId/catalog/:itemId", async (req, reply) => {
    const { businessId, itemId } = req.params as { businessId: string; itemId: string };
    const exists = await prisma.business.findFirst({ where: { id: businessId, tenantId: req.tenantId } });
    if (!exists) return reply.status(404).send({ error: "Not found" });
    await prisma.catalogItem.delete({ where: { id: itemId } });
    return reply.status(204).send();
  });

  // ─── FAQ ────────────────────────────────────────────────────────────────────

  const faqBody = z.object({
    question: z.string().min(5),
    answer: z.string().min(5),
    keywords: z.array(z.string()).min(1),
    active: z.boolean().default(true),
  });

  app.get("/businesses/:id/faqs", async (req, reply) => {
    const { id } = req.params as { id: string };
    const exists = await prisma.business.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!exists) return reply.status(404).send({ error: "Not found" });
    return prisma.fAQ.findMany({ where: { businessId: id }, orderBy: { sortOrder: "asc" } });
  });

  app.post("/businesses/:id/faqs", async (req, reply) => {
    const { id } = req.params as { id: string };
    const exists = await prisma.business.findFirst({ where: { id, tenantId: req.tenantId } });
    if (!exists) return reply.status(404).send({ error: "Not found" });
    const body = faqBody.parse(req.body);
    return reply.status(201).send(await prisma.fAQ.create({ data: { ...body, businessId: id } }));
  });

  app.delete("/businesses/:businessId/faqs/:faqId", async (req, reply) => {
    const { businessId, faqId } = req.params as { businessId: string; faqId: string };
    const exists = await prisma.business.findFirst({ where: { id: businessId, tenantId: req.tenantId } });
    if (!exists) return reply.status(404).send({ error: "Not found" });
    await prisma.fAQ.delete({ where: { id: faqId } });
    return reply.status(204).send();
  });
}
