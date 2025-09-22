docker run -d   --name n8n-redis   --restart unless-stopped   -p 6379:6379   redis:7-alpine   redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

## should this be on the n8n network specifically and would that be better for networking?

