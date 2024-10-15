import fs from "fs"
import { $, question, tmpdir, chalk } from 'zx'
import { Resource } from "./hetzner-api.js"
const { npm_package_name, npm_package_config_domain } = process.env

const firewall = new Resource('firewall', 'web')
const backupVolume = new Resource('volume', 'backup')
const network = new Resource('network', 'vpn')
const sshKey = new Resource('ssh_key', 'devops')
const server = new Resource('server', 'web')
const primaryIp = new Resource("primary_ip", "public")


const ops = {
  "Create infrastructure": create,
  "Destroy infrastructure": destroy,
  "Deploy application": deploy,
  "Toggle maintenance mode": toggleMaintenanceMode,
  "Pull DB locally": db,
}

console.log('Available operations: ')
Object.entries(ops).forEach(([description, op]) => {
  console.log(chalk.green(op.name) + ` — ${description}`)
})

const answer = await question(`What you'd like to do? `)
const op = Object.values(ops).find(it => it.name === answer)
if (!op) {
  console.log(`Wrong operation.`)
  process.exit(0)
}

await op()

async function toggleMaintenanceMode() {
  const { ip } = await primaryIp.get()
  const maintenanceFlag = `/home/devops/${npm_package_name}/maintenance.on`
  await $`ssh devops@${ip} '[ -f ${maintenanceFlag} ] && rm ${maintenanceFlag} || touch ${maintenanceFlag}'`
}

async function deploy() {
  const { ip } = await primaryIp.get()
  $.verbose = true
  await $`rsync -v --timeout=5 --recursive --include-from=./deploy/.includes --exclude='*' ./ devops@${ip}:/home/devops/latest`
  await $`cat deploy/deploy.sh | ssh devops@${ip} "DOMAIN=${npm_package_config_domain} APP_NAME=${npm_package_name} bash -s"`
}

async function db() {
  const { ip } = await primaryIp.get()
  const db = `${npm_package_name}.db`
  $.verbose = true

  if (fs.existsSync(db)) {
    if (await question(`Database exists under ${db}. Delete? (y/n)`) === 'y') {
      $`rm -rf ${db}*`
    } else {
      console.log(`Skipped.`)
      return
    }
  }
  const tmp = tmpdir()
  await $`rsync -v --timeout=5 --recursive devops@${ip}:/mnt/backup/${npm_package_name} ${tmp} && litestream restore -o ${db} file://${tmp}/${npm_package_name}`
}

async function destroy() {
  await sshKey.delete()
  await server.delete()
  await network.delete()
  await firewall.delete()
  await backupVolume.delete()
  await primaryIp.delete()
}

async function create() {
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

  const publicKeyLocation = (process.env.PUBLIC_KEY ?? '~/.ssh/hetzner.pub')?.replace("~", process.env.HOME)
  const publicKey = fs.readFileSync(publicKeyLocation, 'utf-8')
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
}
