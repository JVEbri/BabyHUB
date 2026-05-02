import { FastifyInstance } from "fastify";
import { pool } from "../db.js";

const GO2RTC_API = process.env.GO2RTC_API_URL || "http://go2rtc:1984";
const GO2RTC_PUBLIC_URL = process.env.GO2RTC_PUBLIC_URL || "http://localhost:1984";

interface CameraInput {
  name: string;
  rtspUrl: string;
  sensorDeviceId?: string;
}

async function getAllCameras() {
  const { rows } = await pool.query("SELECT * FROM cameras ORDER BY created_at DESC");
  return rows;
}

async function createCamera(input: CameraInput) {
  const streamName = `cam_${Date.now()}`;
  try {
    const resp = await fetch(`${GO2RTC_API}/api/streams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: streamName, url: input.rtspUrl }),
    });
    if (!resp.ok) {
      console.error(`Failed to register stream in go2rtc: ${resp.status} ${await resp.text()}`);
    } else {
      console.log(`Stream ${streamName} registered in go2rtc`);
    }
  } catch (err) {
    console.error("Error registering stream in go2rtc:", err);
  }

  const { rows } = await pool.query(
    "INSERT INTO cameras (name, rtsp_url, stream_name, sensor_device_id) VALUES ($1, $2, $3, $4) RETURNING *",
    [input.name, input.rtspUrl, streamName, input.sensorDeviceId || null]
  );
  return rows[0];
}

async function getCameraById(id: string) {
  const { rows } = await pool.query("SELECT * FROM cameras WHERE id = $1", [id]);
  return rows[0];
}

async function updateCamera(id: string, input: CameraInput) {
  const { rows } = await pool.query(
    "UPDATE cameras SET name = $1, rtsp_url = $2, sensor_device_id = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
    [input.name, input.rtspUrl, input.sensorDeviceId ?? null, id]
  );
  return rows[0];
}

async function deleteCamera(id: string) {
  const camera = await getCameraById(id);
  if (camera) {
    try {
      await fetch(`${GO2RTC_API}/api/streams/${camera.stream_name}`, { method: "DELETE" });
    } catch (err) {
      console.error("Error removing stream from go2rtc:", err);
    }
  }

  const result = await pool.query("DELETE FROM cameras WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

async function getStreamUrl(id: string) {
  const { rows } = await pool.query("SELECT * FROM cameras WHERE id = $1", [id]);
  if (!rows[0]) return null;
  return `${GO2RTC_PUBLIC_URL}/stream.html?src=${rows[0].stream_name}`;
}

export default async function cameraRoutes(fastify: FastifyInstance) {
  fastify.get("/api/cameras", async () => getAllCameras());

  fastify.post("/api/cameras", async (request, reply) => {
    const input = request.body as CameraInput;
    const camera = await createCamera(input);
    return reply.code(201).send(camera);
  });

  fastify.get("/api/cameras/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const camera = await getCameraById(id);
    if (!camera) return reply.code(404).send({ error: "Camera not found" });
    return camera;
  });

  fastify.put("/api/cameras/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = request.body as CameraInput;
    const camera = await updateCamera(id, input);
    if (!camera) return reply.code(404).send({ error: "Camera not found" });
    return camera;
  });

  fastify.put("/api/cameras/:id/sensor", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sensorDeviceId } = request.body as { sensorDeviceId: string };
    const { rows } = await pool.query(
      "UPDATE cameras SET sensor_device_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [sensorDeviceId, id]
    );
    if (rows.length === 0) return reply.code(404).send({ error: "Camera not found" });
    return rows[0];
  });

  fastify.delete("/api/cameras/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await deleteCamera(id);
    if (!deleted) return reply.code(404).send({ error: "Camera not found" });
    return reply.code(204).send();
  });

  fastify.get("/api/cameras/:id/stream-url", async (request, reply) => {
    const { id } = request.params as { id: string };
    const streamUrl = await getStreamUrl(id);
    if (!streamUrl) return reply.code(404).send({ error: "Camera not found" });
    return { streamUrl };
  });
}
