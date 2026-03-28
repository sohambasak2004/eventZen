# EventZen Docker Setup

## Run the full stack

From the repo root:

```powershell
docker compose up -d --build
```

## Exposed services

- Frontend: `http://localhost:5173`
- Auth service: `http://localhost:8081`
- Venue/vendor service: `http://localhost:3001`
- Event service: `http://localhost:3002`
- Booking service: `http://localhost:8082`
- MongoDB: `mongodb://localhost:27017`
- MySQL: `localhost:3306`

## Notes

- The compose file reuses `backend/services/auth-service/public.pem` so JWT validation stays consistent across services.
- The auth service uses the bundled RSA keypair and seeds the default admin user with:

```text
email: admin@eventzen.com
password: Admin@1234
```

- The frontend is built with Vite environment variables at image build time. If you want different public API URLs, update the `frontend` build args in [docker-compose.yml](d:\eventZen\docker-compose.yml).

## Stop the stack

```powershell
docker compose down
```

To also remove volumes:

```powershell
docker compose down -v
```
