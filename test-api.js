/* eslint-disable */
const { z } = require('zod');
const cartItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  name: z.string(),
  price: z.number().min(0),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
  extras: z.array(z.object({
    name: z.string(),
    price: z.number().min(0),
  })).optional(),
  half_flavor: z.object({
    menu_item_id: z.string(),
    name: z.string(),
  }).optional(),
});
const createPublicOrderSchema = z.object({
  tenant_id: z.string().uuid(),
  customer_name: z.string().optional(),
  customer_cpf: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  table_number: z.string().optional(),
  table_id: z.string().uuid().optional(),
  tab_id: z.string().uuid().optional(),
  payment_method: z.enum(['online', 'table', 'counter', 'delivery']),
  notes: z.string().optional(),
  delivery_fee: z.number().min(0).optional(),
  delivery_distance_km: z.number().min(0).optional(),
  delivery_address: z.object({
    id: z.string().optional(),
    customer_id: z.string().optional(),
    created_at: z.string().optional(),
    zip_code: z.string().nullable().optional(),
    street: z.string().nullable().optional(),
    number: z.string().nullable().optional(),
    complement: z.string().nullable().optional(),
    neighborhood: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    is_default: z.boolean().nullable().optional(),
  }).optional(),
  items: z.array(cartItemSchema).min(1, 'Pedido deve ter ao menos um item'),
});

const payload = {
  tenant_id: 'a872cc8b-5975-4704-8b63-1250de4859f5',
  customer_name: 'Felipe',
  customer_phone: '11999999999',
  payment_method: 'delivery',
  delivery_fee: 0,
  delivery_address: {
    zip_code: '12345678',
    street: 'Rua',
    number: '1',
    city: 'SP',
    state: 'SP'
  },
  items: [{
    menu_item_id: 'a872cc8b-5975-4704-8b63-1250de4859f5',
    name: 'Pizza',
    price: 10,
    quantity: 1
  }]
};

const parsed = createPublicOrderSchema.safeParse(payload);
console.log('Success:', parsed.success);
if (!parsed.success) {
  console.log('Error:', parsed.error.issues);
}
