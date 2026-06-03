export interface User {
  id: string;
  name: string;
  email: string;
  monthlyBudget: number | null;
  createdAt: string;
  updatedAt: string;
}

export type BillingType = "MONTHLY" | "YEARLY";
export type CategoryType = "ENTERTAINMENT" | "UTILITY" | "FINANCE" | "EDUCATION" | "GAMING" | "OTHER";

export interface Subscription {
  id: string;
  name: string;
  price: number;
  billingCycle: BillingType;
  category: CategoryType;
  startDate: string;
  nextPaymentDate: string;
  isActive: boolean;
  currency: string;
  accountLimit: number | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionAccountStatus = "ACTIVE" | "INACTIVE";

export interface SubscriptionAccount {
  id: string;
  subscriptionId: string;
  name: string;
  email: string | null;
  holderName: string | null;
  status: SubscriptionAccountStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentLog {
  id: string;
  amount: number;
  paidAt: string;
  note: string | null;
  subscriptionId: string;
}

export interface SubscriptionSummary {
  totalSubscriptions: number;
  activeCount: number;
  inactiveCount: number;
  monthlyTotal: number;
  yearlyTotal: number;
  currency: string;
  monthlyBudget: number | null;
}

export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface CreateSubscriptionPayload {
  name: string;
  price: number;
  billingCycle: BillingType;
  category?: CategoryType;
  startDate: string;
  nextPaymentDate: string;
  currency?: string;
  accountLimit?: number | null;
}

export interface UpdateSubscriptionPayload {
  name?: string;
  price?: number;
  billingCycle?: BillingType;
  category?: CategoryType;
  startDate?: string;
  nextPaymentDate?: string;
  isActive?: boolean;
  currency?: string;
  accountLimit?: number | null;
}

export interface CreateSubscriptionAccountPayload {
  name: string;
  email: string;
  holderName?: string | null;
  notes?: string | null;
}

export interface UpdateSubscriptionAccountPayload {
  name?: string;
  email?: string | null;
  holderName?: string | null;
  status?: SubscriptionAccountStatus;
  notes?: string | null;
}
