const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

const busLocations = {};  // Stores latest location for each bus

// Bus updates location
app.post('/api/bus/update-location', (req, res) => {
  const { busId, latitude, longitude } = req.body;

  if (!busId || !latitude || !longitude) {
    return res.status(400).send({ error: 'Missing busId, latitude or longitude' });
  }

  busLocations[busId] = {
    latitude,
    longitude,
    timestamp: new Date()
  };

  console.log(`Bus ${busId} updated:`, busLocations[busId]);

  io.emit('bus-location', { busId, latitude, longitude });

  res.send({ message: 'Location updated' });
});

// Get latest location for bus
app.get('/api/bus/:busId/location', (req, res) => {
  const busId = req.params.busId;
  const location = busLocations[busId];

  if (!location) {
    return res.status(404).send({ error: 'Bus not found' });
  }

  res.send(location);
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Frontend connected');

  // Send current bus locations on connect
  socket.emit('all-bus-locations', busLocations);

  socket.on('disconnect', () => {
    console.log('Frontend disconnected');
  });
});

// Start server
server.listen(3000, () => {
  console.log('✅ Backend running at http://localhost:3000');
});

// Dummy data for demonstration
const routes = {
    "route1": ["stopA", "stopB", "stopC"],
    "route2": ["stopD", "stopE", "stopF"],
  };
  
  const busRouteMap = {
    1: "route1",
    2: "route2",
  };
  
  const busCrowdLevels = {
    1: 15,  // 15 people approx on bus 1
    2: 30,
  };
  
  const userFeedback = [];  // Store feedback entries { busId, language, message, timestamp }
  
  const tripHistories = {}; // Store trips per userId (or busId) for history
  
  // Get bus routes
  app.get('/api/routes', (req, res) => {
    res.send(routes);
  });
  
  // Get buses by route
  app.get('/api/buses/route/:routeId', (req, res) => {
    const routeId = req.params.routeId;
    const busesOnRoute = Object.entries(busRouteMap)
      .filter(([busId, route]) => route === routeId)
      .map(([busId]) => ({ busId: Number(busId), location: busLocations[busId] || null }));
  
    res.send(busesOnRoute);
  });
  
  // Get crowd estimation for a bus
  app.get('/api/bus/:busId/crowd', (req, res) => {
    const busId = req.params.busId;
    const crowd = busCrowdLevels[busId] || 0;
    res.send({ busId, crowd });
  });
  
  // Submit user feedback
  app.post('/api/bus/:busId/feedback', (req, res) => {
    const busId = req.params.busId;
    const { language, message } = req.body;
    if (!language || !message) return res.status(400).send({ error: 'Missing language or message' });
  
    userFeedback.push({ busId, language, message, timestamp: new Date() });
    res.send({ message: 'Feedback submitted' });
  });
  
  // Get trip history for a user (dummy example)
  app.get('/api/user/:userId/trips', (req, res) => {
    const userId = req.params.userId;
    const trips = tripHistories[userId] || [];
    res.send(trips);
  });
  
  // Nearby bus stops - simplified static data example
  const busStops = [
    { id: "stopA", name: "Central Park", latitude: 27.7, longitude: 85.3 },
    { id: "stopB", name: "City Mall", latitude: 27.71, longitude: 85.31 },
    { id: "stopC", name: "Bus Terminal", latitude: 27.72, longitude: 85.32 },
  ];
  
  // Get nearby stops (simple filter by lat/lon range)
  app.get('/api/bus-stops/nearby', (req, res) => {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) return res.status(400).send({ error: 'Missing latitude or longitude' });
  
    // Simple filter: stops within 0.02 degrees ~ 2km radius approx
    const nearby = busStops.filter(stop =>
      Math.abs(stop.latitude - latitude) < 0.02 && Math.abs(stop.longitude - longitude) < 0.02
    );
    res.send(nearby);
  });
  