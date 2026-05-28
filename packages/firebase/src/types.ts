export type Plan = "STARTER" | "PRO" | "UNLIMITED";
export type PlanStatus = "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED";
export type BusinessType = "BARBERSHOP" | "SALON" | "RESTAURANT" | "DENTAL" | "STORE" | "OTHER";
export type ConversationStatus = "OPEN" | "ATTENDING" | "CLOSED";
export type MessageRole = "CUSTOMER" | "BOT" | "HUMAN";
export type AppointmentStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";

export interface Tenant {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  planStatus: PlanStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  currentPeriodEnd?: string;
  onboardingCompletedAt?: string;
  lgpdAcceptedAt?: string;
  lgpdPolicyVersion?: string;
  trialEndsAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BotMenuItemConfig {
  num: number;
  action: "APPOINTMENT" | "CATALOG" | "FAQ" | "HUMAN";
  label: string;
  enabled: boolean;
  emoji?: string;
}

export interface Business {
  id: string;
  tenantId: string;
  name: string;
  type: BusinessType;
  phone: string;
  address?: string;
  description?: string;
  logoUrl?: string;
  workingHours: Record<string, unknown>;
  timezone?: string;
  greetingMsg: string;
  awayMsg: string;
  botMenu?: BotMenuItemConfig[];
  isConnected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  available: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface FAQ {
  id: string;
  businessId: string;
  question: string;
  answer: string;
  keywords: string[];
  sortOrder: number;
  active: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  businessId: string;
  customerPhone: string;
  customerName?: string;
  status: ConversationStatus;
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  mediaUrl?: string;
  waMessageId?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  businessId: string;
  conversationId?: string;
  customerPhone: string;
  customerName?: string;
  serviceId?: string;
  serviceName: string;
  scheduledAt: string;
  durationMins: number;
  status: AppointmentStatus;
  notes?: string;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  businessId: string;
  conversationId?: string;
  customerPhone: string;
  customerName?: string;
  description: string;
  amount: number;
  status: PaymentStatus;
  pixQrCode?: string;
  pixCopyPaste?: string;
  asaasId?: string;
  externalRef?: string;
  paidAt?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessWithRelations extends Business {
  catalog: CatalogItem[];
  faqs: FAQ[];
}
