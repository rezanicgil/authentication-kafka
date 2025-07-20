import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metrics
const authErrors = new Counter('auth_errors');
const registrationErrors = new Counter('registration_errors');

export const options = {
  scenarios: {
    // Ramp up to 1000 users over 5 minutes
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '3m', target: 500 },  // Ramp up to 500 users
        { duration: '3m', target: 1000 }, // Ramp up to 1000 users
        { duration: '5m', target: 1000 }, // Stay at 1000 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.1'],     // Error rate should be below 10%
    auth_errors: ['count<50'],         // Less than 50 auth errors
  },
};

const BASE_URL = 'http://localhost:3000';

export function setup() {
  // Setup function - runs once before all VUs
  console.log('Starting load test...');
  return {};
}

export default function () {
  const testUser = {
    email: `test_${Math.random().toString(36).substr(2, 9)}@example.com`,
    firstName: `TestUser${Math.random().toString(36).substr(2, 5)}`,
    lastName: `LastName${Math.random().toString(36).substr(2, 5)}`,
    password: 'password123',
  };

  // Test 1: Health check
  const healthResponse = http.get(`${BASE_URL}/health`);
  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(0.5);

  // Test 2: User registration
  const registerPayload = JSON.stringify(testUser);
  const registerParams = {
    headers: { 'Content-Type': 'application/json' },
  };

  const registerResponse = http.post(
    `${BASE_URL}/auth/register`,
    registerPayload,
    registerParams
  );

  const registerCheck = check(registerResponse, {
    'registration status is 201': (r) => r.status === 201,
    'registration response time < 1000ms': (r) => r.timings.duration < 1000,
    'registration returns user data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user && body.user.id;
      } catch (e) {
        return false;
      }
    },
  });

  if (!registerCheck) {
    registrationErrors.add(1);
  }

  sleep(0.5);

  // Test 3: User login
  const loginPayload = JSON.stringify({
    email: testUser.email,
    password: testUser.password,
  });

  const loginResponse = http.post(
    `${BASE_URL}/auth/login`,
    loginPayload,
    registerParams
  );

  let authToken = null;
  const loginCheck = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 1000ms': (r) => r.timings.duration < 1000,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r.body);
        authToken = body.token;
        return !!authToken;
      } catch (e) {
        return false;
      }
    },
  });

  if (!loginCheck) {
    authErrors.add(1);
  }

  sleep(0.5);

  // Test 4: Update user profile (if login was successful)
  if (authToken) {
    const profileParams = {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    };

    const profileUpdatePayload = JSON.stringify({
      bio: 'Updated bio from load test',
      city: 'Test City'
    });

    const profileResponse = http.put(`${BASE_URL}/users/profile`, profileUpdatePayload, profileParams);
    check(profileResponse, {
      'profile update status is 200': (r) => r.status === 200,
      'profile update response time < 500ms': (r) => r.timings.duration < 500,
      'profile update returns success message': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.message && body.message.includes('successfully');
        } catch (e) {
          return false;
        }
      },
    });

    sleep(0.5);

    // Test 5: Search users (authenticated)
    const searchResponse = http.get(
      `${BASE_URL}/users/search?search=test`,
      profileParams
    );
    check(searchResponse, {
      'search status is 200': (r) => r.status === 200,
      'search response time < 1000ms': (r) => r.timings.duration < 1000,
    });
  }

  sleep(1);
}

export function teardown(data) {
  console.log('Load test completed!');
}