#!/usr/bin/env bash

export APP_NAME=devclub
export DB_LOCATION="/var/lib/$APP_NAME/db.sqlite3"
export DB_BACKUP="/mnt/backup"

NVM_VERSION=v0.39.7
NODE_VERSION="22.1.0"
LITESTREAM_VERSION="v0.3.13"

# Ensure all required environment variables are present
REQUIRED_ENV_VARS=("DOMAIN")
for var in "${REQUIRED_ENV_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Environment variable $var is not set."
    exit 1
  fi
done

# Install Litestream

if ! command -v litestream &>/dev/null || [ "$(litestream version)" != "$LITESTREAM_VERSION" ]; then
  arch=$(dpkg --print-architecture)
  url=https://github.com/benbjohnson/litestream/releases/download/$LITESTREAM_VERSION/litestream-$LITESTREAM_VERSION-linux-$arch.deb
  if ! curl -fLo litestream.deb "$url"; then
    echo "Error: Failed to download $url"
    exit 1
  fi
  sudo dpkg -i -y litestream.deb
  rm litestream.deb
  echo "Litestream version $LITESTREAM_VERSION installed successfully."
fi

# Create litestream.yml config file for continuous data replication
LITESTREAM_CONFIG=$(
  cat <<EOF
dbs:
  - path: $DB_LOCATION
    replicas:
      - url: file:$DB_BACKUP
EOF
)

echo "$LITESTREAM_CONFIG" | sudo tee /etc/litestream.yml >/dev/null

sudo systemctl enable litestream
sudo systemctl restart litestream

# Download and install NVM
if [ ! -d "$HOME/.nvm" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh | bash
fi

# Source NVM to make it available in the current session
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node
NODE_DIR="$HOME/.nvm/versions/node/v$NODE_VERSION"
if [ ! -d "$NODE_DIR" ]; then
  nvm install "$NODE_VERSION"
fi

# Set Node version
nvm use "$NODE_VERSION"

# Install PM2
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
  # Make sure PM2 starts automatically on boot
  sudo env PATH=$PATH:$NODE_DIR/bin $NODE_DIR/lib/node_modules/pm2/bin/pm2 startup systemd -u "$whoami" --hp "$HOME" --service-name pm2
fi

# Create logrotate configuration for application logs
LOGROTATE_CONFIG=$(
  cat <<EOF
$HOME/.pm2/logs/*.log {
    su devops devops
    daily
    rotate 7
    copytruncate
    missingok
    notifempty
    compress
    delaycompress
    dateext
    dateformat -%Y%m%d
    create 640 devops devops
EOF
)
echo "$LOGROTATE_CONFIG" | sudo tee /etc/logrotate.d/pm2 >/dev/null

# Determine deploy node
CURRENT_NODE=$(head -n 1 /etc/caddy/Caddyfile | grep -oE '#(green|blue)' | sed 's/#//')
if [ -z "$CURRENT_NODE" ] || [ "$CURRENT_NODE" == "green" ]; then
  DEPLOY_NODE="blue"
  DEPLOY_PORT=3000
  OLD_NODE="green"
else
  DEPLOY_NODE="green"
  DEPLOY_PORT=3001
  OLD_NODE="blue"
fi

echo "Current node is $CURRENT_NODE. Will deploy to $DEPLOY_NODE"

# ~/latest becomes ~/<deploy node>
rm -rf ~/$DEPLOY_NODE
mv -f "$HOME/latest" "$HOME/$DEPLOY_NODE"

# Grant "devops" user +rwx access to $HOME and subdirectories (because rsync preserves permissions of the source)
# Grant users other than "devops" +rx access to $HOME and subdirectories (for Caddy)
sudo chmod -R u+rwx,o+rx "$HOME"

# Install dependencies
cd ~/$DEPLOY_NODE || exit
npm ci --production

# If <deploy node> is running, stop it
# https://github.com/Unitech/pm2/issues/325
pm2 stop -s "$APP_NAME-$DEPLOY_NODE" || ':'

# Migrate database
DB_LOCATION=$DB_LOCATION npm run migrate

# Run <deploy node>
NODE_ENV=production PORT=$DEPLOY_PORT DB_LOCATION=$DB_LOCATION pm2 start ./application/server.js --node-args="--env-file .env" -i max -o "$HOME/.pm2/logs/$APP_NAME-out.log" -e "$HOME/.pm2/logs/$APP_NAME-err.log" -n "$APP_NAME-$DEPLOY_NODE"

# Check if <deploy node> is healthy
HEALTHY=false
MAX_RETRIES=3
WAIT_TIME=5
while [ $MAX_RETRIES -gt 0 ]; do
  response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$DEPLOY_PORT/health")

  if [ "$response" -eq 200 ]; then
    HEALTHY=true
    break
  else
    echo "$DEPLOY_NODE is not healthy. Retrying in $WAIT_TIME seconds..."
    sleep $WAIT_TIME
    ((MAX_RETRIES--))
  fi
done

# If <deploy node> is unhealthy, stop it and interrupt deployment
if [ "$HEALTHY" = false ]; then
  echo "$DEPLOY_NODE is not healthy even after $MAX_RETRIES retries. Killing it."
  pm2 stop -s "$APP_NAME-$DEPLOY_NODE" || ':'
  exit 1
else
  echo "$DEPLOY_NODE is healthy!"
fi

# Create Caddyfile that forwards to <deploy node>
CADDYFILE_CONTENT=$(
  cat <<EOF
#$DEPLOY_NODE
$DOMAIN {
  handle {
    reverse_proxy localhost:$DEPLOY_PORT
    encode gzip
  }

	@static {
		path *.ico *.gif *.jpg *.jpeg *.png *.svg *.webp *.js *.css *.woff2
	}

	header @static Cache-Control "public, max-age=31536000"
}
EOF
)

echo "$CADDYFILE_CONTENT" | sudo tee /etc/caddy/Caddyfile >/dev/null

# Reload Caddy
sudo systemctl reload caddy

# Stop old node
pm2 stop -s "$APP_NAME-$OLD_NODE" || ':'

# Save the app list so PM2 respawns then after reboot
pm2 save
