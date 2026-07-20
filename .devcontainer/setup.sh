#!/usr/bin/env bash
# One-time setup when the Codespace is created: env, deps, database, demo data.
set -euo pipefail

# The .env is gitignored, so recreate the dev config here (SQLite + minimum HT).
if [ ! -f .env ]; then
  cat > .env <<'EOF'
DATABASE_URL="file:./dev.db"
ORDER_MINIMUM_HT_CENTS=150000
EOF
fi

npm install
npm run db:generate
npm run db:push
npm run db:seed

echo "Green Square prêt. Le serveur démarre sur le port 3000 (aperçu public)."
