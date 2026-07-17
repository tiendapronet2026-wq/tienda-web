export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  stock: number;
  low_stock_threshold: number;
  track_stock: boolean;
  is_active: boolean;
  is_featured: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  categories?: Category | null;
};

export type CartItem = {
  id: string;
  session_id: string;
  user_id: string | null;
  product_id: string;
  quantity: number;
  created_at: string;
  products?: Product | null;
};

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  document_number: string | null;
  avatar_url: string | null;
  role: "customer" | "admin" | "seller";
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
};

export type { QuoteRequest, QuoteAttachment, QuoteStatus } from "@/lib/quotes";
export type { ServiceSlug } from "@/lib/services";
