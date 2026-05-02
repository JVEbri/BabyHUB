const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

const RTSP_URL = process.env.RTSP_URL || "rtsp://admin:joselito88@192.168.1.115";

// Audio analysis state
let currentVolume = 0;
let isAnalyzing = false;
let wsClients = new Set();

// Start FFmpeg to analyze audio only
function startAudioAnalysis() {
  if (isAnalyzing) return;
  isAnalyzing = true;

  console.log('Starting audio analysis from:', RTSP_URL);

  const ffmpeg = spawn('ffmpeg', [
    '-rtsp_transport', 'tcp',
    '-i', RTSP_URL,
    '-vn',                    // No video
    '-acodec', 'pcm_s16le',    // Raw PCM audio
    '-ar', '16000',             // 16kHz sample rate
    '-ac', '1',                // Mono
    '-f', 's16le',             // Output format
    'pipe:1'                 // Output to stdout
  ]);

  let totalSamples = 0;
  let sumVolume = 0;

  ffmpeg.stdout.on('data', (chunk) => {
    // Analyze PCM audio data (16-bit signed little-endian)
    const samples = new Int16Array(chunk.length / 2);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = chunk.readInt16LE(i * 2);
    }

    // Calculate RMS (Root Mean Square) volume
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sum / samples.length);
    
    // Normalize to 0-100 scale (multiply by 10000 to amplify quiet sounds)
    const normalizedVolume = Math.min(100, (rms / 32767) * 10000);
    
    currentVolume = Math.round(normalizedVolume);

    // Broadcast to all WebSocket clients
    const message = JSON.stringify({ volume: currentVolume });
    wsClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  });

  ffmpeg.stderr.on('data', (data) => {
    // Uncomment for debugging: console.log('FFmpeg:', data.toString());
  });

  ffmpeg.on('exit', (code) => {
    console.log('FFmpeg audio analysis exited with code:', code);
    isAnalyzing = false;
    
    // Restart after delay
    setTimeout(startAudioAnalysis, 5000);
  });
}

// HTTP API + WebSocket server
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/volume' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ volume: currentVolume }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// WebSocket server - allow connections from local network
const wss = new WebSocket.Server({ 
  server,
  verifyClient: (info, done) => {
    const origin = info.origin || info.req.headers.origin || '';
    
    // Allow requests with no origin or from local network
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin)) {
      return done(true);
    }
    
    done(false, 403, 'Forbidden');
  }
});

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  wsClients.add(ws);

  // Send current volume immediately
  ws.send(JSON.stringify({ volume: currentVolume }));

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    wsClients.delete(ws);
  });
});

server.listen(9002, '0.0.0.0', () => {
  console.log('Audio analysis API listening on port 9002');
  console.log('GET http://localhost:9002/volume');
  console.log('WebSocket ws://localhost:9002');
  
  // Start audio analysis
  startAudioAnalysis();
});
