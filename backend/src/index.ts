import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import cameraRoutes from "./routes/cameras.js";
import cameraControlRoutes from "./routes/camera-control.js";
import buttonRoutes from "./routes/buttons.js";
import inventoryRoutes from "./routes/inventory.js";
import sensorRoutes from "./routes/sensors.js";
import calendarRoutes from "./routes/calendar.js";
const fastify = Fastify({ logger: true });
fastify.register(cors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return cb(null, true);
    // Allow localhost and local network IPs (192.168.x.x)
    if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }
    cb(new Error("Not allowed by CORS"), false);
  }
});

// Servir el spec OpenAPI directamente
const openapiSpec = yaml.load(
  fs.readFileSync(path.join(process.cwd(), "openapi.yaml"), "utf8")
) as Record<string, unknown>;

fastify.get("/openapi.json", async () => openapiSpec);

fastify.register(swagger, {
  openapi: openapiSpec as any,
});
fastify.register(swaggerUi, { routePrefix: "/docs" });
fastify.register(cameraRoutes);
fastify.register(cameraControlRoutes);
fastify.register(buttonRoutes);
fastify.register(inventoryRoutes);
fastify.register(sensorRoutes);
fastify.register(calendarRoutes);
fastify.get("/health", async () => ({ status: "ok" }));
const start = async () => {
  try {
    await fastify.listen({ port: parseInt(process.env.PORT || "3000"), host: "0.0.0.0" });
    console.log("Server running on http://localhost:3000");
    console.log("OpenAPI docs at http://localhost:3000/docs");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
