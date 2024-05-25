variable "hcloud_token" {
  sensitive = true
}

provider "hcloud" {
  token = var.hcloud_token
}

variable "cloudflare_token" {
  sensitive = true
}

variable "cloudflare_zone_id" {

}

provider "cloudflare" {
  api_token = var.cloudflare_token
}


terraform {
  required_providers {
    hcloud = {
      source = "hetznercloud/hcloud"
    }
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}
