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

resource "hcloud_server" "devclub" {
  for_each     = var.environment
  name         = "devclub-${each.key}"
  image        = "ubuntu-22.04"
  server_type  = "cax11"
  datacenter   = "nbg1-dc3"
  ssh_keys     = [hcloud_ssh_key.devclub.id]
  firewall_ids = [hcloud_firewall.web.id]
  user_data = templatefile(each.value.cloudInit,
    {
      username : "devops",
      ssh_key : file("ssh.pub"),
      database_volume : hcloud_volume.database_volume[each.key].id
  })
  public_net {
    ipv4 = hcloud_primary_ip.devclub_ip[each.key].id
  }
  lifecycle {
    ignore_changes = [
      user_data
    ]
  }
}

resource "hcloud_ssh_key" "devclub" {
  name       = "devclub"
  public_key = file("ssh.pub")
}

resource "cloudflare_record" "devclub" {
  for_each        = var.environment
  name            = each.key
  zone_id         = "56b253972b40e9d626db58d93ec03332"
  value           = hcloud_primary_ip.devclub_ip[each.key].ip_address
  type            = "A"
  ttl             = 1
  proxied         = true
  allow_overwrite = true
}





