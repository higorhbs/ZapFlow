import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Tenant demo
  const tenant = await prisma.tenant.upsert({
    where: { email: "demo@zapflow.com.br" },
    update: {},
    create: {
      name: "João Silva",
      email: "demo@zapflow.com.br",
      passwordHash: await bcrypt.hash("demo1234", 12),
      plan: "PRO",
      planStatus: "ACTIVE",
    },
  });

  // Negócio demo
  const business = await prisma.business.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: "+5511999990000" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Barbearia do João",
      type: "BARBERSHOP",
      phone: "+5511999990000",
      address: "Rua das Flores, 123 - São Paulo/SP",
      description: "A melhor barbearia do bairro!",
      greetingMsg: "Olá {nome}! Bem-vindo à {negocio} ✂️ Como posso ajudar?",
      awayMsg: "Olá! No momento estamos fechados. Funcionamos Seg-Sex 9h-19h e Sáb 9h-15h. Em breve retornaremos!",
      workingHours: {
        mon: ["09:00", "19:00"],
        tue: ["09:00", "19:00"],
        wed: ["09:00", "19:00"],
        thu: ["09:00", "19:00"],
        fri: ["09:00", "19:00"],
        sat: ["09:00", "15:00"],
        sun: null,
      },
    },
  });

  // Catálogo
  const catalogItems = [
    { name: "Corte Masculino", description: "Tesoura ou máquina, inclui lavagem", price: 45, sortOrder: 1 },
    { name: "Corte + Barba", description: "Combo completo com hidratação", price: 65, sortOrder: 2 },
    { name: "Barba", description: "Modelagem e finalização", price: 30, sortOrder: 3 },
    { name: "Corte Infantil", description: "Até 12 anos", price: 35, sortOrder: 4 },
    { name: "Sobrancelha", description: "Alinhamento com gilete", price: 15, sortOrder: 5 },
  ];

  for (const item of catalogItems) {
    await prisma.catalogItem.upsert({
      where: { id: `demo-cat-${item.sortOrder}` },
      update: {},
      create: { id: `demo-cat-${item.sortOrder}`, businessId: business.id, ...item },
    });
  }

  // FAQs
  const faqs = [
    {
      question: "Qual o horário de funcionamento?",
      answer: "Funcionamos de segunda a sexta das 9h às 19h e sábados das 9h às 15h. Domingos fechado.",
      keywords: ["horário", "horario", "funcionamento", "abre", "fecha", "quando"],
    },
    {
      question: "Onde fica a barbearia?",
      answer: "Estamos na Rua das Flores, 123 - próximo ao metrô Paulista. Fácil estacionamento na rua.",
      keywords: ["endereço", "endereco", "onde", "localização", "localizacao", "fica"],
    },
    {
      question: "Vocês aceitam cartão?",
      answer: "Sim! Aceitamos cartão de débito, crédito e PIX. Também aceitamos dinheiro.",
      keywords: ["cartão", "cartao", "pagamento", "débito", "debito", "crédito", "credito"],
    },
    {
      question: "Precisa marcar horário?",
      answer: "Recomendamos agendar para garantir seu horário! Mas também atendemos por ordem de chegada quando temos disponibilidade.",
      keywords: ["marcar", "reservar", "precisa", "necessário", "espera", "fila"],
    },
  ];

  for (let i = 0; i < faqs.length; i++) {
    await prisma.fAQ.upsert({
      where: { id: `demo-faq-${i}` },
      update: {},
      create: { id: `demo-faq-${i}`, businessId: business.id, sortOrder: i + 1, ...faqs[i] },
    });
  }

  console.log("✅ Seed concluído!");
  console.log("   Email: demo@zapflow.com.br");
  console.log("   Senha: demo1234");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
