import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  listBusinesses,
  getBusinessWithRelations,
  createBusiness,
  updateBusiness,
  getBusiness,
  getTenant,
  listCatalog,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  listFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  listPayments,
  type Business,
} from "@zapflow/firebase";
import { PLAN_LIMITS } from "@zapflow/shared";
import { requireAuth } from "../middleware/auth";

const businessBodyBase = z.object({
  name: z.string().min(2),
  type: z.enum(["BARBERSHOP", "SALON", "RESTAURANT", "DENTAL", "STORE", "OTHER"]),
  typeLabel: z.string().trim().min(2).max(60).optional().nullable(),
  phone: z.string().min(10),
  address: z.string().optional(),
  description: z.string().optional(),
  greetingMsg: z.string().optional(),
  awayMsg: z.string().optional(),
  workingHours: z.record(z.union([z.tuple([z.string(), z.string()]), z.null()])).optional(),
});

function requireOtherTypeLabel<T extends { type?: string; typeLabel?: string | null }>(
  data: T,
  ctx: z.RefinementCtx
) {
  if (data.type === "OTHER" && !data.typeLabel?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe o nome do tipo de negócio",
      path: ["typeLabel"],
    });
  }
}

const businessBody = businessBodyBase.superRefine(requireOtherTypeLabel);
const businessBodyPatch = businessBodyBase.partial().superRefine(requireOtherTypeLabel);

type BusinessBody = z.infer<typeof businessBodyBase>;

function normalizeBusinessBody(body: Partial<BusinessBody>): Partial<Business> {
  const next = { ...body } as Partial<Business>;
  if (next.type && next.type !== "OTHER") next.typeLabel = undefined;
  else if (next.typeLabel === null) next.typeLabel = undefined;
  else if (typeof next.typeLabel === "string") next.typeLabel = next.typeLabel.trim() || undefined;
  return next;
}

export async function businessRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/businesses", async (req) => listBusinesses(req.tenantId));

  app.post("/businesses", async (req, reply) => {
    const existing = await listBusinesses(req.tenantId);
    if (existing.length > 0) {
      return reply.status(409).send({ error: "Sua conta já possui um negócio cadastrado." });
    }
    const parsed = businessBody.parse(req.body);
    const business = await createBusiness(req.tenantId, {
      name: parsed.name,
      type: parsed.type,
      typeLabel: parsed.typeLabel ?? undefined,
      phone: parsed.phone,
      address: parsed.address,
      description: parsed.description,
      greetingMsg: parsed.greetingMsg ?? "Olá! Como posso ajudar?",
      awayMsg: parsed.awayMsg ?? "No momento estamos fechados. Em breve retornaremos!",
      workingHours: parsed.workingHours ?? {},
    });
    return reply.status(201).send(business);
  });

  app.get("/businesses/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const business = await getBusinessWithRelations(id, req.tenantId);
    if (!business) return reply.status(404).send({ error: "Not found" });
    return business;
  });

  app.put("/businesses/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = normalizeBusinessBody(businessBodyPatch.parse(req.body));
    const updated = await updateBusiness(id, req.tenantId, body);
    if (!updated) return reply.status(404).send({ error: "Not found" });
    return updated;
  });

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
    if (!(await getBusiness(id, req.tenantId))) return reply.status(404).send({ error: "Not found" });
    return listCatalog(id);
  });

  app.post("/businesses/:id/catalog", async (req, reply) => {
    const { id } = req.params as { id: string };
    const business = await getBusiness(id, req.tenantId);
    if (!business) return reply.status(404).send({ error: "Not found" });
    const tenant = await getTenant(req.tenantId);
    const plan = tenant?.plan ?? "STARTER";
    const limit = PLAN_LIMITS[plan].catalogItems;
    const currentItems = await listCatalog(id);
    if (Number.isFinite(limit) && currentItems.length >= limit) {
      return reply.status(403).send({ error: `Plano ${plan} permite até ${limit} itens no catálogo.` });
    }
    const body = catalogBody.parse(req.body);
    return reply.status(201).send(await createCatalogItem(id, body));
  });

  app.put("/businesses/:businessId/catalog/:itemId", async (req, reply) => {
    const { businessId, itemId } = req.params as { businessId: string; itemId: string };
    if (!(await getBusiness(businessId, req.tenantId))) return reply.status(404).send({ error: "Not found" });
    const body = catalogBody.partial().parse(req.body);
    const item = await updateCatalogItem(businessId, itemId, body);
    if (!item) return reply.status(404).send({ error: "Not found" });
    return item;
  });

  app.delete("/businesses/:businessId/catalog/:itemId", async (req, reply) => {
    const { businessId, itemId } = req.params as { businessId: string; itemId: string };
    if (!(await getBusiness(businessId, req.tenantId))) return reply.status(404).send({ error: "Not found" });
    await deleteCatalogItem(businessId, itemId);
    return reply.status(204).send();
  });

  const faqBody = z.object({
    question: z.string().min(5),
    answer: z.string().min(5),
    keywords: z.array(z.string()).min(1),
    active: z.boolean().default(true),
  });

  app.get("/businesses/:id/faqs", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await getBusiness(id, req.tenantId))) return reply.status(404).send({ error: "Not found" });
    return listFaqs(id);
  });

  app.post("/businesses/:id/faqs", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await getBusiness(id, req.tenantId))) return reply.status(404).send({ error: "Not found" });
    const body = faqBody.parse(req.body);
    return reply.status(201).send(await createFaq(id, body));
  });

  app.patch("/businesses/:businessId/faqs/:faqId", async (req, reply) => {
    const { businessId, faqId } = req.params as { businessId: string; faqId: string };
    if (!(await getBusiness(businessId, req.tenantId))) return reply.status(404).send({ error: "Not found" });
    const body = faqBody.partial().parse(req.body);
    const updated = await updateFaq(businessId, faqId, body);
    if (!updated) return reply.status(404).send({ error: "Not found" });
    return updated;
  });

  app.delete("/businesses/:businessId/faqs/:faqId", async (req, reply) => {
    const { businessId, faqId } = req.params as { businessId: string; faqId: string };
    if (!(await getBusiness(businessId, req.tenantId))) return reply.status(404).send({ error: "Not found" });
    await deleteFaq(businessId, faqId);
    return reply.status(204).send();
  });

  app.get("/businesses/:id/payments", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await getBusiness(id, req.tenantId))) return reply.status(404).send({ error: "Not found" });
    return listPayments(id);
  });
}
