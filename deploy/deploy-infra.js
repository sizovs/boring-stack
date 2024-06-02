const cloudInit = (publicKey, backupVolumeId) => `
#cloud-config
users:
  - name: devops
    groups: users, admin
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - ${publicKey}
packages:
  - jq
  - htop
  - wget
  - fail2ban
  - micro
  - sqlite3
package_update: true
package_upgrade: true
runcmd:
  # Bug, see https://github.com/hetznercloud/terraform-provider-hcloud/issues/473
  - udevadm trigger -c add -s block -p ID_VENDOR=HC --verbose -p ID_MODEL=Volume

  # Symlinks to volumes
  - ln -s /mnt/HC_Volume_${backupVolumeId} /mnt/backup

  # Wait until volumes are mounted
  - |
    max_attempts=10
    attempt=1
    while [ ! -d /mnt/backup ]; do
      echo "Attempt $attempt: Waiting for volumes to become available..."
      sleep 10
      if [ "$attempt" -ge "$max_attempts" ]; then
        echo "Reached maximum attempts. Exiting."
        exit 1
      fi
      attempt=$((attempt + 1))
    done
    echo "Volumes are now available."

  # Make "devops" owner of database directories
  - chown devops:devops /mnt/backup

  # Caddy
  - apt install -y debian-keyring debian-archive-keyring apt-transport-https
  - curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  - curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  - apt-get update
  - apt-get -y install caddy

  - printf "[sshd]\nenabled = true\nbanaction = iptables-multiport" > /etc/fail2ban/jail.local
  - systemctl enable fail2ban

  - sed -i -e '/^\(#\|\)PermitRootLogin/s/^.*$/PermitRootLogin no/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)PasswordAuthentication/s/^.*$/PasswordAuthentication no/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)KbdInteractiveAuthentication/s/^.*$/KbdInteractiveAuthentication no/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)ChallengeResponseAuthentication/s/^.*$/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)MaxAuthTries/s/^.*$/MaxAuthTries 2/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)AllowTcpForwarding/s/^.*$/AllowTcpForwarding no/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)X11Forwarding/s/^.*$/X11Forwarding no/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)AllowAgentForwarding/s/^.*$/AllowAgentForwarding no/' /etc/ssh/sshd_config
  - sed -i -e '/^\(#\|\)AuthorizedKeysFile/s/^.*$/AuthorizedKeysFile .ssh\/authorized_keys/' /etc/ssh/sshd_config
  - sed -i '$a AllowUsers devops' /etc/ssh/sshd_config
  - systemctl reload sshd
`

import fs from "fs"
import { Resource } from "./hetzner-api.js"

const firewall = new Resource('firewall', 'web')
const backupVolume = new Resource('volume', 'backup')
const network = new Resource('network', 'vpn')
const sshKey = new Resource('ssh_key', 'devops')
const server = new Resource('server', 'web')
const floatingIp = new Resource('floating_ip', 'public')

// await floatingIp.delete()
// await sshKey.delete()
// await server.delete()
// await backupVolume.delete()
// await network.delete()
// await firewall.delete()

await firewall.createIfAbsent({
  rules: [
    {
      direction: 'in',
      protocol: 'tcp',
      port: '80',
      source_ips: ['0.0.0.0/0', '::/0']
    },
    {
      direction: 'in',
      protocol: 'tcp',
      port: '443',
      source_ips: ['0.0.0.0/0', '::/0']
    },
    {
      direction: 'in',
      protocol: 'tcp',
      port: '22',
      source_ips: ['0.0.0.0/0', '::/0']
    }
  ]
})

await backupVolume.createIfAbsent({
  size: 40,
  location: 'nbg1',
  format: 'ext4',
})

await network.createIfAbsent({
  ip_range: '10.0.1.0/24',
  subnets: [
    {
      type: "cloud",
      network_zone: "eu-central",
      ip_range: "10.0.1.0/24"
    }]
})

const publicKey = fs.readFileSync(`${process.env.HOME}/.ssh/hetzner.pub`, 'utf-8')
const userData = cloudInit(publicKey, await backupVolume.id())

await sshKey.createIfAbsent({
  public_key: publicKey
})

await server.createIfAbsent({
  image: 'ubuntu-22.04',
  server_type: 'cax11',
  location: 'nbg1',
  ssh_keys: [await sshKey.id()],
  firewalls: [{ firewall: await firewall.id() }],
  user_data: userData,
  networks: [await network.id()],
  public_net: {
    enable_ipv4: true,
  }
})

await floatingIp.createIfAbsent({
  type: 'ipv4',
  home_location: 'nbg1',
  auto_delete: false
})

await floatingIp.action('assign', {
  server: await server.id()
})
