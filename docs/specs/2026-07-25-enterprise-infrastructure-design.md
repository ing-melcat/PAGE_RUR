# Enterprise Infrastructure Security & Architecture Design

## 1. Overview
This document specifies the target architecture to secure, standardize, and organize the services running on the deployment server (`100.126.20.52`). Currently, the server exposes multiple scattered ports (e.g., 8080, 9000, 3306) across disparate Docker instances and standalone services, posing security risks and creating an unmanageable environment. 

The new architecture will implement an enterprise-grade "Reverse Proxy + Internal Docker Network" pattern, enforcing zero-trust for external ports and managing all internal traffic via subdomains and automated SSL.

## 2. Architecture Components

### 2.1 Firewall (UFW/Iptables)
**Goal:** Deny all direct access to application ports.
**Rules:**
- `ALLOW 22/tcp` (SSH Administration)
- `ALLOW 80/tcp` (HTTP Traffic - redirects to HTTPS)
- `ALLOW 443/tcp` (HTTPS Traffic - terminates at proxy)
- `DENY ALL` (All other external ingress is dropped)
*Note: Existing RustDesk or special external services may need temporary bypass rules until fully migrated.*

### 2.2 Global Internal Docker Network
**Goal:** Provide secure, isolated inter-container communication.
- Create a global Docker network named `empresa_network`.
- All applications (databases, APIs, frontends) will attach to this network.
- Containers will NOT expose ports to the host via `ports:` (e.g., `- "8080:80"` is removed). They only expose ports internally using `expose:` (e.g., `- 80`).

### 2.3 Nginx Proxy Manager (NPM)
**Goal:** Serve as the unified ingress controller.
- **Deployment:** Runs as a Docker container attached to `empresa_network`.
- **Ports Exposed to Host:** `80:80`, `443:443`, `81:81` (Admin Panel - temporarily exposed or accessed via SSH tunnel until subdomain is set).
- **Features:** 
  - Terminates all SSL/TLS connections using Let's Encrypt.
  - Routes traffic based on subdomains (e.g., `app.domain.com` -> `mobile-web:80`).

### 2.4 Portainer (Centralized Management)
**Goal:** Visually manage all Docker environments and stacks.
- **Deployment:** Docker container attached to `empresa_network`.
- **Ingress:** Accessed via `admin.domain.com` through NPM, never directly.
- **Features:** Full stack lifecycle management, log viewing, and network inspection without needing CLI access.

## 3. Migration Plan (Execution Steps)

1. **Setup Core Infrastructure:**
   - Initialize `empresa_network`.
   - Deploy Nginx Proxy Manager and Portainer.
   - Configure DNS (domain A records) pointing to the server's IP.
   
2. **Secure the Host:**
   - Configure and enable UFW firewall rules.
   - Verify that all exposed ports (8080, 9000, 3306) are blocked from external access but remain accessible internally.

3. **Migrate Services:**
   - Modify `mobile-app`'s `docker-compose.yml`:
     - Remove host port mappings.
     - Connect `mobile-web` and `mobile-db` to `empresa_network`.
   - Configure NPM reverse proxy host to route `app.domain.com` to `mobile-web` port 80.
   - Provision SSL certificates via Let's Encrypt inside NPM.

## 4. Success Criteria
- [ ] No application ports (except 80, 443, 22) are reachable via public IP.
- [ ] `mobile-app` is fully accessible via a secure HTTPS subdomain.
- [ ] Portainer is managing the Docker daemon and is accessible via a secure HTTPS subdomain.
- [ ] Nginx Proxy Manager is handling all ingress routing automatically.

## 5. Out of Scope
- Migrating non-Dockerized bare-metal applications (they will remain as they are or be dockerized in a separate spec).
- Database content migration (data will persist through existing volumes).
