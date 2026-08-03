# Azure deployment guide for UniStay

## Recommended Azure architecture

- Frontend: Azure Static Web Apps
- Backend: Azure App Service
- Database: Azure Database for PostgreSQL (recommended production)
- File storage: Azure Blob Storage (recommended for uploads)
- Secrets: App Service environment variables

## Backend configuration for Azure

Set these environment variables in Azure App Service:

```text
JWT_SECRET=<long-random-secret>
CORS_ORIGINS=https://<your-static-web-app-name>.azurestaticapps.net
DB_PATH=./database/unistay.db
UPLOADS_DIR=./uploads
```

### Production startup command

Use a startup command like:

```bash
gunicorn -k uvicorn.workers.UvicornWorker app:app --bind 0.0.0.0:$PORT
```

## Frontend configuration for Azure

Set this in your frontend environment file before building:

```text
VITE_API_URL=https://<your-backend-app-service>.azurewebsites.net
```

## Deployment sequence

1. Create a Resource Group in Azure.
2. Create an Azure App Service for the FastAPI backend.
3. Add the environment variables above.
4. Deploy the backend from the GitHub repository.
5. Create an Azure Static Web App for the frontend.
6. Set the `VITE_API_URL` to the Azure App Service URL.
7. Test login, listings, admin flows, and chat.

## Note

The current project is Azure-ready for deployment semantics, but the production-grade version should migrate from local SQLite storage to PostgreSQL and Azure Blob Storage.
