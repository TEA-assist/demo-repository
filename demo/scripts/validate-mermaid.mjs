import { access, readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;

const { default: mermaid } = await import("mermaid");

const diagramDirectory = resolve("demo/docs/diagrams");
const workflowPage = resolve("demo/docs/04-commerce-workflows.html");
const expectedFiles = Array.from({ length: 10 }, (_, index) =>
  `${String(index + 1).padStart(2, "0")}-${[
    "commerce-overview",
    "store-integration",
    "inventory-synchronization",
    "sales-models",
    "checkout-payment",
    "supplier-procurement",
    "fulfillment-shipping",
    "returns-refunds",
    "financial-settlement",
    "exception-handling"
  ][index]}.mmd`
);

mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });

const workflowMarkup = await readFile(workflowPage, "utf8");
const workflowDom = new JSDOM(workflowMarkup);
const workflowDocument = workflowDom.window.document;
const cards = [...workflowDocument.querySelectorAll("[data-diagram]")];

if (cards.length !== expectedFiles.length) {
  throw new Error(`Expected ${expectedFiles.length} diagram cards, found ${cards.length}.`);
}

for (const [index, card] of cards.entries()) {
  const expectedPath = `diagrams/${expectedFiles[index]}`;
  const sourceLink = card.querySelector("[data-source-link]");
  if (card.dataset.diagram !== expectedPath || sourceLink?.getAttribute("href") !== expectedPath) {
    throw new Error(`Card ${index + 1} must use ${expectedPath} as its diagram and source link.`);
  }
}

const localReferences = [...workflowDocument.querySelectorAll("a[href], link[href], script[src]")]
  .map((element) => element.getAttribute(element.tagName === "SCRIPT" ? "src" : "href"))
  .filter((reference) => reference && !reference.startsWith("#") && !reference.startsWith("data:") && !/^[a-z]+:/i.test(reference));

for (const reference of localReferences) {
  const path = resolve(dirname(workflowPage), reference.split("#", 1)[0]);
  try {
    await access(path);
  } catch {
    throw new Error(`Workflow page has a missing local reference: ${reference}`);
  }
}

const availableFiles = (await readdir(diagramDirectory)).filter((file) => file.endsWith(".mmd")).sort();
const unexpected = availableFiles.filter((file) => !expectedFiles.includes(file));
const missing = expectedFiles.filter((file) => !availableFiles.includes(file));

if (missing.length || unexpected.length) {
  console.error("Diagram file set does not match the required ten sources.");
  if (missing.length) console.error(`Missing: ${missing.join(", ")}`);
  if (unexpected.length) console.error(`Unexpected: ${unexpected.join(", ")}`);
  process.exit(1);
}

let hasError = false;
for (const file of expectedFiles) {
  const source = await readFile(resolve(diagramDirectory, file), "utf8");
  try {
    await mermaid.parse(source, { suppressErrors: false });
    console.log(`ok ${file}`);
  } catch (error) {
    hasError = true;
    console.error(`invalid ${file}`);
    console.error(error.message);
  }
}

if (hasError) process.exit(1);
