alter table public.extras
add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists extras_category_id_idx
on public.extras(category_id);
