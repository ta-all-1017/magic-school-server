# Railway 배포 가이드

## Railway에서 환경변수 설정

Railway 대시보드에서 다음 환경변수들을 설정해야 합니다:

### 필수 환경변수

```bash
# 서버 설정
NODE_ENV=production
PORT=3000

# MongoDB 설정 (Railway MongoDB 또는 MongoDB Atlas)
MONGODB_URI=mongodb://localhost:27017/magic-school-game

# Redis 설정 (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# CORS 설정 (배포된 프론트엔드 URL)
CLIENT_URL=https://your-frontend-domain.com

# Socket.io 설정
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000
```

## Railway 서비스 추가 (옵션)

### 1. MongoDB 추가
```bash
railway add mongodb
```

### 2. Redis 추가 (또는 Upstash 사용)
```bash
railway add redis
```

## 배포 명령어

### Railway CLI 설치
```bash
npm install -g @railway/cli
```

### 로그인
```bash
railway login
```

### 프로젝트 연결
```bash
railway link
```

### 배포
```bash
railway up
```

## 배포 후 확인사항

1. Health check 엔드포인트 확인: `https://your-app.railway.app/health`
2. 로그 확인: `railway logs`
3. 환경변수 확인: `railway variables`

## 도메인 설정

Railway에서 자동으로 제공되는 도메인 또는 커스텀 도메인을 사용할 수 있습니다.

## 주의사항

- MongoDB와 Redis 연결 정보를 정확히 설정해야 합니다.
- CLIENT_URL을 실제 프론트엔드 배포 주소로 변경해야 합니다.
- 프로덕션 환경에서는 보안을 위해 적절한 CORS 설정이 필요합니다.