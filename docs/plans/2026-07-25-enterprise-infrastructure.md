# Enterprise Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure the server by establishing a global Docker network, deploying Nginx Proxy Manager and Portainer, and migrating the existing mobile-app behind the proxy while closing external ports via UFW (while preserving Tailscale connectivity).

**Architecture:** We will create a global Docker network (`empresa_network`), deploy management containers (Portainer, NPM), migrate the `mobile-app` compose file to use this network without exposing host ports, and finally lock down the UFW firewall ensuring Tailscale rules are preserved.

**Tech Stack:** Docker, Docker Compose, Nginx Proxy Manager, Portainer, UFW.

## Global Constraints

- All services must connect to `empresa_network`.
- No application container (web/db/etc) can expose ports directly to the host (no `ports:` mapping for app traffic).
- Only ports 22, 80, 443, and Tailscale (UDP 41641 & interface tailscale0) are allowed through the firewall externally.

---

### Task 1: Initialize Global Network & Management Stack

**Files:**
- Create: `/home/rur/Servidor/management/docker-compose.yml`

**Interfaces:**
- Produces: `empresa_network` (external docker network), NPM running on 80/443/81, Portainer running on 9000.

- [ ] **Step 1: Create the global docker network**

```bash
docker network create empresa_network
```

- [ ] **Step 2: Verify network creation**

Run: `docker network ls | grep empresa_network`
Expected: Output showing `empresa_network`

- [ ] **Step 3: Scaffold management docker-compose.yml**

Write the following to `/home/rur/Servidor/management/docker-compose.yml`:

```yaml
version: '3.8'
services:
  npm:
    image: 'jc21/nginx-proxy-manager:latest'
    container_name: npm
    restart: always
    ports:
      - '80:80'
      - '81:81'
      - '443:443'
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    networks:
      - empresa_network

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    security_opt:
      - no-new-privileges:true
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./portainer-data:/data
    networks:
      - empresa_network

networks:
  empresa_network:
    external: true
```

- [ ] **Step 4: Launch management stack**

Run: `cd /home/rur/Servidor/management && docker compose up -d`
Expected: NPM and Portainer containers start successfully.

- [ ] **Step 5: Verify management stack**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:81`
Expected: `200` (NPM interface responds)

- [ ] **Step 6: Commit changes**

```bash
cd /home/rur/Servidor/management
git init
git add docker-compose.yml
git commit -m "feat: setup NPM and Portainer management stack"
```

---

### Task 2: Migrate Mobile App to Isolated Network

**Files:**
- Modify: `/home/rur/Servidor/mobile-app/mobile/docker-compose.yml`

**Interfaces:**
- Consumes: `empresa_network` from Task 1.
- Produces: `mobile-web` serving strictly on `empresa_network` without host port `8080`.

- [ ] **Step 1: Update docker-compose.yml for mobile-app**

Read `/home/rur/Servidor/mobile-app/mobile/docker-compose.yml`. Replace the `web` service ports and networks section. Remove the `8080:80` port mapping and change `rur_network` to `empresa_network`.

Modify the networks definition at the bottom:
```yaml
networks:
  empresa_network:
    external: true
```

Make sure both `web` and `db` are connected to `empresa_network`.

- [ ] **Step 2: Apply the changes**

Run: `cd /home/rur/Servidor/mobile-app/mobile && docker compose down && docker compose up -d`
Expected: Containers recreate without errors.

- [ ] **Step 3: Verify isolation**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 || echo "Connection refused"`
Expected: `Connection refused` (port 8080 is no longer listening on host)

Run: `docker run --rm --network empresa_network curlimages/curl -s -o /dev/null -w "%{http_code}" http://mobile-web-1:80`
Expected: `200` (Internal network routing works)

- [ ] **Step 4: Commit changes**

```bash
cd /home/rur/Servidor/mobile-app/mobile
git add docker-compose.yml
git commit -m "chore: migrate to global empresa_network and remove host ports"
```

---

### Task 3: Secure the Host Firewall (UFW) with Tailscale

**Files:**
- System level (ufw commands)

**Interfaces:**
- Consumes: SSH access, Tailscale access.
- Produces: Fully secured host ensuring VPN is unaffected.

- [ ] **Step 1: Allow Tailscale Interface and Port**

```bash
sudo ufw allow in on tailscale0
sudo ufw allow 41641/udp
```

- [ ] **Step 2: Allow critical web and ssh ports**

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

- [ ] **Step 3: Set default UFW policies**

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

- [ ] **Step 4: Enable UFW**

```bash
sudo ufw --force enable
```

- [ ] **Step 5: Verify Firewall Rules**

Run: `sudo ufw status numbered`
Expected: Status is `active` and 22, 80, 443, 41641, and tailscale0 are allowed.
