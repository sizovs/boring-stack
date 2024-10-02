#!/usr/bin/env bash

if [[ -z "${DOMAIN}" ]]; then
  IP_ADDRESS=$(hostname -I | awk '{print $1}')
  DOMAIN="${IP_ADDRESS}.nip.io"
fi

APP_DIR="$HOME/latest"
APP_NAME=$(awk -F '"' '/"name"/ {print $4}' "$APP_DIR/package.json")

echo "$APP_NAME will be available at https://$DOMAIN"

DB_LOCATION="$HOME/db.sqlite3"
DB_BACKUP="/mnt/backup"

NVM_VERSION="0.39.7"
NODE_VERSION="22.2.0"
LITESTREAM_VERSION="0.3.13"
CADDY_VERSION="2.8.4"

BLUE_PORT=3000
GREEN_PORT=3001

# Install Litestream
if ! command -v litestream &>/dev/null || [ "$(litestream version)" != "v$LITESTREAM_VERSION" ]; then
  arch=$(dpkg --print-architecture)
  url=https://github.com/benbjohnson/litestream/releases/download/v$LITESTREAM_VERSION/litestream-v$LITESTREAM_VERSION-linux-$arch.deb
  if ! curl -fLo litestream.deb "$url"; then
    echo "Error: Failed to download $url"
    exit 1
  fi
  sudo dpkg -i --force-confold litestream.deb
  rm litestream.deb
  echo "Litestream version v$LITESTREAM_VERSION installed successfully."
fi

# Make sure the backup directory exists and fail otherwise.
if [ ! -d "$DB_BACKUP" ]; then
  echo "Error: $DB_BACKUP directory does not exist."
  echo "Consider waiting a bit because mounting may take a while."
  exit 1
fi

# Make "devops" owner of the backup directory.
sudo chown devops:devops "$DB_BACKUP"

# Create litestream.yml config file for continuous replication
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

# Install Caddy
installed_caddy_version() {
  command -v caddy &>/dev/null && caddy version | awk '{print $1}' || echo ""
}
if [ "$(installed_caddy_version)" != "v$CADDY_VERSION" ]; then
  sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update
  sudo apt-get -y install caddy
  INSTALLED_VERSION=$(installed_caddy_version)
  if [ "$INSTALLED_VERSION" != "v$CADDY_VERSION" ]; then
    echo "Caddy version $INSTALLED_VERSION has been installed, but $CADDY_VERSION is required"
    exit 1
  fi
  echo "Caddy $CADDY_VERSION installed successfully."
fi

# Install NVM
if [ ! -d "$HOME/.nvm" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v$NVM_VERSION/install.sh | bash
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
  sudo env PATH=$PATH:$NODE_DIR/bin $NODE_DIR/lib/node_modules/pm2/bin/pm2 startup systemd -u devops --hp "$HOME" --service-name pm2
fi

# Create logrotate configuration for app logs
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
if /usr/bin/nc -z localhost "$BLUE_PORT" >/dev/null 2>&1; then
  echo "Blue node is running. Will deploy to green..."
  DEPLOY_NODE=green
  DEPLOY_PORT=$GREEN_PORT
  OLD_NODE=blue
  OLD_PORT=$BLUE_PORT
elif /usr/bin/nc -z localhost "$GREEN_PORT" >/dev/null 2>&1; then
  echo "Green node is running. Will deploy to blue..."
  DEPLOY_NODE=blue
  DEPLOY_PORT=$BLUE_PORT
  OLD_NODE=green
  OLD_PORT=$GREEN_PORT
else
  echo "Nodes are not running. Will deploy to blue."
  DEPLOY_NODE=blue
  DEPLOY_PORT=$BLUE_PORT
  OLD_NODE=green
  OLD_PORT=$GREEN_PORT
fi

# Move app contents into ~/<deploy node>
rm -rf "$HOME/$DEPLOY_NODE"
mv -f "$APP_DIR" "$HOME/$DEPLOY_NODE"

# Grant "devops" user +rwx access to $HOME and subdirectories (because rsync preserves permissions of the source)
# Grant users other than "devops" +rx access to $HOME and subdirectories (for Caddy)
sudo chmod -R u+rwx,o+rx "$HOME"

# Install dependencies
cd $HOME/$DEPLOY_NODE
npm ci --production

# If <deploy node> is running, stop it
# https://github.com/Unitech/pm2/issues/325
pm2 delete -s "$APP_NAME-$DEPLOY_NODE" || ':'

# Migrate database
DB_LOCATION=$DB_LOCATION npm run migrate

# Run <deploy node>
NODE_ENV=production PORT=$DEPLOY_PORT DB_LOCATION=$DB_LOCATION pm2 start application/server.js --update-env --kill-timeout 3000 --node-args="--env-file $HOME/$DEPLOY_NODE/.env" -i max -o "$HOME/.pm2/logs/$APP_NAME-out.log" -e "$HOME/.pm2/logs/$APP_NAME-err.log" -n "$APP_NAME-$DEPLOY_NODE"

function point_caddy_to() {
  local UPSTREAM_PORT=$1
  CADDYFILE_CONTENT=$(
    cat <<EOF
$DOMAIN {
  handle {
    reverse_proxy {
      to localhost:$UPSTREAM_PORT
    }
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
  sudo systemctl reload caddy
}

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
  echo "$DEPLOY_NODE is not healthy after $MAX_RETRIES retries. Killing it."
  pm2 delete -s "$APP_NAME-$DEPLOY_NODE" || ':'
  point_caddy_to "$OLD_PORT"
  exit 1
else
  echo "$DEPLOY_NODE is healthy!"
  point_caddy_to "$DEPLOY_PORT"
fi

# Give old node a few seconds to complete existing requests
sleep 5

# Stop old node
pm2 delete -s "$APP_NAME-$OLD_NODE" || ':'

# Save the app list so PM2 respawns then after reboot
pm2 save
