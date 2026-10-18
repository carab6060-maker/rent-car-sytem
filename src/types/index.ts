export type UserRole = 'superadmin' | 'manager' | 'staff';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  companyId: number;
  companyName: string;
  companyLogo?: string | null;
  isSuperAdmin?: boolean;
}

export type CarStatus = 'Available' | 'Rented' | 'Maintenance';

export interface Car {
  id: number;
  company_id?: number;
  name: string;
  model?: string;
  plate: string;
  price_per_day: number | string;
  status: CarStatus;
  image_url?: string | null;
}

export interface Customer {
  id: number;
  company_id?: number;
  full_name: string;
  phone: string;
  license: string;
}

export type RentalStatus = 'Rented' | 'Returned' | 'Cancelled';

export interface Rental {
  id: number;
  company_id?: number;
  customer_id: number;
  car_id: number;
  start_date: string;
  return_date: string;
  actual_return_date?: string | null;
  total_days: number;
  price_per_day: number | string;
  total_price: number | string;
  extra_charges?: number | string;
  status: RentalStatus;
  customer_name?: string;
  customer_phone?: string;
  customer_license?: string;
  car_name?: string;
  car_model?: string;
  car_plate?: string;
  balance_due?: number | string;
}

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Mobile Money';

export interface Payment {
  id: number;
  company_id?: number;
  rental_id: number;
  amount: number | string;
  payment_method: PaymentMethod | string;
  payment_date: string;
  reference_no?: string | null;
  notes?: string | null;
  customer_name?: string;
  car_name?: string;
  car_plate?: string;
  recorded_by_name?: string;
}

export type ExpenseCategory = 'Fuel' | 'Maintenance' | 'Insurance' | 'Staff Salaries' | 'Other';

export interface Expense {
  id: number;
  company_id?: number;
  title: string;
  category: ExpenseCategory | string;
  amount: number | string;
  expense_date: string;
  payment_method: string;
  description?: string | null;
  recorded_by_name?: string;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  plan: string;
  status: string;
  user_count?: number;
  car_count?: number;
  rental_count?: number;
}

export interface DashboardData {
  totalCars: number;
  availableCars: number;
  rentedCars: number;
  totalCustomers: number;
  totalRevenue: number;
  totalExpenses?: number;
  netProfit?: number;
  recentRentals: Rental[];
}

export interface LedgerTransaction {
  id: string | number;
  type: 'income' | 'expense';
  date: string;
  title: string;
  category: string;
  payment_method: string;
  amount: number;
  reference_no?: string | null;
  recorded_by?: string | null;
  customer_name?: string | null;
  car_name?: string | null;
}

export interface AccountingSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  accountsReceivable: number;
  revenueByMethod: Record<string, number>;
  expensesByCategory: Record<string, number>;
  transactions: LedgerTransaction[];
}

