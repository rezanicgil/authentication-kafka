import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    // Spike test - sudden load increase
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },   // Normal load
        { duration: '1m', target: 100 },    // Stay at normal load
        { duration: '10s', target: 2000 },  // Spike to 2000 users
        { duration: '1m', target: 2000 },   // Stay at spike
        { duration: '10s', target: 100 },   // Drop back to normal
        { duration: '1m', target: 100 },    // Stay at normal
        { duration: '10s', target: 0 },     // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'], // More lenient during spike
    http_req_failed: ['rate<0.2'],     // Higher error tolerance
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  // Simple health check during spike
  const response = http.get(`${BASE_URL}/health`);
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 5000ms': (r) => r.timings.duration < 5000,
  });

  sleep(1);
}