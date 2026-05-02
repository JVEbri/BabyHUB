import { FastifyInstance } from "fastify";
import { pool } from "../db.js";

interface ButtonInput {
  label: string;
  icon?: string;
  color?: string;
  interval_hours?: number;
}

async function getAllButtons() {
  const { rows } = await pool.query("SELECT * FROM buttons ORDER BY created_at");
  return rows;
}

async function createButton(input: ButtonInput) {
  const { rows } = await pool.query(
    "INSERT INTO buttons (label, icon, color, interval_hours) VALUES ($1, $2, $3, $4) RETURNING *",
    [input.label, input.icon ?? null, input.color ?? null, input.interval_hours ?? null]
  );
  return rows[0];
}

async function getButtonById(id: string) {
  const { rows } = await pool.query("SELECT * FROM buttons WHERE id = $1", [id]);
  return rows[0];
}

async function updateButton(id: string, input: ButtonInput) {
  const fields = [];
  const values: any[] = [];
  let idx = 1;

  if (input.label !== undefined) {
    fields.push(`label = $${idx++}`);
    values.push(input.label);
  }
  if (input.icon !== undefined) {
    fields.push(`icon = $${idx++}`);
    values.push(input.icon ?? null);
  }
  if (input.color !== undefined) {
    fields.push(`color = $${idx++}`);
    values.push(input.color ?? null);
  }
  if (input.interval_hours !== undefined) {
    fields.push(`interval_hours = $${idx++}`);
    values.push(input.interval_hours ?? null);
  }

  values.push(id);
  const query = `UPDATE buttons SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function deleteButton(id: string) {
  const result = await pool.query("DELETE FROM buttons WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

async function pressButton(id: string) {
  // Update last_pressed_at and record in button_presses table
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      "UPDATE buttons SET last_pressed_at = NOW() WHERE id = $1 RETURNING *",
      [id]
    );
    await client.query(
      "INSERT INTO button_presses (button_id) VALUES ($1)",
      [id]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export default async function buttonRoutes(fastify: FastifyInstance) {
  fastify.get("/api/buttons", async () => getAllButtons());

  fastify.post("/api/buttons", async (request, reply) => {
    const input = request.body as ButtonInput;
    if (!input.label) return reply.code(400).send({ error: "Label is required" });
    const button = await createButton(input);
    return reply.code(201).send(button);
  });

  fastify.get("/api/buttons/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const button = await getButtonById(id);
    if (!button) return reply.code(404).send({ error: "Button not found" });
    return button;
  });

  fastify.put("/api/buttons/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = request.body as ButtonInput;
    const button = await updateButton(id, input);
    if (!button) return reply.code(404).send({ error: "Button not found" });
    return button;
  });

  fastify.patch("/api/buttons/:id/press", async (request, reply) => {
    const { id } = request.params as { id: string };
    const button = await pressButton(id);
    if (!button) return reply.code(404).send({ error: "Button not found" });
    return button;
  });

  fastify.delete("/api/buttons/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await deleteButton(id);
    if (!deleted) return reply.code(404).send({ error: "Button not found" });
    return reply.code(204).send();
  });
}
