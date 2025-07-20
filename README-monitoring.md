# 📊 User Microservice Monitoring & Load Testing

Bu proje artık **Prometheus + Grafana** monitoring stack'i ve **k6** load testing araçları ile donatılmıştır.

## 🚀 Hızlı Başlangıç

### 1. Tüm Servisleri Başlat
```bash
docker-compose up -d
```

### 2. Monitoring Dashboard'larına Eriş
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **User Service**: http://localhost:3000

### 3. Health Check
```bash
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

## 📈 Load Testing

### 1000 Kullanıcı Load Test Çalıştır:
```bash
cd load-tests
./run-tests.sh
```

### Bireysel Testler:
```bash
# Auth & User operations (1000 users)
npx k6 run load-tests/auth-test.js

# Stress test (breaking point)
npx k6 run load-tests/stress-test.js

# Spike test (sudden load)
npx k6 run load-tests/spike-test.js
```

## 📊 Metriklerin Açıklaması

### Health Endpoints
- `GET /health` - Database ve memory health checks
- `GET /metrics` - Prometheus formatında tüm metrikleri

### Toplanan Metrikler
- **HTTP Request Rate**: İsteklerin saniye başına sayısı
- **Response Time**: 95th percentile response time
- **Memory Usage**: Heap ve RSS memory kullanımı
- **HTTP Status Codes**: 2xx, 4xx, 5xx dağılımı
- **Database Connections**: PostgreSQL connection metrics
- **Kafka Messages**: Message processing metrics

### Load Test Senaryoları

1. **Auth Test** (auth-test.js)
   - 0 → 1000 kullanıcı (15 dakika)
   - Registration + Login + Profile endpoints
   - %95 < 2s response time hedefi

2. **Stress Test** (stress-test.js)
   - 0 → 2000 kullanıcı (breaking point testi)
   - Sistemin limitlerini bulur

3. **Spike Test** (spike-test.js)
   - Ani trafik artışı simülasyonu
   - 100 → 2000 → 100 kullanıcı

## 🎯 Test Sonuçları Analizi

### Başarı Kriterleri
- ✅ 1000 concurrent user desteği
- ✅ %95 requests < 2s response time
- ✅ Error rate < %10
- ✅ Memory usage < 150MB

### Grafana'da İzlenecek Metrikler
1. **HTTP Requests/sec** - Yük altında RPS
2. **Response Time** - P95 response time
3. **Memory Usage** - Heap ve RSS kullanımı
4. **Error Rate** - 4xx/5xx oranı
5. **Database Health** - Connection durumu

## 🔧 Troubleshooting

### Yüksek Memory Kullanımı
```bash
# Memory leak kontrolü
curl http://localhost:3000/metrics | grep nodejs_heap
```

### Yavaş Response Time
```bash
# Detaylı response time analizi
curl http://localhost:3000/metrics | grep http_request_duration
```

### Database Connection Issues
```bash
# Health check ile database durumu
curl http://localhost:3000/health
```

## 📁 Dosya Yapısı

```
├── src/
│   ├── health/          # Health check endpoints
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   └── metrics/         # Prometheus metrics
│       ├── metrics.controller.ts
│       ├── prometheus.service.ts
│       ├── metrics.interceptor.ts
│       └── metrics.module.ts
├── load-tests/          # k6 load test scripts
│   ├── auth-test.js     # 1000 user auth test
│   ├── stress-test.js   # Stress test
│   ├── spike-test.js    # Spike test
│   └── run-tests.sh     # Test runner script
├── prometheus/          # Prometheus config
│   └── prometheus.yml
└── grafana/            # Grafana dashboards
    ├── provisioning/
    └── dashboards/
```

## 🎉 Sonuç

Artık mikroservisiniz:
- ✅ Real-time monitoring (Prometheus + Grafana)
- ✅ Health checks
- ✅ 1000 kullanıcı load testing
- ✅ Performance metrics
- ✅ Tamamen ücretsiz araçlar

1000 kullanıcı yükü altında performansı izleyebilir ve bottleneck'leri tespit edebilirsiniz!