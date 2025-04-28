import { describe, it } from 'node:test'
import { expect } from 'chai'


import { html } from "./html.js"

describe("html", () => {

  it("should return a string when passed a string literal", () => {
    expect(typeof html`Hello, world!`).eq("string");
  })

  it("should preserve the string literal value", () => {
    expect(html`Hello, world!`).eq("Hello, world!")
  })

  it("should interpolate variables", () => {
    const name = "Brad"
    expect(html`Hello, ${name}!`).eq("Hello, Brad!")
    expect(html`<html version="${123}"></html>`).eq(`<html version="123"></html>`)
  })

  it("should generate valid HTML with an array of values", () => {
    const names = ["Megan", "Tiphaine", "Florent", "Hoan"]
    expect(
      html`<div>
        My best friends are:
        <ul>
          ${names.map((name) => html`<li>${name}</li>`)}
        </ul>
      </div>`
    ).eq(
      `<div>
        My best friends are:
        <ul>
          <li>Megan</li><li>Tiphaine</li><li>Florent</li><li>Hoan</li>
        </ul>
      </div>`
    )
  })
})
