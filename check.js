// Contrôle de cohérence FR / DE / EN — à lancer après chaque modification :  node check.js
const fs = require("fs"), path = require("path");
const ROOT = __dirname, DIST = path.join(ROOT, "dist"), LANGS = ["fr", "de", "en"];
const errors = [];
const err = (m) => errors.push(m);
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "content", f + ".json"), "utf-8"));
const s = read("settings"), c = Object.fromEntries(LANGS.map((l) => [l, read(l)]));

// 1) mêmes clés et mêmes nombres d'éléments dans les trois langues
const shape = (v, p = "") =>
  Array.isArray(v) ? [p + "[" + v.length + "]", ...(v[0] && typeof v[0] === "object" ? shape(v[0], p + "[]") : [])]
  : v && typeof v === "object" ? Object.keys(v).sort().flatMap((k) => shape(v[k], p + "." + k)) : [p];
const ref = shape(c.fr).join("|");
for (const l of ["de", "en"]) if (shape(c[l]).join("|") !== ref) err(`Structure de content/${l}.json différente de fr.json`);

// 2) aucun champ vide ou jeton non remplacé dans les pages générées
const slugs = (l) => ["", "faq", c[l].legal_slug, c[l].privacy_slug];
const pages = {};
for (const l of LANGS) for (const sl of slugs(l)) {
  const f = path.join(DIST, l, sl, "index.html");
  if (!fs.existsSync(f)) { err(`Page manquante : ${l}/${sl}`); continue; }
  pages[`${l}/${sl}`] = fs.readFileSync(f, "utf-8");
}
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
for (const [k, h] of Object.entries(pages)) {
  if (/%[A-Z]+%/.test(h)) err(`${k} : jeton non remplacé`);
  if (/Imp-ress|\bundefined\b|\[object/.test(text(h))) err(`${k} : « Imp-ress » en majuscule, ou valeur indéfinie`);
  if (/Wolfgang|1120/.test(h)) err(`${k} : adresse privée détectée`);
  if (/Österreich|Autriche|Austria/.test(text(h).match(/Kärntner[^\n]{0,40}/)?.[0] || "")) err(`${k} : pays dans l'adresse`);
  // liens internes
  for (const m of h.matchAll(/href="(\.{1,2}\/[^"#]*)"/g)) {
    const t = path.join(DIST, k, m[1]);
    if (!fs.existsSync(t) && !fs.existsSync(path.join(t, "index.html"))) err(`${k} : lien cassé ${m[1]}`);
  }
}
// 3) données légales identiques et présentes dans chaque langue
for (const l of LANGS) {
  const h = pages[`${l}/${c[l].legal_slug}`] || "";
  for (const v of [s.company_name, s.owner_name, s.street, s.postal_code, s.email, s.phone, s.uid, s.fn_number, s.fn_court, s.authority])
    if (v && !text(h).replace(/\s+/g, " ").includes(String(v))) err(`${l}/${c[l].legal_slug} : « ${v} » absent`);
}
// 4) page d'accueil : contact, citation, FAQ en lien, pas d'adresse postale
for (const l of LANGS) {
  const h = pages[`${l}/`] || "";
  for (const v of [s.email, s.phone, s.linkedin]) if (v && !h.includes(v)) err(`${l}/ : « ${v} » absent`);
  const contact = (h.match(/<section class="contact"[\s\S]*?<\/section>/) || [""])[0];
  if (text(contact).includes(s.street) || (s.phone && text(contact).includes(s.phone))) err(`${l}/ : adresse ou téléphone dans la section Contact`);
  const foot = (h.match(/<footer[\s\S]*?<\/footer>/) || [""])[0];
  if (!text(foot).includes(s.street) || (s.phone && !text(foot).includes(s.phone))) err(`${l}/ : adresse ou téléphone absent du pied de page`);
  if (!h.includes('href="faq/"')) err(`${l}/ : lien FAQ manquant`);
  if (!/Jobst/.test(h)) err(`${l}/ : crédit photo manquant`);
  if (!h.includes(c[l].footer.about)) err(`${l}/ : texte de pied de page manquant`);
}
// 5) plan du site, hreflang, llms.txt
const sm = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf-8");
for (const l of LANGS) for (const sl of slugs(l)) if (!sm.includes(`/${l}/${sl ? sl + "/" : ""}</loc>`)) err(`sitemap : ${l}/${sl} absent`);
if (!fs.existsSync(path.join(DIST, "llms.txt"))) err("llms.txt absent");

// 6) SEO / GEO / accessibilité de base
const titles = new Map(), descs = new Map();
for (const [k, h] of Object.entries(pages)) {
  const l = k.split("/")[0];
  const title = (h.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "";
  const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
  const dec = (x) => x.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  if (!title || dec(title).length > 65) err(`${k} : titre absent ou trop long (${dec(title).length})`);
  if (dec(desc).length < 70 || dec(desc).length > 160) err(`${k} : description hors 70–160 caractères (${dec(desc).length})`);
  if (titles.has(title)) err(`${k} : titre identique à ${titles.get(title)}`); titles.set(title, k);
  if (descs.has(desc)) err(`${k} : description identique à ${descs.get(desc)}`); descs.set(desc, k);
  if ((h.match(/<h1[ >]/g) || []).length !== 1) err(`${k} : il doit y avoir exactement un <h1>`);
  if (!new RegExp(`<html lang="${l}"`).test(h)) err(`${k} : attribut lang incorrect`);
  if (!/<link rel="canonical" href="https:\/\/[^"]+\/"/.test(h)) err(`${k} : canonical absent`);
  for (const x of [...LANGS, "x-default"]) if (!h.includes(`hreflang="${x}"`)) err(`${k} : hreflang ${x} absent`);
  for (const p of ["og:title", "og:description", "og:image", "og:url", "og:locale", "twitter:card"]) if (!h.includes(p)) err(`${k} : balise ${p} absente`);
  if (!h.includes('class="skip-link"') || !h.includes('<main id="main">')) err(`${k} : lien d'évitement ou <main id> absent`);
  if (/noindex/.test(h)) err(`${k} : noindex présent`);
  for (const m of h.matchAll(/<img\b[^>]*>/g)) if (!/ alt="[^"]+"/.test(m[0]) || !/ width=/.test(m[0]) || !/ height=/.test(m[0])) err(`${k} : image sans alt/width/height`);
  for (const m of h.matchAll(/(?:src|href)="((?:\.\.\/)+assets\/[^"]+)"/g)) if (!fs.existsSync(path.join(DIST, k, m[1]))) err(`${k} : ressource manquante ${m[1]}`);
  for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { err(`${k} : JSON-LD invalide`); }
  }
  if (!/application\/ld\+json/.test(h)) err(`${k} : JSON-LD absent`);
  if (k.endsWith("/faq") && !h.includes('"FAQPage"')) err(`${k} : FAQPage absent`);
  if (k.endsWith("/") && !k.endsWith("faq/") && !(h.includes('"hasOfferCatalog"') && h.includes('"WebSite"'))) err(`${k} : JSON-LD (offres / WebSite) incomplet`);
}
for (const f of ["assets/uploads/og-imp-ress.png", "assets/uploads/imp-ress-logo.png", "assets/favicon.ico", "assets/apple-touch-icon.png", "assets/site.webmanifest", "404.html", "robots.txt"])
  if (!fs.existsSync(path.join(DIST, f))) err(`fichier manquant : ${f}`);
const robots = fs.readFileSync(path.join(DIST, "robots.txt"), "utf-8");
if (!/Sitemap:/.test(robots) || /Disallow:\s*\//.test(robots)) err("robots.txt : plan du site absent ou site bloqué");
{
  const llms = fs.readFileSync(path.join(DIST, "llms.txt"), "utf-8");
  if (!llms.includes(s.email) || !/Frequently asked questions/.test(llms)) err("llms.txt incomplet");
}

console.log(errors.length ? "PROBLÈMES :\n- " + errors.join("\n- ") : `OK — ${Object.keys(pages).length} pages (3 langues × 4 types) cohérentes.`);
process.exit(errors.length ? 1 : 0);
