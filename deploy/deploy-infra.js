import fs from "fs"
import { Resource } from "./hetzner-api.js"

const firewall = new Resource('firewall', 'web')
const backupVolume = new Resource('volume', 'backup')
const network = new Resource('network', 'vpn')
const sshKey = new Resource('ssh_key', 'devops')
const server = new Resource('server', 'web')
const primaryIp = new Resource("primary_ip", "public")

// await sshKey.delete()
// await server.delete()
// await network.delete()
// await firewall.delete()
// await backupVolume.action('detach')
// await backupVolume.delete()
// await primaryIp.delete()

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

if (!process.env.HETZNER_PUBLIC_KEY) {
  throw new Error('HETZNER_PUBLIC_KEY env variable is missing.')
}

const publicKey = fs.readFileSync(process.env.HETZNER_PUBLIC_KEY.replace("~", process.env.HOME), 'utf-8')
const cloudInit = fs.readFileSync(import.meta.dirname + '/cloud-config.yml', 'utf-8')
  .replace('${publicKey}', publicKey)
  .replace('${backupVolumeId}', await backupVolume.id())

await sshKey.createIfAbsent({
  public_key: publicKey
})

await primaryIp.createIfAbsent({
  type: 'ipv4',
  assignee_type: 'server',
  datacenter: 'nbg1-dc3'
})

await server.createIfAbsent({
  image: 'ubuntu-24.04',
  server_type: 'cax11',
  location: 'nbg1',
  ssh_keys: [sshKey.name],
  user_data: cloudInit,
  volumes: [await backupVolume.id()],
  automount: true,
  networks: [await network.id()],
  firewalls: [{ firewall: await firewall.id() }],
  public_net: {
    ipv4: await primaryIp.id()
  }
})
