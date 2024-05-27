resource "hcloud_volume" "backup" {
  for_each          = var.environment
  name              = "database-${each.key}"
  size              = 40
  location          = "nbg1"
  format            = "ext4"
  delete_protection = true
}

resource "hcloud_volume_attachment" "backup_attachment" {
  for_each  = var.environment
  server_id = hcloud_server.webserver[each.key].id
  volume_id = hcloud_volume.backup[each.key].id
  automount = true
}
