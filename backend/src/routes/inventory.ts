import { FastifyInstance } from "fastify";
import { pool } from "../db.js";

interface InventoryItemInput {
  name?: string;
  quantity?: number;
  unit?: string;
  lowStockThreshold?: number;
}

async function getAllItems() {
  const { rows } = await pool.query("SELECT * FROM inventory_items ORDER BY created_at");
  return rows;
}

async function createItem(input: { name: string; quantity: number; unit: string; lowStockThreshold?: number }) {
  const { rows } = await pool.query(
    "INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold) VALUES ($1, $2, $3, $4) RETURNING *",
    [input.name, input.quantity, input.unit, input.lowStockThreshold ?? null]
  );
  return rows[0];
}

async function getItemById(id: string) {
  const { rows } = await pool.query("SELECT * FROM inventory_items WHERE id = $1", [id]);
  return rows[0];
}

async function updateItem(id: string, input: InventoryItemInput) {
  // Build dynamic UPDATE query based on provided fields
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(input.name);
  }
  if (input.quantity !== undefined) {
    fields.push(`quantity = $${idx++}`);
    values.push(input.quantity);
  }
  if (input.unit !== undefined) {
    fields.push(`unit = $${idx++}`);
    values.push(input.unit);
  }
  if (input.lowStockThreshold !== undefined) {
    fields.push(`low_stock_threshold = $${idx++}`);
    values.push(input.lowStockThreshold);
  }

  fields.push(`updated_at = NOW()`);

  const query = `UPDATE inventory_items SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
  values.push(id);

  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function deleteItem(id: string) {
  const result = await pool.query("DELETE FROM inventory_items WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export default async function inventoryRoutes(fastify: FastifyInstance) {
  fastify.get("/api/inventory-items", async () => getAllItems());

  fastify.post("/api/inventory-items", async (request, reply) => {
    const input = request.body as { name: string; quantity: number; unit: string; lowStockThreshold?: number };
    const item = await createItem(input);
    return reply.code(201).send(item);
  });

  fastify.get("/api/inventory-items/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await getItemById(id);
    if (!item) return reply.code(404).send({ error: "Item not found" });
    return item;
  });

  fastify.put("/api/inventory-items/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = request.body as InventoryItemInput;
    const item = await updateItem(id, input);
    if (!item) return reply.code(404).send({ error: "Item not found" });
    return item;
  });

  fastify.delete("/api/inventory-items/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await deleteItem(id);
    if (!deleted) return reply.code(404).send({ error: "Item not found" });
    return reply.code(204).send();
  });
}
