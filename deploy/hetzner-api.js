import ky from 'ky'

const apiToken = process.env.HETZNER_API_TOKEN
if (!apiToken) {
  throw new Error("Please provide HETZNER_API_TOKEN")
}

const apiClient = ky.create({
  prefixUrl: 'https://api.hetzner.cloud/v1/',
  headers: {
    Authorization: `Bearer ${apiToken}`
  },
	hooks: {
		beforeRequest: [ (request) =>
      console.log(request.method + " > " + request.url)
    ],
	},
})

export class Resource {
  #kind
  #kinds
  #name
  constructor(kind, name) {
    this.#kind = kind
    this.#kinds = kind + 's'
    this.#name = name
  }

  async action(name, json) {
    const match = await this.find()
    await apiClient.post(`${this.#kinds}/${match.id}/actions/${name}`, { json }).json()
  }

  async id() {
    const match = await this.get()
    return match.id
  }

  get name() {
    return this.#name
  }

  async get() {
    const match = this.find()
    if (!match) {
      throw new Error(`Cannot get ${this.#kind} with name ${this.#name}`)
    }
    return match
  }

  async find() {
    const resources = (await apiClient.get(this.#kinds).json())[this.#kinds]
    return resources.find(resource => resource.name === this.#name)
  }

  async delete() {
    let match = await this.find()
    if (!match) {
      return
    }

    const deleteResponse = await apiClient.delete(`${this.#kinds}/${match.id}`, { retry: { limit: 20, statusCodes: [422] } }).json()
    const actionToWait = deleteResponse.action
    if (!actionToWait) {
      return
    }

    while (true) {
      const deletion = await apiClient.get(`actions/${actionToWait.id}`).json()
      if (deletion.action.status === 'success') break
      if (deletion.action.status === 'error') throw new Error(`Error occurred while deleting ${this.#kinds} with ID ${match.id}`)
      await new Promise(resolve => setTimeout(resolve, 2500))
    }
  }

  async create(parameters) {
    const json = {
      name: this.#name,
      ...parameters
    }
    const creation = (await apiClient.post(this.#kinds, { json }))[this.#kind]
    return creation
  }

  async createIfAbsent(parameters) {
    const match = await this.find()
    if (match) {
      return match
    } else {
      return this.create(parameters)
    }
  }
}


