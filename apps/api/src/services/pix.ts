import axios from "axios";

const asaas = axios.create({
  baseURL: process.env.ASAAS_BASE_URL ?? "https://sandbox.asaas.com/api/v3",
  headers: {
    access_token: process.env.ASAAS_API_KEY ?? "",
    "Content-Type": "application/json",
  },
});

export interface PixChargeInput {
  customerName: string;
  customerPhone: string;
  description: string;
  amount: number;
  dueDate?: string; // YYYY-MM-DD
  externalRef?: string;
}

export interface PixChargeResult {
  asaasId: string;
  pixQrCode: string;
  pixCopyPaste: string;
  amount: number;
  status: string;
}

export async function createPixCharge(input: PixChargeInput): Promise<PixChargeResult> {
  // 1. Cria ou busca cliente na Asaas
  const cpfCnpj = "00000000000"; // MVP: sem CPF real, use o do cliente depois
  let customerId: string;

  try {
    const existing = await asaas.get(`/customers?mobilePhone=${input.customerPhone.replace(/\D/g, "")}`);
    if (existing.data.data?.length > 0) {
      customerId = existing.data.data[0].id;
    } else {
      const created = await asaas.post("/customers", {
        name: input.customerName,
        mobilePhone: input.customerPhone.replace(/\D/g, ""),
        cpfCnpj,
      });
      customerId = created.data.id;
    }
  } catch {
    // fallback: cria sem validação
    const created = await asaas.post("/customers", {
      name: input.customerName,
      mobilePhone: input.customerPhone.replace(/\D/g, ""),
      cpfCnpj,
    });
    customerId = created.data.id;
  }

  // 2. Cria cobrança PIX
  const dueDate = input.dueDate ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const charge = await asaas.post("/payments", {
    customer: customerId,
    billingType: "PIX",
    value: input.amount,
    dueDate,
    description: input.description,
    externalReference: input.externalRef,
  });

  const chargeId = charge.data.id;

  // 3. Busca QR Code
  const qrRes = await asaas.get(`/payments/${chargeId}/pixQrCode`);

  return {
    asaasId: chargeId,
    pixQrCode: qrRes.data.encodedImage,     // base64
    pixCopyPaste: qrRes.data.payload,        // copia e cola
    amount: input.amount,
    status: charge.data.status,
  };
}

export async function checkPixStatus(asaasId: string): Promise<string> {
  const res = await asaas.get(`/payments/${asaasId}`);
  return res.data.status; // PENDING | RECEIVED | OVERDUE | REFUNDED
}
