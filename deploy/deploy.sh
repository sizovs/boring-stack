#!/usr/bin/env bash

if [[ -z "${APP_NAME}" ]]; then
  echo "APP_NAME env variable is missing"
  exit 1
fi

if [[ -z "${DOMAIN}" ]]; then
  IP_ADDRESS=$(hostname -I | awk '{print $1}')
  DOMAIN="${IP_ADDRESS}.nip.io"
fi

APP_DIR="$HOME/latest"

echo "$APP_NAME will be available at https://$DOMAIN"

DB_LOCATION="$HOME/$APP_NAME.db"
DB_BACKUP="/mnt/backup/$APP_NAME"

NVM_VERSION="0.39.7"
NODE_VERSION="23.4.0"
LITESTREAM_VERSION="0.3.13"
CADDY_VERSION="2.8.4"

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
sudo mkdir -p "$DB_BACKUP"
if [[ $? -ne 0 ]]; then
  echo "Cannot create $DB_BACKUP directory."
  echo "Consider waiting a bit because volume mounting may take a while."
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
        snapshot-interval: 1h
        retention: 24h
EOF
)
echo "$LITESTREAM_CONFIG" | sudo tee /etc/litestream.yml >/dev/null

# Start Litestream
sudo systemctl enable litestream
sudo systemctl restart litestream

# Install Caddy
installed_caddy_version() {
  command -v caddy &>/dev/null && caddy version | awk '{print $1}' || echo ""
}
if [ "$(installed_caddy_version)" != "v$CADDY_VERSION" ]; then
  sudo apt-get -y install debian-keyring debian-archive-keyring apt-transport-https
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

# Create logrotate configuration for app logs
LOGROTATE_CONFIG=$(
  cat <<EOF
/var/log/$APP_NAME*.log {
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
echo "$LOGROTATE_CONFIG" | sudo tee /etc/logrotate.d/$APP_NAME >/dev/null

# Determine deploy node
if systemctl is-active --quiet "$APP_NAME@3000"; then
  OLD_NODE=3000
  DEPLOY_NODE=3001
  echo "$OLD_NODE is running. Will deploy to $DEPLOY_NODE..."
elif systemctl is-active --quiet "$APP_NAME@3001"; then
  OLD_NODE=3001
  DEPLOY_NODE=3000
  echo "$OLD_NODE is running. Will deploy to $DEPLOY_NODE..."
else
  DEPLOY_NODE=3000
  OLD_NODE=3001
  echo "$APP_NAME is not running. Will deploy to $DEPLOY_NODE..."
fi

function create_systemd_service() {
  local FORKS=$(nproc)
    SERVICEFILE_CONTENT=$(
    cat <<EOF
[Unit]
Description=$APP_NAME (%i)
After=network.target

[Service]
Type=simple
User=devops
Environment=NODE_ENV=production PORT=%i DB_LOCATION=$DB_LOCATION FORKS=$FORKS
WorkingDirectory=$HOME/$APP_NAME@%i
ExecStart=$NODE_DIR/bin/node --env-file-if-exists $HOME/$APP_NAME@%i/.env $HOME/$APP_NAME@%i/application/server.js
Restart=on-failure
StandardOutput=append:/var/log/$APP_NAME-out.log
StandardError=append:/var/log/$APP_NAME-err.log
TimeoutStopSec=15

[Install]
WantedBy=multi-user.target
EOF
  )

  echo "$SERVICEFILE_CONTENT" | sudo tee "/lib/systemd/system/$APP_NAME@.service" >/dev/null
  sudo systemctl daemon-reload
}

create_systemd_service

# Move app contents into ~/<deploy node>
rm -rf "$HOME/$APP_NAME@$DEPLOY_NODE"
mv -f "$APP_DIR" "$HOME/$APP_NAME@$DEPLOY_NODE"

# Grant "devops" user +rwx access to $HOME and subdirectories
# Grant users other than "devops" +rx access to $HOME and subdirectories (for Caddy)
sudo chmod -R u+rwx,o+rx "$HOME"

# Install dependencies
cd $HOME/$APP_NAME@$DEPLOY_NODE
npm ci --omit=dev

# Migrate database
DB_LOCATION=$DB_LOCATION npm run migrate

# (Re)start
sudo systemctl restart "$APP_NAME@$DEPLOY_NODE"

# Check if <deploy node> is healthy
HEALTHY=false
MAX_RETRIES=3
WAIT_TIME=5
while [ $MAX_RETRIES -gt 0 ]; do
  response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$DEPLOY_NODE/health")

  if [ "$response" -eq 200 ]; then
    HEALTHY=true
    break
  else
    echo "$DEPLOY_NODE is not healthy. Retrying in $WAIT_TIME seconds..."
    sleep $WAIT_TIME
    ((MAX_RETRIES--))
  fi
done

function point_caddy_to() {
  local NODE=$1
  CADDYFILE_CONTENT=$(
    cat <<EOF
$DOMAIN
root * $HOME/$APP_NAME@$NODE
reverse_proxy :$NODE
encode zstd gzip

@maintenance {
	file $APP_NAME.m {
		root $HOME
	}
	not header X-Bypass-Maintenance *
}

handle @maintenance {
	error "We'll be back soon! 😌" 503
}

handle_errors 503 {
	rewrite * /static/maintenance.html
	file_server
	header Retry-After 60
}
EOF
)

  echo "$CADDYFILE_CONTENT" | sudo tee /etc/caddy/Caddyfile >/dev/null
  sudo systemctl reload caddy
}

if [ "$HEALTHY" = false ]; then
  echo "$DEPLOY_NODE is not healthy after $MAX_RETRIES retries. Killing it."
  sudo systemctl stop "$APP_NAME@$DEPLOY_NODE"
else
  echo "$DEPLOY_NODE is healthy! 🎉"
  point_caddy_to "$DEPLOY_NODE"
  sleep 5 # Give old node some time to finish requests
  sudo systemctl stop "$APP_NAME@$OLD_NODE" &>/dev/null
  sudo systemctl disable "$APP_NAME@$OLD_NODE" &>/dev/null
  sudo systemctl enable "$APP_NAME@$DEPLOY_NODE" &>/dev/null
fi
