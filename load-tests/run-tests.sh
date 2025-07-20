#!/bin/bash

echo "🚀 Starting User Microservice Load Tests..."

# Check if services are running
echo "📋 Checking if services are running..."
if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "❌ Service is not running on port 3000. Please start with 'docker-compose up'"
    exit 1
fi

echo "✅ Services are running!"

# Create results directory
mkdir -p results

echo ""
echo "📊 Test 1: Authentication Load Test (1000 users)"
echo "This test will gradually ramp up to 1000 concurrent users testing auth flows"
npx k6 run --out json=results/auth-test-results.json load-tests/auth-test.js

echo ""
echo "📊 Test 2: Stress Test (Finding breaking point)"
echo "This test will push the system to find its limits"
npx k6 run --out json=results/stress-test-results.json load-tests/stress-test.js

echo ""
echo "📊 Test 3: Spike Test (Sudden load increase)"
echo "This test simulates sudden traffic spikes"
npx k6 run --out json=results/spike-test-results.json load-tests/spike-test.js

echo ""
echo "🎉 All load tests completed!"
echo "📈 Check Grafana at http://localhost:3001 (admin/admin123) for real-time metrics"
echo "📊 Check Prometheus at http://localhost:9090 for detailed metrics"
echo "📄 Test results saved in ./results/ directory"