import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    // Stress test - find breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },   // Ramp up to normal load
        { duration: '5m', target: 500 },   // Stay at normal load
        { duration: '2m', target: 1000 },  // Ramp up to high load
        { duration: '5m', target: 1000 },  // Stay at high load
        { duration: '2m', target: 1500 },  // Ramp up to very high load
        { duration: '5m', target: 1500 },  // Stay at very high load
        { duration: '2m', target: 2000 },  // Ramp up to extreme load
        { duration: '5m', target: 2000 },  // Stay at extreme load
        { duration: '5m', target: 0 },     // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.15'],
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  // Mix of different endpoints
  const endpoints = [
    '/health',
    '/metrics',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const response = http.get(`${BASE_URL}${endpoint}`);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 3000ms': (r) => r.timings.duration < 3000,
  });

  sleep(Math.random() * 2 + 0.5); // Random sleep between 0.5-2.5s
}