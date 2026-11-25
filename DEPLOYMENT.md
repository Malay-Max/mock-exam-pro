# Production Deployment Guide: MockExam Pro

**Host Target**: Linux VPS (`mocks.malaylayek.work.gd`)  
**Architecture**: Docker Compose + Nginx Reverse Proxy Manager (NPM)  

---

## 1. Prerequisites on Linux VPS
Ensure Docker and Docker Compose v2 are installed on your Linux VPS:
```bash
docker --version
docker compose version
```

---

## 2. Deploying MockExam Pro via Docker Compose

### Step 1: Clone or Copy Repository to VPS
```bash
cd /opt
git clone <your-repo-url> mockexam-pro
cd mockexam-pro
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Generate a cryptographically secure random string for `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```
Update `.env` with:
```env
DATABASE_URL=postgres://mockexam_user:mockexam_secure_pass@db:5432/mockexam
NEXTAUTH_URL=https://mocks.malaylayek.work.gd
NEXTAUTH_SECRET=<your-generated-secret>
NODE_ENV=production
PORT=3000
```

### Step 3: Build and Launch Containers
```bash
docker compose up -d --build
```

Verify containers are running and healthy:
```bash
docker compose ps
docker compose logs -f app
```

### Step 4: Run Database Migrations and Seed Initial Syllabus
Run database migrations and seed data directly inside the running container:
```bash
# Generate and push initial schema
docker compose exec app npx drizzle-kit migrate

# Seed UPESSC & UGC-NET syllabus + authentic questions
docker compose exec app npm run db:seed
```

---

## 3. Nginx Reverse Proxy Manager (NPM) Configuration

Nginx Proxy Manager is running in a Docker container on the same VPS.

### Proxy Host Setup:
1. Log in to your Nginx Proxy Manager Web UI (typically `http://<vps-ip>:81`).
2. Navigate to **Hosts** $\rightarrow$ **Proxy Hosts** $\rightarrow$ **Add Proxy Host**.
3. **Details Tab**:
   - **Domain Names**: `mocks.malaylayek.work.gd`
   - **Scheme**: `http`
   - **Forward Hostname / IP**:
     - *If NPM is in the same Docker network*: `mockexam-app`
     - *If NPM is on host network / standard docker bridge*: `172.17.0.1` (Docker host gateway) or your VPS private IP
   - **Forward Port**: `3000`
   - **Cache Assets**: Enabled
   - **Block Common Exploits**: Enabled
   - **Websockets Support**: Enabled
4. **SSL Tab**:
   - **SSL Certificate**: Request a new SSL Certificate (Let's Encrypt)
   - **Force SSL**: Enabled
   - **HTTP/2 Support**: Enabled
   - **HSTS Enabled**: Enabled
   - Agree to Let's Encrypt Terms of Service.
5. Click **Save**.

Your application will be live at:
🌐 **`https://mocks.malaylayek.work.gd`**

---

## 4. Maintenance Commands

- **View Live Logs**:
  ```bash
  docker compose logs -f --tail=100 app
  ```
- **Restart Application**:
  ```bash
  docker compose restart app
  ```
- **Backup PostgreSQL Database**:
  ```bash
  docker compose exec -t db pg_dump -U mockexam_user mockexam > backup_$(date +%F).sql
  ```
- **Restore PostgreSQL Database**:
  ```bash
  cat backup.sql | docker compose exec -T db psql -U mockexam_user -d mockexam
  ```
