import Redis from 'ioredis';

let redisClient: Redis | null = null;

export const connectRedis = async (): Promise<void> => {
  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!redisUrl || !redisToken) {
      console.warn('Redis configuration not found. Running without Redis cache.');
      return;
    }
    
    redisClient = new Redis({
      host: redisUrl.replace('https://', '').replace('http://', ''),
      port: 443,
      password: redisToken,
      tls: {
        rejectUnauthorized: false
      },
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });
    
    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    
    await redisClient.ping();
    
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    console.warn('Continuing without Redis cache');
  }
};

export const getRedisClient = (): Redis | null => {
  return redisClient;
};

export const setCache = async (key: string, value: any, ttl?: number): Promise<void> => {
  if (!redisClient) return;
  
  try {
    const stringValue = JSON.stringify(value);
    if (ttl) {
      await redisClient.setex(key, ttl, stringValue);
    } else {
      await redisClient.set(key, stringValue);
    }
  } catch (error) {
    console.error('Redis set error:', error);
  }
};

export const getCache = async (key: string): Promise<any> => {
  if (!redisClient) return null;
  
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  if (!redisClient) return;
  
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
};