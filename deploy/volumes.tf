resource "hcloud_volume" "database_volume" {
  for_each          = var.environment
  name              = "database-${each.key}"
  size              = 40
  location          = "nbg1"
  format            = "ext4"
  delete_protection = true
}

resource "hcloud_volume_attachment" "database_volume_attachment" {
  for_each  = var.environment
  server_id = hcloud_server.webserver[each.key].id
  volume_id = hcloud_volume.database_volume[each.key].id
  automount = true
}
