resource "hcloud_primary_ip" "devclub_ip" {
  for_each      = var.environment
  name          = "devclub ip ${each.key}"
  type          = "ipv4"
  datacenter    = "nbg1-dc3"
  assignee_type = "server"
  auto_delete   = false
}

resource "hcloud_network" "vpc_network" {
  name     = "devclub"
  ip_range = "10.0.1.0/24"
}

resource "hcloud_network_subnet" "vpc_subnet" {
  network_id   = hcloud_network.vpc_network.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "10.0.1.0/24"
}

resource "hcloud_server_network" "devclub_network" {
  for_each  = hcloud_server.devclub
  server_id = each.value.id
  subnet_id = hcloud_network_subnet.vpc_subnet.id
}
