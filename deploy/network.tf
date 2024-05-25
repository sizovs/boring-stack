resource "hcloud_primary_ip" "webserver_ip" {
  for_each      = var.environment
  name          = "webserver ip ${each.key}"
  type          = "ipv4"
  datacenter    = "nbg1-dc3"
  assignee_type = "server"
  auto_delete   = false
}

resource "hcloud_network" "vpn" {
  name     = "vpn"
  ip_range = "10.0.1.0/24"
}

resource "hcloud_network_subnet" "vpn_subnet" {
  network_id   = hcloud_network.vpn.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "10.0.1.0/24"
}

resource "hcloud_server_network" "server_subnet" {
  for_each  = hcloud_server.webserver
  server_id = each.value.id
  subnet_id = hcloud_network_subnet.vpn_subnet.id
}
