#!/bin/sh
set -e

# Run Prisma database migrations in production
if [ "$DATABASE_URL" ]; then
  echo "Database URL defined. Running Prisma migrate deploy..."
  npx prisma migrate deploy || echo "Prisma migrate deploy skipped/finished."
else
  echo "WARNING: DATABASE_URL not defined. Skipping migrations."
fi

# Run the CMD instruction passed to the docker container
exec "$@"
