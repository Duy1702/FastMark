create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null, -- 'food', 'cafe', 'milktea', 'snack'
  latitude double precision not null,
  longitude double precision not null,
  address text,
  created_at timestamptz not null default now()
);

-- Bật Row Level Security (RLS) để bảo mật cơ sở dữ liệu
alter table public.restaurants enable row level security;

-- Tạo chính sách cho phép đọc công khai (select)
create policy "Allow public read access"
on public.restaurants for select
using (true);

-- Chèn dữ liệu mẫu cho quán ăn quanh quận 1, TP. HCM
insert into public.restaurants (name, type, latitude, longitude, address)
values 
  ('Cà phê Vy', 'cafe', 10.7780, 106.7020, '277 Phan Xích Long, Q. Phú Nhuận'),
  ('Bánh Mì Huỳnh Hoa', 'food', 10.7755, 106.6990, '26 Lê Thị Riêng, Q.1'),
  ('Phở Lệ', 'food', 10.7795, 106.6985, '415 Nguyễn Trãi, Q.5'),
  ('Trà Sữa Gong Cha', 'milktea', 10.7740, 106.7035, '79 Hồ Tùng Mậu, Q.1'),
  ('Ăn Vặt Hồ Con Rùa', 'snack', 10.7825, 106.6960, 'Công Trường Quốc Tế, Q.3')
on conflict do nothing;
