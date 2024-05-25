variable "environment" {
  type = map(object({
    cloudInit      = string
    acceptsTraffic = bool
  }))
  default = {
    #    blue = {
    #      cloudInit      = "cloud-config-blue.yaml"
    #      acceptsTraffic = true
    #    }
    green = {
      cloudInit      = "cloud-config.yaml"
      acceptsTraffic = false
    }
  }
}

resource "hcloud_server" "webserver" {
  for_each     = var.environment
  name         = "webserver-${each.key}"
  image        = "ubuntu-22.04"
  server_type  = "cax11"
  datacenter   = "nbg1-dc3"
  ssh_keys     = [hcloud_ssh_key.webserver_key.id]
  firewall_ids = [hcloud_firewall.web.id]
  user_data = templatefile(each.value.cloudInit,
    {
      username : "devops",
      ssh_key : file("ssh.pub"),
      database_volume : hcloud_volume.database_volume[each.key].id
  })
  public_net {
    ipv4 = hcloud_primary_ip.server_ip[each.key].id
  }
  lifecycle {
    ignore_changes = [
      user_data
    ]
  }
}

resource "hcloud_ssh_key" "webserver_key" {
  name       = "devops ssh key"
  public_key = file("ssh.pub")
}

