# Book Translation App - Production Deployment Guide

This guide provides instructions for deploying the Book Translation App in a production environment.

## Prerequisites

- Linux server with Docker and Docker Compose installed
- Domain name with DNS configured to point to your server
- SSL certificate for your domain (recommended)
- API keys for translation services (DeepL, Microsoft Translator, Amazon Translate)

## System Requirements

- Minimum 4GB RAM
- 2+ CPU cores
- 20GB+ storage space
- Good internet connection

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/book-translation-app.git
cd book-translation-app
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Server Configuration
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb://mongo:27017/translation-app
JWT_SECRET=your_secure_jwt_secret_here

# API Keys for Translation Services
DEEPL_API_KEY=your_deepl_api_key
MS_TRANSLATOR_KEY=your_microsoft_translator_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# Client Configuration
REACT_APP_API_URL=https://your-domain.com/api
```

### 3. Build for Production

Build the client application:

```bash
cd client
npm install
npm run build
cd ..
```

### 4. Setup Docker Compose for Production

Update the `docker-compose.prod.yml` file with your specific settings:

```yaml
version: '3.8'

services:
  client:
    build:
      context: ./client
      dockerfile: ../docker/Dockerfile.client.prod
    restart: always
    environment:
      - NODE_ENV=production
    volumes:
      - client-build:/app/build

  server:
    build:
      context: ./server
      dockerfile: ../docker/Dockerfile.server
    restart: always
    env_file: .env
    volumes:
      - ./translations:/app/translations
      - ./uploads:/app/uploads

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - client-build:/usr/share/nginx/html
    depends_on:
      - client
      - server

  mongo:
    image: mongo:latest
    restart: always
    volumes:
      - mongo-data:/data/db

  redis:
    image: redis:alpine
    restart: always
    volumes:
      - redis-data:/data

volumes:
  client-build:
  mongo-data:
  redis-data:
```

### 5. Configure Nginx

Create the Nginx configuration files:

```bash
mkdir -p nginx/conf.d nginx/ssl
```

Create `nginx/conf.d/default.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    
    # Client App
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        
        # Caching
        expires 1d;
        add_header Cache-Control "public, max-age=86400";
    }
    
    # API Endpoints
    location /api {
        proxy_pass http://server:5000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Large file upload support
        client_max_body_size 100M;
    }
}
```

### 6. Copy SSL Certificates

Copy your SSL certificates to the `nginx/ssl` directory:

```bash
cp /path/to/your/fullchain.pem nginx/ssl/
cp /path/to/your/privkey.pem nginx/ssl/
```

### 7. Start the Application

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 8. Setup Automated Backups

Create a backup script `backup.sh`:

```bash
#!/bin/bash

# Backup directory
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup MongoDB
docker exec translation-mongo mongodump --out=/dump
docker cp translation-mongo:/dump $BACKUP_DIR/mongo-$DATE

# Backup translations and uploads directories
tar -zcf $BACKUP_DIR/files-$DATE.tar.gz translations uploads

# Remove backups older than 30 days
find $BACKUP_DIR -type d -name "mongo-*" -mtime +30 -exec rm -rf {} \;
find $BACKUP_DIR -type f -name "files-*.tar.gz" -mtime +30 -exec rm {} \;
```

Add to crontab for daily backups:

```bash
chmod +x backup.sh
crontab -e
# Add the line: 0 3 * * * /path/to/book-translation-app/backup.sh
```

## Monitoring and Maintenance

### Setup Monitoring

Install and configure Prometheus and Grafana for monitoring:

```bash
# Create monitoring directory
mkdir -p monitoring/prometheus monitoring/grafana

# Create prometheus.yml
cat > monitoring/prometheus/prometheus.yml << EOL
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
      
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
EOL

# Add monitoring services to docker-compose
# Add the following services to your docker-compose.prod.yml
```

```yaml
  node-exporter:
    image: prom/node-exporter
    restart: always
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'

  cadvisor:
    image: gcr.io/cadvisor/cadvisor
    restart: always
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro

  prometheus:
    image: prom/prometheus
    restart: always
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus:/etc/prometheus
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=your_secure_password
```

### Log Management

Configure log rotation to manage log file sizes:

```bash
# Create logrotate configuration
cat > /etc/logrotate.d/translation-app << EOL
/path/to/book-translation-app/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 root root
}
EOL
```

## Scaling the Application

To scale the application for higher loads:

1. Increase resources for MongoDB:
   ```yaml
   mongo:
     deploy:
       resources:
         limits:
           cpus: '2'
           memory: 4G
   ```

2. Scale server instances:
   ```yaml
   server:
     deploy:
       replicas: 3
       resources:
         limits:
           cpus: '1'
           memory: 2G
   ```

3. Add load balancing:
   ```yaml
   nginx:
     deploy:
       replicas: 2
   ```

## Troubleshooting

### Common Issues and Solutions

1. **Database Connection Issues**
   - Check MongoDB container logs: `docker logs translation-mongo`
   - Verify MongoDB is running: `docker exec -it translation-mongo mongo`

2. **API Not Accessible**
   - Check Nginx logs: `docker logs translation-nginx`
   - Verify server logs: `docker logs translation-server`

3. **File Upload Failures**
   - Check file permissions in the uploads directory
   - Verify Nginx client_max_body_size setting

4. **SSL Certificate Issues**
   - Ensure certificates are properly installed
   - Check certificate expiry: `openssl x509 -enddate -noout -in nginx/ssl/fullchain.pem`

## Security Considerations

1. **API Key Protection**
   - Store API keys in environment variables, never in code
   - Rotate API keys regularly

2. **User Authentication**
   - Implement strong password policies
   - Consider adding two-factor authentication for admin users

3. **Regular Updates**
   - Keep all dependencies updated to patch security vulnerabilities
   - Use `npm audit` regularly to check for security issues

## Support and Resources

- Translation Service Documentation:
  - DeepL API: https://www.deepl.com/docs-api
  - Microsoft Translator: https://docs.microsoft.com/en-us/azure/cognitive-services/translator/
  - Amazon Translate: https://docs.aws.amazon.com/translate/

---

For additional support, contact the development team at support@example.com
