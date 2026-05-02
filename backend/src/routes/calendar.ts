import { FastifyInstance } from "fastify";
import { pool } from "../db.js";

interface CalendarEventInput {
  title: string;
  event_date: string; // YYYY-MM-DD
  event_time?: string; // HH:MM
  details?: string;
}

async function getEvents(filters: { from?: string; to?: string }) {
  let query = "SELECT * FROM calendar_events WHERE 1=1";
  const values: any[] = [];
  let idx = 1;

  if (filters.from) {
    query += ` AND event_date >= $${idx++}`;
    values.push(filters.from);
  }
  if (filters.to) {
    query += ` AND event_date <= $${idx++}`;
    values.push(filters.to);
  }

  query += " ORDER BY event_date ASC, event_time ASC";
  const { rows } = await pool.query(query, values);
  return rows;
}

async function createEvent(input: CalendarEventInput) {
  const { rows } = await pool.query(
    "INSERT INTO calendar_events (title, event_date, event_time, details) VALUES ($1, $2, $3, $4) RETURNING *",
    [input.title, input.event_date, input.event_time || null, input.details || null]
  );
  return rows[0];
}

async function deleteEvent(id: string) {
  const result = await pool.query("DELETE FROM calendar_events WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export default async function calendarRoutes(fastify: FastifyInstance) {
  // Get events with optional date filters
  fastify.get("/api/calendar-events", async (request) => {
    const { from, to } = request.query as { from?: string; to?: string };
    return getEvents({ from, to });
  });

  // Create event
  fastify.post("/api/calendar-events", async (request, reply) => {
    const input = request.body as CalendarEventInput;
    if (!input.title || !input.event_date) {
      return reply.code(400).send({ error: "Title and date are required" });
    }
    const event = await createEvent(input);
    return reply.code(201).send(event);
  });

  // Update event
  fastify.patch("/api/calendar-events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = request.body as Partial<CalendarEventInput>;
    
    if (Object.keys(input).length === 0) {
      return reply.code(400).send({ error: "No fields to update" });
    }

    const fields = [];
    const values: any[] = [];
    let idx = 1;

    if (input.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(input.title);
    }
    if (input.event_date !== undefined) {
      fields.push(`event_date = $${idx++}`);
      values.push(input.event_date);
    }
    if (input.event_time !== undefined) {
      fields.push(`event_time = $${idx++}`);
      values.push(input.event_time || null);
    }
    if (input.details !== undefined) {
      fields.push(`details = $${idx++}`);
      values.push(input.details || null);
    }

    values.push(id);
    const query = `UPDATE calendar_events SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(query, values);
    
    if (rows.length === 0) return reply.code(404).send({ error: "Event not found" });
    return rows[0];
  });

  // Delete event
  fastify.delete("/api/calendar-events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await deleteEvent(id);
    if (!deleted) return reply.code(404).send({ error: "Event not found" });
    return reply.code(204).send();
  });
}
