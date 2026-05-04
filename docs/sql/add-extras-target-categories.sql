-- 1. Cria o novo array para categorias alvo
alter table public.extras
add column if not exists target_categories uuid[] default '{}'::uuid[];

-- 2. Migra os dados do category_id existente para o novo array (onde não for nulo)
update public.extras
set target_categories = array[category_id]
where category_id is not null;

-- 3. Remove a coluna e a fk antiga
alter table public.extras
drop column if exists category_id;
