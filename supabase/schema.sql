-- ToGoGo Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text not null default '',
  avatar_url text,
  bio text default '',
  location_suburb text default '',
  location_country text default 'Australia',
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'both', 'admin')),
  trust_score numeric(5,2) default 0,
  stripe_account_id text,
  wallet_balance numeric(10,2) default 0,
  verification_level integer default 1 check (verification_level between 1 and 3),
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- SUPPLIERS TABLE (must be created before products)
-- ============================================
create table if not exists public.suppliers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  api_type text default 'manual' check (api_type in ('aliexpress', 'cj', 'zendrop', 'spocket', 'manual')),
  api_key_encrypted text,
  base_shipping_cost numeric(10,2) default 0,
  avg_delivery_days integer default 14,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
create table if not exists public.products (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text default '',
  price numeric(10,2) not null check (price >= 0),
  original_price numeric(10,2),
  condition text default 'New' check (condition in ('New', 'Like New', 'Good', 'Fair')),
  category text not null,
  images text[] default '{}',
  quantity integer default 1 check (quantity >= 0),
  status text default 'active' check (status in ('active', 'sold', 'draft', 'removed')),
  is_dropship boolean default false,
  supplier_id uuid references public.suppliers(id),
  supplier_cost numeric(10,2),
  shipping_type text default 'small',
  location text default '',
  views_count integer default 0,
  is_featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ORDERS TABLE
-- ============================================
create table if not exists public.orders (
  id uuid default uuid_generate_v4() primary key,
  buyer_id uuid references public.users(id) not null,
  seller_id uuid references public.users(id) not null,
  product_id uuid references public.products(id) not null,
  quantity integer default 1,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  platform_fee numeric(10,2) default 0,
  seller_payout numeric(10,2) default 0,
  status text default 'pending' check (status in ('pending', 'paid', 'shipped', 'delivered', 'disputed', 'refunded')),
  shipping_address jsonb,
  tracking_number text,
  supplier_order_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- MESSAGES TABLE
-- ============================================
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id text not null,
  sender_id uuid references public.users(id) not null,
  recipient_id uuid references public.users(id),
  product_id uuid references public.products(id),
  content text default '',
  image_url text,
  offer_price numeric(10,2),
  offer_status text check (offer_status in ('pending', 'accepted', 'declined', null)),
  created_at timestamptz default now()
);

-- ============================================
-- REVIEWS TABLE
-- ============================================
create table if not exists public.reviews (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) not null,
  reviewer_id uuid references public.users(id) not null,
  reviewed_id uuid references public.users(id) not null,
  rating integer not null check (rating between 1 and 5),
  body text default '',
  seller_response text,
  created_at timestamptz default now()
);

-- ============================================
-- DISPUTES TABLE
-- ============================================
create table if not exists public.disputes (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) not null,
  opened_by uuid references public.users(id) not null,
  reason text not null,
  status text default 'open' check (status in ('open', 'in_review', 'resolved')),
  admin_note text,
  resolution text,
  created_at timestamptz default now()
);

-- ============================================
-- PROMO CODES TABLE
-- ============================================
create table if not exists public.promo_codes (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  type text not null check (type in ('percent', 'fixed')),
  value numeric(10,2) not null,
  max_uses integer default 100,
  uses_count integer default 0,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- REFERRALS TABLE
-- ============================================
create table if not exists public.referrals (
  id uuid default uuid_generate_v4() primary key,
  referrer_id uuid references public.users(id) not null,
  referred_id uuid references public.users(id),
  code text unique not null,
  status text default 'pending' check (status in ('pending', 'completed')),
  reward_paid boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  body text default '',
  is_read boolean default false,
  link text,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_products_seller on public.products(seller_id);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_created on public.products(created_at desc);
create index if not exists idx_orders_buyer on public.orders(buyer_id);
create index if not exists idx_orders_seller on public.orders(seller_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_reviews_reviewed on public.reviews(reviewed_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.suppliers enable row level security;
alter table public.disputes enable row level security;
alter table public.promo_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.notifications enable row level security;

-- Users: anyone can read, users can update own
create policy "Users are viewable by everyone" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- Products: anyone can read active, sellers can CRUD own
create policy "Active products are viewable by everyone" on public.products for select using (status = 'active' or seller_id = auth.uid());
create policy "Sellers can insert products" on public.products for insert with check (auth.uid() = seller_id);
create policy "Sellers can update own products" on public.products for update using (auth.uid() = seller_id);
create policy "Sellers can delete own products" on public.products for delete using (auth.uid() = seller_id);

-- Orders: buyers and sellers can see their own
create policy "Users can view own orders" on public.orders for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Users can create orders" on public.orders for insert with check (auth.uid() = buyer_id);
create policy "Order participants can update" on public.orders for update using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Messages: participants can see their own conversations
create policy "Users can view own messages" on public.messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users can send messages" on public.messages for insert with check (auth.uid() = sender_id);

-- Reviews: anyone can read, participants can write
create policy "Reviews are viewable by everyone" on public.reviews for select using (true);
create policy "Reviewers can insert" on public.reviews for insert with check (auth.uid() = reviewer_id);

-- Suppliers: authenticated users can read
create policy "Suppliers viewable by authenticated" on public.suppliers for select using (auth.role() = 'authenticated');

-- Disputes: participants can view and create
create policy "Dispute participants can view" on public.disputes for select using (auth.uid() = opened_by);
create policy "Users can open disputes" on public.disputes for insert with check (auth.uid() = opened_by);

-- Promo codes: anyone can read active
create policy "Active promos viewable" on public.promo_codes for select using (is_active = true);

-- Referrals: users can see own
create policy "Users can view own referrals" on public.referrals for select using (auth.uid() = referrer_id or auth.uid() = referred_id);
create policy "Users can create referrals" on public.referrals for insert with check (auth.uid() = referrer_id);

-- Notifications: users see own
create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Increment product views
create or replace function public.increment_views(product_id uuid)
returns void as $$
begin
  update public.products set views_count = views_count + 1 where id = product_id;
end;
$$ language plpgsql security definer;

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: create profile on auth signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger update_users_updated_at before update on public.users for each row execute function public.update_updated_at();
create or replace trigger update_products_updated_at before update on public.products for each row execute function public.update_updated_at();
create or replace trigger update_orders_updated_at before update on public.orders for each row execute function public.update_updated_at();
