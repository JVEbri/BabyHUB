import mqtt from "mqtt";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://babyhub:babyhub_local@localhost:5432/babyhub",
});

const brokerUrl = process.env.MQTT_BROKER || "mosquitto";
const mqttPort = process.env.MQTT_PORT || 1883;

const client = mqtt.connect(`mqtt://${brokerUrl}:${mqttPort}`);

function extractSensorData(topicParts: string[], data: any): { temperature?: number; humidity?: number } {
  const result: { temperature?: number; humidity?: number } = {};

  // Direct status topic: shellyhtg3-xxx/status/temperature:0
  if (topicParts.length >= 3) {
    const sensorType = topicParts[2];
    if (sensorType && sensorType.startsWith("temperature")) {
      result.temperature = data.tC ?? data.tF;
    } else if (sensorType && sensorType.startsWith("humidity")) {
      result.humidity = data.rh;
    }
  }

  // Check events/rpc with params.status (Shelly format)
  if (data.params && data.params.status) {
    if (data.params.status["temperature:0"]) {
      const tempData = data.params.status["temperature:0"];
      result.temperature = tempData.tC ?? tempData.tF;
    }
    if (data.params.status["humidity:0"]) {
      const humData = data.params.status["humidity:0"];
      result.humidity = humData.rh;
    }
  }

  return result;
}

client.on("connect", () => {
  console.log(`MQTT Bridge connected to ${brokerUrl}:${mqttPort}`);
  client.subscribe("#", (err) => {
    if (err) console.error("Subscribe error:", err);
    else console.log("Subscribed to ALL MQTT topics");
  });
});

client.on("message", async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const topicParts = topic.split("/");
    if (topicParts.length < 2) return;

    const deviceId = topicParts[0];
    const { temperature, humidity } = extractSensorData(topicParts, data);

    // Find camera by sensor_device_id
    const { rows } = await pool.query(
      "SELECT id FROM cameras WHERE sensor_device_id = $1",
      [deviceId]
    );

    if (rows.length === 0) {
      console.log(`No camera associated with device ${deviceId}`);
      return;
    }

    const cameraId = rows[0].id;

    if (temperature !== undefined && temperature !== null) {
      const tempValue = Number(temperature);
      if (!isNaN(tempValue)) {
        await pool.query(
          `INSERT INTO sensor_readings (temperature, camera_id, created_at)
             VALUES ($1, $2, NOW())`,
          [tempValue, cameraId]
        );
        console.log(`Saved temperature ${tempValue}C for device ${deviceId}`);
      }
    }

    if (humidity !== undefined && humidity !== null) {
      const humValue = Number(humidity);
      if (!isNaN(humValue)) {
        await pool.query(
          `INSERT INTO sensor_readings (humidity, camera_id, created_at)
             VALUES ($1, $2, NOW())`,
          [humValue, cameraId]
        );
        console.log(`Saved humidity ${humValue}% for device ${deviceId}`);
      }
    }
  } catch (err) {
    console.error("Error processing MQTT message:", err);
  }
});

client.on("error", (err) => {
  console.error("MQTT error:", err);
});

process.on("SIGINT", () => {
  client.end(() => {
    pool.end();
    process.exit(0);
  });
});

console.log("MQTT Bridge started, listening for Shelly sensor data...");
