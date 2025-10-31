#!/usr/bin/env bash

# Exit if using undefined variable.
set -u

IP_ADDRESS=$(hostname -I | awk '{print $1}')

# Change this to your custom domain if you have one
DOMAIN="${IP_ADDRESS}.nip.io"

DB_LOCATION="$HOME/$APP_NAME.db"
DEPLOY_DIR="$HOME/$APP_NAME.new"
source "$DEPLOY_DIR/.env.production"

echo "$APP_NAME will be available at https://$DOMAIN"

# Install Litestream
LITESTREAM_VERSION="0.5.2"
LITESTREAM_DEB="litestream-${LITESTREAM_VERSION}-linux-$(dpkg --print-architecture).deb"
wget -q -nc -P /tmp "https://github.com/benbjohnson/litestream/releases/download/v$LITESTREAM_VERSION/$LITESTREAM_DEB"
sudo apt-get install -y "/tmp/$LITESTREAM_DEB"

# Create litestream.yml config file for continuous replication
sudo tee /etc/litestream.yml >/dev/null <<EOF
dbs:
  - path: $DB_LOCATION
    replica:
      type: s3
      endpoint: $R2_BACKUP_ENDPOINT
      bucket: $R2_BACKUP_BUCKET
      access-key-id: $R2_BACKUP_KEY
      secret-access-key: $R2_BACKUP_SECRET
      snapshot-interval: 1h
      retention: 24h
EOF

# Start Litestream
sudo systemctl enable litestream
sudo systemctl start litestream


# Install Caddy
CADDY_VERSION="2.10.2"
CADDY_DEB="caddy_${CADDY_VERSION}_linux_$(dpkg --print-architecture).deb"
wget -q -nc -P /tmp "https://github.com/caddyserver/caddy/releases/download/v$CADDY_VERSION/$CADDY_DEB"
sudo apt-get install -y "/tmp/$CADDY_DEB"

# Install Volta
if [ ! -d "$HOME/.volta" ]; then
  curl https://get.volta.sh | bash
fi

# Make volta available in the current session
export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"

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
  OLD_NODE=3001
  DEPLOY_NODE=3000
  echo "$APP_NAME is not running. Will deploy to $DEPLOY_NODE..."
fi


# Create systemd service
sudo tee "/lib/systemd/system/$APP_NAME@.service" >/dev/null <<EOF
[Unit]
Description=$APP_NAME (%i)
After=network.target

[Service]
Type=simple
User=devops
Environment=NODE_ENV=production PORT=%i DB_LOCATION=$DB_LOCATION FORKS=$(nproc)
WorkingDirectory=$HOME/$APP_NAME@%i
ExecStart=$HOME/.volta/bin/node --env-file-if-exists .env.production application/server.js
Restart=on-failure
TimeoutStopSec=15

SyslogIdentifier=$APP_NAME
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload

# Move app contents from deploy dir into ~/<deploy node>
rm -rf "$HOME/$APP_NAME@$DEPLOY_NODE"
mv -f "$DEPLOY_DIR" "$HOME/$APP_NAME@$DEPLOY_NODE"

# Grant "devops" user +rwx access to $HOME and subdirectories
# Grant users other than "devops" +rx access to $HOME and subdirectories (for Caddy)
sudo chmod -R u+rwx,o+rx "$HOME"

# Install dependencies
cd $HOME/$APP_NAME@$DEPLOY_NODE
npm ci --omit=dev

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

# Create Caddyfile
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
$DOMAIN
root * $HOME/$APP_NAME@$OLD_NODE
reverse_proxy :$OLD_NODE
encode zstd gzip

@static {
  path /static/*
}

handle @static {
  file_server
  header Cache-Control "public, max-age=31536000, immutable"
}

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

@admin {
  path /admin /admin/* /cron /cron/*
  not header X-I-Am-Super-Admin *
}

handle @admin {
	error "Forbidden" 403
}
EOF

# cat <<EOF | crontab -
# * * * * * curl -s http://localhost:$OLD_NODE/cron/service > /dev/null 2>&1
# EOF

if [ "$HEALTHY" = false ]; then
  echo "$DEPLOY_NODE is not healthy after $MAX_RETRIES retries. Killing it."
  sudo systemctl stop "$APP_NAME@$DEPLOY_NODE"
else
  echo "$DEPLOY_NODE is healthy! 🎉"
  crontab -l | sed "s/$OLD_NODE/$DEPLOY_NODE/g" | crontab -
  sudo sed -i "s/$OLD_NODE/$DEPLOY_NODE/g" /etc/caddy/Caddyfile
  sudo systemctl reload caddy
  sudo systemctl stop "$APP_NAME@$OLD_NODE"
  sudo systemctl disable --quiet "$APP_NAME@$OLD_NODE"
  sudo systemctl enable --quiet "$APP_NAME@$DEPLOY_NODE"
fi
