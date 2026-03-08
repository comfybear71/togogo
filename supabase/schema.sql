-- ToGoGo Database Schema - Global Price Comparison Platform
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
  role text not null default 'buyer' check (role in ('buyer', 'subscriber', 'both', 'admin')),
  trust_score numeric(5,2) default 0,
  stripe_account_id text,
  wallet_balance numeric(10,2) default 0,
  verification_level integer default 1 check (verification_level between 1 and 3),
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- RETAILERS TABLE (Shopping portals we aggregate from)
-- ============================================
create table if not exists public.retailers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  domain text not null,
  country text not null default '',
  logo_url text,
  api_type text not null default 'scrape' check (api_type in ('api', 'scrape', 'affiliate')),
  api_config jsonb default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
create table if not exists public.categories (
  id text primary key,
  name text not null,
  icon text,
  parent_id text references public.categories(id) on delete set null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- PRODUCTS TABLE (Canonical products)
-- ============================================
create table if not exists public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text default '',
  brand text default '',
  category text default '',
  subcategory text default '',
  image_url text,
  images text[] default '{}',
  barcode text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- DEALS TABLE (Core table: product + retailer + price)
-- ============================================
create table if not exists public.deals (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  retailer_id uuid references public.retailers(id) on delete cascade not null,
  price numeric(10,2) not null check (price >= 0),
  original_price numeric(10,2),
  currency text not null default 'USD',
  url text not null,
  shipping_cost numeric(10,2) default 0,
  in_stock boolean default true,
  deal_score integer check (deal_score between 1 and 100),
  is_daily_deal boolean default false,
  is_verified boolean default false,
  expires_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PRICE HISTORY TABLE
-- ============================================
create table if not exists public.price_history (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id) on delete cascade not null,
  price numeric(10,2) not null,
  checked_at timestamptz default now()
);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  plan text not null default 'free' check (plan in ('free', 'basic', 'premium')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  stripe_subscription_id text,
  price_per_month numeric(10,2) default 0,
  started_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- WATCHLIST TABLE
-- ============================================
create table if not exists public.watchlist (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  target_price numeric(10,2),
  notify_email boolean default true,
  notify_push boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- PRICE ALERTS TABLE
-- ============================================
create table if not exists public.price_alerts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  deal_id uuid references public.deals(id) on delete cascade not null,
  watchlist_id uuid references public.watchlist(id) on delete set null,
  alert_type text not null check (alert_type in ('price_drop', 'daily_deal', 'back_in_stock')),
  message text default '',
  is_read boolean default false,
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
-- PLATFORM CONNECTIONS TABLE
-- Stores OAuth tokens for selling platforms (Shopify, Etsy, eBay, etc.)
-- Togogo connects on behalf of users so they never leave the app
-- ============================================
create table if not exists public.platform_connections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  platform text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'error')),
  shop_name text,
  shop_url text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  token_data jsonb default '{}',
  oauth_state text,
  oauth_verifier text,
  products_synced integer default 0,
  last_sync_at timestamptz,
  connected_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, platform)
);

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_brand on public.products(brand);
create index if not exists idx_products_barcode on public.products(barcode);
create index if not exists idx_products_created on public.products(created_at desc);

create index if not exists idx_deals_product on public.deals(product_id);
create index if not exists idx_deals_retailer on public.deals(retailer_id);
create index if not exists idx_deals_daily_deal on public.deals(is_daily_deal) where is_daily_deal = true;
create index if not exists idx_deals_deal_score on public.deals(deal_score desc);
create index if not exists idx_deals_price on public.deals(price);
create index if not exists idx_deals_in_stock on public.deals(in_stock) where in_stock = true;
create index if not exists idx_deals_created on public.deals(created_at desc);

create index if not exists idx_price_history_deal on public.price_history(deal_id);
create index if not exists idx_price_history_checked on public.price_history(checked_at desc);

create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

create index if not exists idx_watchlist_user on public.watchlist(user_id);
create index if not exists idx_watchlist_product on public.watchlist(product_id);

create index if not exists idx_price_alerts_user on public.price_alerts(user_id);
create index if not exists idx_price_alerts_unread on public.price_alerts(user_id, is_read) where is_read = false;

create index if not exists idx_notifications_user on public.notifications(user_id);

create index if not exists idx_retailers_country on public.retailers(country);
create index if not exists idx_retailers_active on public.retailers(is_active) where is_active = true;

create index if not exists idx_categories_parent on public.categories(parent_id);

create index if not exists idx_platform_connections_user on public.platform_connections(user_id);
create index if not exists idx_platform_connections_platform on public.platform_connections(user_id, platform);
create index if not exists idx_platform_connections_status on public.platform_connections(status) where status = 'active';

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.retailers enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.deals enable row level security;
alter table public.price_history enable row level security;
alter table public.subscriptions enable row level security;
alter table public.watchlist enable row level security;
alter table public.price_alerts enable row level security;
alter table public.notifications enable row level security;
alter table public.promo_codes enable row level security;
alter table public.referrals enable row level security;

-- Users: anyone can read, users can update own
create policy "Users are viewable by everyone" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- Retailers: public read
create policy "Retailers are viewable by everyone" on public.retailers for select using (true);

-- Categories: public read
create policy "Categories are viewable by everyone" on public.categories for select using (true);

-- Products: public read
create policy "Products are viewable by everyone" on public.products for select using (true);

-- Deals: public read
create policy "Deals are viewable by everyone" on public.deals for select using (true);

-- Price history: public read
create policy "Price history is viewable by everyone" on public.price_history for select using (true);

-- Subscriptions: users see only their own
create policy "Users can view own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own subscriptions" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update own subscriptions" on public.subscriptions for update using (auth.uid() = user_id);

-- Watchlist: users see only their own
create policy "Users can view own watchlist" on public.watchlist for select using (auth.uid() = user_id);
create policy "Users can insert own watchlist" on public.watchlist for insert with check (auth.uid() = user_id);
create policy "Users can update own watchlist" on public.watchlist for update using (auth.uid() = user_id);
create policy "Users can delete own watchlist" on public.watchlist for delete using (auth.uid() = user_id);

-- Price alerts: users see only their own
create policy "Users can view own price alerts" on public.price_alerts for select using (auth.uid() = user_id);
create policy "Users can update own price alerts" on public.price_alerts for update using (auth.uid() = user_id);

-- Notifications: users see own
create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- Promo codes: anyone can read active
create policy "Active promos viewable" on public.promo_codes for select using (is_active = true);

-- Platform connections: users manage own
alter table public.platform_connections enable row level security;
create policy "Users can view own platform connections" on public.platform_connections for select using (auth.uid() = user_id);
create policy "Users can insert own platform connections" on public.platform_connections for insert with check (auth.uid() = user_id);
create policy "Users can update own platform connections" on public.platform_connections for update using (auth.uid() = user_id);
create policy "Users can delete own platform connections" on public.platform_connections for delete using (auth.uid() = user_id);

-- Referrals: users can see own
create policy "Users can view own referrals" on public.referrals for select using (auth.uid() = referrer_id or auth.uid() = referred_id);
create policy "Users can create referrals" on public.referrals for insert with check (auth.uid() = referrer_id);

-- ============================================
-- FUNCTIONS
-- ============================================

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

-- Triggers for updated_at
create or replace trigger update_users_updated_at before update on public.users for each row execute function public.update_updated_at();
create or replace trigger update_products_updated_at before update on public.products for each row execute function public.update_updated_at();
create or replace trigger update_deals_updated_at before update on public.deals for each row execute function public.update_updated_at();

-- Get the best price (lowest price + shipping) for a product
create or replace function public.get_best_price(p_product_id uuid)
returns table (
  deal_id uuid,
  retailer_id uuid,
  retailer_name text,
  retailer_domain text,
  price numeric(10,2),
  shipping_cost numeric(10,2),
  total_cost numeric(10,2),
  currency text,
  url text,
  in_stock boolean,
  deal_score integer,
  is_verified boolean,
  last_checked_at timestamptz
) as $$
begin
  return query
  select
    d.id as deal_id,
    d.retailer_id,
    r.name as retailer_name,
    r.domain as retailer_domain,
    d.price,
    d.shipping_cost,
    (d.price + d.shipping_cost) as total_cost,
    d.currency,
    d.url,
    d.in_stock,
    d.deal_score,
    d.is_verified,
    d.last_checked_at
  from public.deals d
  join public.retailers r on r.id = d.retailer_id
  where d.product_id = p_product_id
    and d.in_stock = true
  order by (d.price + d.shipping_cost) asc
  limit 1;
end;
$$ language plpgsql security definer;
