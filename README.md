# Clearcase refund assessment

Clearcase is a small AI-assisted customer support refund system. It includes a
customer request flow and a support desk view, with deterministic policy
decisions, an explainable audit trail, seeded JSON data, and an optional OpenAI
explanation layer.

## Screenshots
<img width="500" height="400" alt="image" src="https://github.com/user-attachments/assets/e9181fdc-4ef6-4ae3-9f99-e12c3d61d5ca" />
<img width="500" height="400" alt="image" src="https://github.com/user-attachments/assets/cd42d8d6-9222-4880-b2b3-f4ff75406efc" />
<img width="500" height="400" alt="image" src="https://github.com/user-attachments/assets/7d6d30b5-b95f-4461-ac24-1e25263bb1b8" />
<img width="500" height="400" alt="image" src="https://github.com/user-attachments/assets/2e1c7240-6e1b-4713-8f5d-8a7bcc236040" />
<img width="500" height="400" alt="image" src="https://github.com/user-attachments/assets/75744fc5-3623-4bec-bc03-b18a4a16669c" />



## Run with Docker

1. Install and start Docker Desktop, then wait until it reports that Docker is running.
2. Open a terminal in the project root, the directory containing `docker-compose.yml`.
3. (Optional) To configure Docker environment settings, create `.env` from the
   example:

   ```powershell
   Copy-Item .env.example .env
   ```

   Add your OpenAI key to `OPENAI_API_KEY` in `.env` if you want AI
   explanations. Leave it blank for demo mode. Keep
   `API_PROXY_TARGET=http://backend:4000` for Docker Compose. You can skip this
   step entirely when using demo mode.
4. Build and start both services:

	```powershell
	docker compose up --build
	```

5. Open `http://localhost:8080` for the customer request page or `http://localhost:8080/support` for the support desk.

Keep the terminal open while using the app. Press `Ctrl+C` to stop the services,
or run `docker compose down` from the project root to stop and remove the
containers.

The backend is only reachable by the frontend proxy inside Docker Compose, so
it does not claim host port `4000`. If host port `8080` is in use, change the
frontend mapping in `docker-compose.yml` from `8080:80` to `8081:80` and open
`http://localhost:8081` instead.

## Run locally

In one terminal:

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm start
```

The backend reads `backend/.env`. Add an OpenAI key there to enable AI
explanations; leave it blank to use demo mode.

In another terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The frontend env file sets `API_PROXY_TARGET=http://localhost:4000` for the
local backend. Vite usually serves the frontend at `http://localhost:5173`.
The browser calls the same-origin `/api` path; it does not receive the backend
host or any API key.

## Architecture

- `frontend`: React + Vite interface with `/request` and `/support` routes.
- `backend`: Express API for customer lookup, refund submission, policy evaluation, and audit retrieval.
- `data`: JSON-based customer, order, request, and policy records.
- `backend/src/server.js`: policy engine and AI explanation orchestration.

The backend owns the final decision. OpenAI receives the already-computed
decision, policy reasons, and relevant order context to produce a concise
explanation; it cannot override the policy engine. Without an API key, the app
returns a clearly labeled deterministic demo note.

## Policy and safeguards

Final-sale orders and orders older than 30 days are denied. Refunds above $500,
suspicious requests, and requests with insufficient context are escalated. The
API also detects common attempts to override or reveal system instructions and
escalates those requests rather than sending them to the model.

## Trade-offs

JSON storage keeps the assessment portable and easy to inspect, but it is not
intended for concurrent production writes. The policy engine is intentionally
simple and testable; a production implementation would add authentication, a
durable database, structured observability, rate limiting, and a human review
workflow.
