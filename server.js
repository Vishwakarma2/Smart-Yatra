const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

// In-memory data stores
const busLocations = {};       // { busId: { latitude, longitude, timestamp } }
const routes = {
  route1: ['stopA', 'stopB', 'stopC'],
  route2: ['stopD', 'stopE', 'stopF'],
};
const busRouteMap = {
  1: 'route1',
  2: 'route2',
};
const busCrowdLevels = {
  1: 15,
  2: 30,
};
const userFeedback = [];       // [{ busId, language, message, timestamp }]
const tripHistories = {};      // { userId: [{ trip data }] }
const busStops = [
  { id: 'stopA', name: 'Central Park', latitude: 27.7, longitude: 85.3 },
  { id: 'stopB', name: 'City Mall', latitude: 27.71, longitude: 85.31 },
  { id: 'stopC', name: 'Bus Terminal', latitude: 27.72, longitude: 85.32 },
];

// Serve frontend HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Bus location update ---
app.post('/api/bus/update-location', (req, res) => {
  const { busId, latitude, longitude } = req.body;

  if (!busId || !latitude || !longitude) {
    return res.status(400).json({ error: 'Missing busId, latitude or longitude' });
  }

  busLocations[busId] = {
    latitude,
    longitude,
    timestamp: new Date(),
  };

  console.log(`Bus ${busId} location updated:`, busLocations[busId]);

  io.emit('bus-location', { busId, latitude, longitude });

  res.json({ message: 'Location updated' });
});

// --- Get latest location for a bus ---
app.get('/api/bus/:busId/location', (req, res) => {
  const { busId } = req.params;
  const location = busLocations[busId];

  if (!location) return res.status(404).json({ error: 'Bus not found' });

  res.json(location);
});

// --- Get all routes ---
app.get('/api/routes', (req, res) => {
  res.json(routes);
});

// --- Get buses on a route ---
app.get('/api/buses/route/:routeId', (req, res) => {
  const { routeId } = req.params;
  const buses = Object.entries(busRouteMap)
    .filter(([, route]) => route === routeId)
    .map(([busId]) => ({
      busId: Number(busId),
      location: busLocations[busId] || null,
    }));

  res.json(buses);
});

// --- Get crowd estimation for a bus ---
app.get('/api/bus/:busId/crowd', (req, res) => {
  const { busId } = req.params;
  const crowd = busCrowdLevels[busId] || 0;
  res.json({ busId, crowd });
});

// --- Submit user feedback ---
app.post('/api/bus/:busId/feedback', (req, res) => {
  const { busId } = req.params;
  const { language, message } = req.body;

  if (!language || !message) return res.status(400).json({ error: 'Missing language or message' });

  userFeedback.push({ busId, language, message, timestamp: new Date() });

  res.json({ message: 'Feedback submitted' });
});

// --- Get trip history for a user ---
app.get('/api/user/:userId/trips', (req, res) => {
  const { userId } = req.params;
  const trips = tripHistories[userId] || [];
  res.json(trips);
});

// --- Get nearby bus stops ---
app.get('/api/bus-stops/nearby', (req, res) => {
  let { latitude, longitude } = req.query;
  if (!latitude || !longitude) return res.status(400).json({ error: 'Missing latitude or longitude' });

  latitude = parseFloat(latitude);
  longitude = parseFloat(longitude);

  const nearbyStops = busStops.filter(
    (stop) =>
      Math.abs(stop.latitude - latitude) < 0.02 && Math.abs(stop.longitude - longitude) < 0.02
  );

  res.json(nearbyStops);
});

// --- WebSocket: handle frontend connections ---
io.on('connection', (socket) => {
  console.log('Frontend connected');

  // Send all current bus locations to new client
  socket.emit('all-bus-locations', busLocations);

  socket.on('disconnect', () => {
    console.log('Frontend disconnected');
  });
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});