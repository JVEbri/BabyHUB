import { FastifyInstance } from "fastify";
import { pool } from "../db.js";

interface CameraConfig {
  ip: string;
  username: string;
  password: string;
}

async function reolinkApiCall(camera: CameraConfig, cmd: string, param: any) {
  // Try HTTPS first (port 443), fallback to HTTP (port 80)
  const urls = [
    `https://${camera.ip}/cgi-bin/api.cgi?cmd=${cmd}&user=${camera.username}&password=${camera.password}`,
    `http://${camera.ip}/cgi-bin/api.cgi?cmd=${cmd}&user=${camera.username}&password=${camera.password}`
  ];
  
  const payload = [{
    cmd,
    action: 0,
    param
  }];
  
  console.log(`Trying Reolink API: ${cmd} for ${camera.ip}`);
  
  for (const url of urls) {
    try {
      console.log(`Attempting: ${url.replace(/password=[^&]+/, 'password=***')}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // @ts-ignore
        tls: { rejectUnauthorized: false }
      });
      
      const text = await response.text();
      console.log(`Response from ${url}: ${text.substring(0, 200)}`);
      
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text, error: 'Invalid JSON response' };
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Failed with ${url}:`, errorMessage);
      if (url === urls[urls.length - 1]) throw err; // Throw on last attempt
    }
  }
}

export default async function cameraControlRoutes(fastify: FastifyInstance) {
  // Obtener configuración de una cámara por ID
  fastify.get("/api/cameras/:id/config", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rows } = await pool.query("SELECT * FROM cameras WHERE id = $1", [id]);
    if (!rows[0]) return reply.code(404).send({ error: "Camera not found" });
    
    // Parsear URL RTSP para obtener IP y credenciales
    const rtspUrl = rows[0].rtsp_url;
    const match = rtspUrl.match(/rtsp:\/\/(.+?):(.+?)@(.+)/);
    if (!match) return reply.code(400).send({ error: "Invalid RTSP URL format" });
    
    const config: CameraConfig = {
      username: match[1],
      password: match[2],
      ip: match[3].split(':')[0] // Quitar puerto si tiene
    };
    
    try {
      const data = await reolinkApiCall(config, "GetDevInfo", {});
      return data;
    } catch (err) {
      return reply.code(500).send({ error: "Failed to get camera info" });
    }
  });

  // Activar/desactivar micrófono (Audio)
  fastify.post("/api/cameras/:id/audio", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { enable } = request.body as { enable: boolean };
    
    const { rows } = await pool.query("SELECT * FROM cameras WHERE id = $1", [id]);
    if (!rows[0]) return reply.code(404).send({ error: "Camera not found" });
    
    const rtspUrl = rows[0].rtsp_url;
    const match = rtspUrl.match(/rtsp:\/\/(.+?):(.+?)@(.+)/);
    if (!match) return reply.code(400).send({ error: "Invalid RTSP URL format" });
    
    const config: CameraConfig = {
      username: match[1],
      password: match[2],
      ip: match[3].split(':')[0]
    };
    
    try {
      const data = await reolinkApiCall(config, "SetAudioCfg", {
        Audio: { enable: enable ? 1 : 0 }
      });
      return data;
    } catch (err) {
      return reply.code(500).send({ error: "Failed to set audio" });
    }
  });

  // Detener PTZ
  fastify.post("/api/cameras/:id/ptz/stop", async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const { rows } = await pool.query("SELECT * FROM cameras WHERE id = $1", [id]);
    if (!rows[0]) return reply.code(404).send({ error: "Camera not found" });
    
    const rtspUrl = rows[0].rtsp_url;
    const match = rtspUrl.match(/rtsp:\/\/(.+?):(.+?)@(.+)/);
    if (!match) return reply.code(400).send({ error: "Invalid RTSP URL format" });
    
    const config: CameraConfig = {
      username: match[1],
      password: match[2],
      ip: match[3].split(':')[0]
    };
    
    try {
      const data = await reolinkApiCall(config, "PtzCtrl", { op: "Stop", channel: 0 });
      return data;
    } catch (err) {
      return reply.code(500).send({ error: "Failed to stop camera" });
    }
  });
  
  // Movimiento PTZ (Pan/Tilt/Zoom)
  fastify.post("/api/cameras/:id/ptz", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { direction, action = 'start', speed = 32 } = request.body as { 
      direction: 'up' | 'down' | 'left' | 'right' | 'zoomIn' | 'zoomOut';
      action?: 'start' | 'stop';
      speed?: number;
    };
    
    const { rows } = await pool.query("SELECT * FROM cameras WHERE id = $1", [id]);
    if (!rows[0]) return reply.code(404).send({ error: "Camera not found" });
    
    const rtspUrl = rows[0].rtsp_url;
    const match = rtspUrl.match(/rtsp:\/\/(.+?):(.+?)@(.+)/);
    if (!match) return reply.code(400).send({ error: "Invalid RTSP URL format" });
    
    const config: CameraConfig = {
      username: match[1],
      password: match[2],
      ip: match[3].split(':')[0]
    };
    
    // Mapeo directo: lo que llega del frontend se envía tal cual a la cámara
    const ptzCommands: Record<string, any> = {
      up: { op: "Up", speed },
      down: { op: "Down", speed },
      left: { op: "Left", speed },
      right: { op: "Right", speed },
      zoomIn: { op: "ZoomInc", speed },
      zoomOut: { op: "ZoomDec", speed },
      stop: { op: "Stop" }
    };
    
    try {
      const opValue = action === 'stop' ? 'Stop' : ptzCommands[direction]?.op;
      if (!opValue) return reply.code(400).send({ error: "Invalid direction" });
      
      const data = await reolinkApiCall(config, "PtzCtrl", { op: opValue, channel: 0, speed: 16 });
      return data;
    } catch (err) {
      console.error("PTZ Error:", err);
      return reply.code(500).send({ error: "Failed to move camera" });
    }
  });
}
