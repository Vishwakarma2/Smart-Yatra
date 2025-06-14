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
server.listen(3000, () => {g
  console.log('✅ Backend running at http://localhost:3000');
});
