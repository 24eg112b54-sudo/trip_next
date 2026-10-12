# TripNest

TripNest is a static HTML/CSS/JavaScript accommodation marketplace with a Spring Boot REST API backed by a MySQL-compatible TiDB database.

## Stack

- Frontend: dependency-free HTML, CSS, and browser JavaScript
- Backend: Java 17, Spring Boot 3.4.10, Spring Security, JPA, Flyway
- Database: MySQL-compatible TiDB
- Authentication: BCrypt password hashing and signed JWTs

## Local setup on Windows

1. Copy the safe template and fill in your own values:

```powershell
Copy-Item .env.example .env
```

Spring Boot does not load `.env` automatically. Load it into the current PowerShell session without printing secrets:

```powershell
Get-Content .env | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' } | ForEach-Object {
  $pair = $_ -split '=', 2
  Set-Item -Path ('Env:' + $pair[0]) -Value $pair[1]
}
```

2. Start the backend:

```powershell
mvn spring-boot:run -f backend/pom.xml
```

If Maven is not installed globally, the project can be built with the local Maven distribution used during development:

```powershell
& .tools\apache-maven-3.9.9\bin\mvn.cmd -f backend/pom.xml clean test package
java -jar backend\target\tripnest-backend-1.0.0.jar
```

3. Start the frontend in another PowerShell window:

```powershell
node frontend/server.mjs
```

Open http://127.0.0.1:5500/ and check http://127.0.0.1:8080/api/health.

## Implemented functionality

- Search by destination/property name
- Real filters for property type, amenity, price range, rating, and sorting
- Pagination parameters on accommodation search (`offset` and `limit`)
- Property details, images, amenities, and booking flow
- JWT registration/login and protected routes
- User dashboard with upcoming/past trips and saved stays
- Persistent wishlist with duplicate protection
- Server-side price and tax calculation
- Transactional date-overlap checks to prevent double booking
- Booking history and cancellation ownership checks
- Protected admin accommodation and booking management
- Database-backed admin statistics
- Flyway migrations and safe TiDB schema initialization
- Light/dark theme support and local CORS support for both localhost forms

## Database configuration

`DB_URL` must be a JDBC URL such as:

```text
jdbc:mysql://host:4000/database
```

The database user must be able to create and migrate the application schema. The configured TiDB `test` schema is used by the local environment. Do not point the application at a read-only system schema such as `sys`.

Flyway runs migrations V1 through V4 at startup. The application never substitutes fake data when the database is unavailable.

## Deployment notes

The backend can be deployed from `backend/` using the included Dockerfile or as a Java 17 service. Set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, and `FRONTEND_ORIGIN` in the deployment platform. `FRONTEND_ORIGIN` may contain comma-separated trusted origins.

The frontend is static and can be served by Vercel or any static host. Its API URL is currently configured in `frontend/assets/js/app.js` through `window.TRIPNEST_API`, defaulting to `http://localhost:8080/api`; configure that value for a deployed frontend before production use.

Never commit `.env`, database passwords, JWT secrets, private keys, or generated build output.
