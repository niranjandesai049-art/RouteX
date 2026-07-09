import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';

// k6 Virtual User Ramping Configuration representing Load Profiles
export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp up to 100 VUs
    { duration: '1m', target: 100 },    // Sustained 100 VUs load
    { duration: '30s', target: 1000 },  // Scale load to 1000 VUs
    { duration: '2m', target: 1000 },   // Sustained 1000 VUs load
    { duration: '30s', target: 0 },      // Ramp down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests must complete under 500ms
    http_req_failed: ['rate<0.01'],     // Packet loss / error rate must be under 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001/socket.io/?EIO=4&transport=websocket';

export default function () {
  // 1. Health Probe Verification
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });
  sleep(1);

  // 2. Authentication Flow (Simulating driver / shipper logins)
  const loginPayload = JSON.stringify({ phone: '+919999999999' });
  const loginHeaders = { 'Content-Type': 'application/json' };
  
  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, { headers: loginHeaders });
  const isLoginOk = check(loginRes, {
    'login returns 201': (r) => r.status === 201,
    'jwt token is present': (r) => JSON.parse(r.body).accessToken !== undefined,
  });

  let token = '';
  if (isLoginOk) {
    token = JSON.parse(loginRes.body).accessToken;
  }
  sleep(2);

  // If login failed, skip authenticated requests
  if (!token) return;

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 3. Create Booking Flow (Shipper simulation)
  const bookingPayload = JSON.stringify({
    pickup: 'Delhi International Airport',
    destination: 'Mumbai Freight Hub',
    weightTons: 12.5,
    category: 'Container',
    distanceKm: 1400,
    fuelPrice: 94.20,
    demandLevel: 'high',
  });

  const bookingRes = http.post(`${BASE_URL}/bookings`, bookingPayload, { headers: authHeaders });
  const isBookingOk = check(bookingRes, {
    'booking creation is 201': (r) => r.status === 201,
    'booking ID returned': (r) => JSON.parse(r.body).id !== undefined,
  });

  let bookingId = '';
  if (isBookingOk) {
    bookingId = JSON.parse(bookingRes.body).id;
  }
  sleep(3);

  // 4. Fetch Bookings Ledger
  const getBookingsRes = http.get(`${BASE_URL}/bookings`, { headers: authHeaders });
  check(getBookingsRes, {
    'fetch bookings returned 200': (r) => r.status === 200,
  });
  sleep(2);

  // 5. WebSocket Live Telemetry Simulation (Driver GPS connection)
  if (bookingId) {
    ws.connect(WS_URL, {}, function (socket) {
      socket.on('open', () => {
        // Socket.IO expects initial handshake / join payload
        socket.send('40'); // Socket.IO CONNECT packet
        sleep(0.5);

        // Join room
        socket.send(`42["driver:join",{"driverId":"test-driver-id"}]`);
        sleep(1);

        // Periodically emit telemetry coordinates
        for (let i = 0; i < 5; i++) {
          const lat = 28.6139 + (Math.random() - 0.5) * 0.1;
          const lng = 77.2090 + (Math.random() - 0.5) * 0.1;
          socket.send(`42["driver:locationUpdate",{"driverId":"test-driver-id","bookingId":"${bookingId}","latitude":${lat},"longitude":${lng}}]`);
          sleep(2);
        }

        socket.close();
      });

      socket.on('error', (err) => {
        console.error(`WebSocket connection failed: ${err.error()}`);
      });
    });
  }
}
