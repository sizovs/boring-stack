import fs from "fs"
import { execSync } from "child_process"
import readline from "readline/promises"
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
  "Logs": logs,
}

console.log('Available operations: ')
Object.entries(ops).forEach(([description, op]) => {
  console.log(op.name + ` — ${description}`)
})

const ask = readline.createInterface({ input: process.stdin, output: process.stdout })
const answer = process.argv[2] || await ask.question(`What you'd like to do? `)
ask.close()

const op = Object.values(ops).find(it => it.name === answer)
if (!op) {
  console.log(`Wrong operation.`)
  process.exit(0)
}

await op()

async function logs() {
  const { ip } = await primaryIp.get()
  execSync(`ssh devops@${ip} "journalctl -qft ${process.env.APP_NAME}"`, { stdio: 'inherit' })
}

async function maintain() {
  const { ip } = await primaryIp.get()
  const maintenanceFlag = `/home/devops/${process.env.APP_NAME}.m`
  execSync(`ssh devops@${ip} '[ -f ${maintenanceFlag} ] && rm ${maintenanceFlag} || touch ${maintenanceFlag}'`, { stdio: 'inherit' })
}

async function deploy() {
  const { ip } = await primaryIp.get()
  execSync(`rsync -v --timeout=5 --recursive --include-from=./deploy/.includes --exclude='*' ./ devops@${ip}:/home/devops/${process.env.APP_NAME}.new`, { stdio: 'inherit' })
  execSync(`cat deploy/deploy.sh | ssh devops@${ip} "APP_NAME=${process.env.APP_NAME} bash -s"`, { stdio: 'inherit' })
}

async function db() {
  const dbFile = `${process.env.APP_NAME}.db`
  execSync(`rm -f ${dbFile}* && DB_LOCATION=${dbFile} litestream restore -config ./deploy/litestream.yml ${dbFile}`, { stdio: 'inherit' })
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
      { direction: 'in', protocol: 'tcp', port: '80', source_ips: ['0.0.0.0/0', '::/0'] },
      { direction: 'in', protocol: 'tcp', port: '443', source_ips: ['0.0.0.0/0', '::/0'] },
      { direction: 'in', protocol: 'tcp', port: '22', source_ips: ['0.0.0.0/0', '::/0'] }
    ]
  })

  await network.createIfAbsent({
    ip_range: '10.0.1.0/24',
    subnets: [{ type: "cloud", network_zone: "eu-central", ip_range: "10.0.1.0/24" }]
  })

  const publicKeyLocation = `${process.env.HOME}/.ssh/hetzner.pub`
  const publicKey = fs.readFileSync(publicKeyLocation, 'utf-8')
  const cloudInit = fs.readFileSync(new URL('./cloud-config.yml', import.meta.url), 'utf-8')
    .replace('${publicKey}', publicKey)

  await sshKey.createIfAbsent({ public_key: publicKey })

  await primaryIp.createIfAbsent({ type: 'ipv4', assignee_type: 'server', datacenter: 'nbg1-dc3' })

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
    public_net: { ipv4: await primaryIp.id() }
  })
}
