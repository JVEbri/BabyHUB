import { FastifyInstance } from "fastify";
import { pool } from "../db.js";

interface SensorReadingInput {
  temperature?: number;
  humidity?: number;
  cameraId?: string;
}

async function createSensorReading(input: SensorReadingInput) {
  const { rows } = await pool.query(
    `INSERT INTO sensor_readings (temperature, humidity, camera_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [input.temperature ?? null, input.humidity ?? null, input.cameraId ?? null]
  );
  return rows[0];
}

async function getLatestReadings() {
  const { rows } = await pool.query(`
    SELECT
      camera_id,
      (SELECT temperature FROM sensor_readings sr2
       WHERE sr2.camera_id = sr1.camera_id AND temperature IS NOT NULL
       ORDER BY created_at DESC LIMIT 1) as temperature,
      (SELECT humidity FROM sensor_readings sr2
       WHERE sr2.camera_id = sr1.camera_id AND humidity IS NOT NULL
       ORDER BY created_at DESC LIMIT 1) as humidity,
      MAX(created_at) as created_at
    FROM sensor_readings sr1
    GROUP BY camera_id
  `);
  return rows;
}

export default async function sensorRoutes(fastify: FastifyInstance) {
  fastify.post("/api/sensor-readings", async (request, reply) => {
    const input = request.body as SensorReadingInput;
    const reading = await createSensorReading(input);
    return reply.code(201).send(reading);
  });

  fastify.get("/api/sensor-readings/latest", async () => getLatestReadings());
}
