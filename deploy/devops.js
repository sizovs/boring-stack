import fs from "fs"
import { $, question, chalk } from 'zx'
import { Resource } from "./hetzner-api.js"

const firewall = new Resource('firewall', 'web')
const network = new Resource('network', 'vpn')
const sshKey = new Resource('ssh_key', 'devops')
const server = new Resource('server', 'web')
const primaryIp = new Resource("primary_ip", "public")

const ops = {
  "Create infrastructure": create,
  "Destroy infrastructure": destroy,
  "Deploy application": deploy,
  "Toggle maintenance mode": maintain,
  "Pull DB locally": db,
}

console.log('Available operations: ')
Object.entries(ops).forEach(([description, op]) => {
  console.log(chalk.green(op.name) + ` — ${description}`)
})

const answer = process.argv[2] || await question(`What you'd like to do? `)
const op = Object.values(ops).find(it => it.name === answer)
if (!op) {
  console.log(`Wrong operation.`)
  process.exit(0)
}

await op()

async function maintain() {
  const { ip } = await primaryIp.get()
  const maintenanceFlag = `/home/devops/${process.env.APP_NAME}.m`
  await $`ssh devops@${ip} '[ -f ${maintenanceFlag} ] && rm ${maintenanceFlag} || touch ${maintenanceFlag}'`
}

async function deploy() {
  const { ip } = await primaryIp.get()
  $.verbose = true
  await $`rsync -v --timeout=5 --recursive --include-from=./deploy/.includes --exclude='*' ./ devops@${ip}:/home/devops/${process.env.APP_NAME}.new`
  await $`cat deploy/deploy.sh | ssh devops@${ip} "APP_NAME=${process.env.APP_NAME} bash -s"`
}

async function db() {
  const db = `${process.env.APP_NAME}.db`
  if (fs.existsSync(db)) fs.unlinkSync(db)
  await $`DB_LOCATION=${db} litestream restore -if-db-not-exists -config ./deploy/litestream.yml ${db}`
}

async function destroy() {
  await sshKey.delete()
  await server.delete()
  await network.delete()
  await firewall.delete()
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

  await network.createIfAbsent({
    ip_range: '10.0.1.0/24',
    subnets: [
      {
        type: "cloud",
        network_zone: "eu-central",
        ip_range: "10.0.1.0/24"
      }]
  })

  const publicKeyLocation = '~/.ssh/hetzner.pub'.replace("~", process.env.HOME)
  const publicKey = fs.readFileSync(publicKeyLocation, 'utf-8')
  const cloudInit = fs.readFileSync(import.meta.dirname + '/cloud-config.yml', 'utf-8')
    .replace('${publicKey}', publicKey)

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
    volumes: [],
    automount: true,
    networks: [await network.id()],
    firewalls: [{ firewall: await firewall.id() }],
    public_net: {
      ipv4: await primaryIp.id()
    }
  })
}
