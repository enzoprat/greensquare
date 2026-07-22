#!/usr/bin/env bash
# One-time setup when the Codespace is created: env, deps, database, demo data.
set -euo pipefail

# Start the local PostgreSQL bundled by the devcontainer feature and create a db.
sudo service postgresql start || true
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" || true
sudo -u postgres psql -c "CREATE DATABASE greensquare;" || true

# The .env is gitignored, so recreate the dev config here (Postgres + minimum HT).
if [ ! -f .env ]; then
  cat > .env <<'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/greensquare?schema=public"
ORDER_MINIMUM_HT_CENTS=150000
EOF
fi

npm install
# Push schema, load the committed Mondial Food catalogue, enrich + activate demo data.
npm run db:setup

echo "Green Square prêt. Le serveur démarre sur le port 3000 (aperçu public)."
