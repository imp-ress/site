// imp·ress — générateur du site (aucune dépendance : Node 18+ suffit)
// Lit content/*.json  →  écrit le site complet dans dist/
// Utilisation :  node build.js

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const STATIC = path.join(ROOT, "static");
const LANGS = ["fr", "de", "en"];
const LANG_NAMES = { fr: "Français", de: "Deutsch", en: "English" };

// ---------- utilitaires ----------
const readJSON = (name) => {
  const file = path.join(ROOT, "content", `${name}.json`);
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (e) {
    console.error(`\nErreur dans content/${name}.json : ${e.message}\n`);
    process.exit(1);
  }
};

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const list = (v) => (Array.isArray(v) ? v : []);
const filled = (v) => typeof v === "string" && v.trim() !== "";

const tok = (str, s) =>
  String(str ?? "").replace(/%EMAIL%/g, s.email).replace(/%PHONE%/g, s.phone || "");

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const roman = (n) => ROMAN[n] || String(n);

// chemin "/assets/x.jpg" (venant du CMS) → chemin relatif depuis la page
const rel = (p, prefix) =>
  /^(https?:)?\/\//.test(p) ? p : prefix + String(p).replace(/^\/+/, "");

// ---------- construction d'une page ----------
function buildPage(lang, c, s) {
  const prefix = "../"; // les pages vivent dans /fr/, /de/, /en/
  const site = s.site_url.replace(/\/+$/, "");
  const canonical = `${site}/${lang}/`;
  const ogImageAbs = `${site}/assets/uploads/og-imp-ress.png`;
  const photoAbs = site + (String(s.photo).startsWith("/") ? s.photo : "/" + s.photo);

  const impressumAddress = `${s.street}, ${s.postal_code} ${s.city}, ${s.country}`;
  const host = site.replace(/^https?:\/\//, "");
  const year = new Date().getFullYear();

  // --- données structurées (SEO / GEO) ---
  const serviceTitles = list(c.services.items).map((i) => i.title).filter(filled);
  const orgId = `${site}/#organization`;
  const personId = `${site}/#ilona-perrot`;
  const logoAbs = `${site}/assets/uploads/imp-ress-logo.png`;
  const today = new Date().toISOString().slice(0, 10);
  const ld = {
    "@type": "ProfessionalService",
    "@id": orgId,
    name: "imp-ress",
    ...(filled(s.company_name) ? { legalName: s.company_name } : {}),
    url: canonical,
    image: photoAbs,
    logo: { "@type": "ImageObject", url: logoAbs, width: 2000, height: 2000 },
    email: s.email,
    ...(filled(s.phone) ? { telephone: s.phone } : {}),
    ...(filled(s.founding_date) ? { foundingDate: s.founding_date } : {}),
    inLanguage: c.html_lang,
    description: c.meta.description,
    founder: { "@id": personId },
    address: {
      "@type": "PostalAddress",
      streetAddress: s.street,
      addressLocality: s.city,
      postalCode: s.postal_code,
      addressCountry: "AT",
    },
    areaServed: [
      { "@type": "Country", name: "Austria" },
      { "@type": "Continent", name: "Europe" },
    ],
    knowsLanguage: LANGS,
    serviceType: serviceTitles,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: c.services.title,
      itemListElement: list(c.services.items)
        .filter((i) => filled(i.title))
        .map((i) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: i.title, description: i.text, provider: { "@id": orgId } } })),
    },
    ...(filled(s.linkedin) ? { sameAs: [s.linkedin] } : {}),
  };
  const faqItems = list(c.faq && c.faq.items).filter((i) => filled(i.q) && filled(i.a));
  const person = {
    "@type": "Person",
    "@id": personId,
    name: s.owner_name,
    jobTitle: c.hero.subtitle,
    description: list(c.hero.bio).filter(filled)[0],
    email: s.email,
    image: photoAbs,
    url: canonical,
    worksFor: { "@id": orgId },
    knowsLanguage: LANGS,
    knowsAbout: serviceTitles,
    ...(filled(s.linkedin) ? { sameAs: [s.linkedin] } : {}),
  };
  const website = {
    "@type": "WebSite",
    "@id": `${site}/#website`,
    url: `${site}/`,
    name: "imp-ress",
    inLanguage: LANGS,
    publisher: { "@id": orgId },
  };
  const webpage = {
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: c.meta.title,
    description: c.meta.description,
    inLanguage: c.html_lang,
    isPartOf: { "@id": `${site}/#website` },
    about: { "@id": orgId },
    primaryImageOfPage: { "@type": "ImageObject", url: ogImageAbs },
    dateModified: today,
  };
  const graph = [ld, person, website, webpage];
  const ldJson = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2).replace(/</g, "\\u003c");

  const hreflangs =
    LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${site}/${l}/">`).join("\n") +
    `\n<link rel="alternate" hreflang="x-default" href="${site}/fr/">`;

  const langSwitch = LANGS.map((l) => {
    const active = l === lang;
    return `<a class="lang-btn${active ? " active" : ""}" href="${active ? "./" : prefix + l + "/"}" hreflang="${l}" lang="${l}" aria-label="${l.toUpperCase()} – ${LANG_NAMES[l]}"${active ? ' aria-current="page"' : ""}>${l.toUpperCase()}</a>`;
  }).join("\n    ");

  const bio = list(c.hero.bio).filter(filled).map((p) => `<p>${esc(p)}</p>`).join("\n      ");

  const services = list(c.services.items)
    .map(
      (it, i) => `      <div class="service-card">
        <h3>${esc(it.title)}</h3>
        <p>${esc(it.text)}</p>
      </div>`
    )
    .join("\n\n");

  const quotes = list(c.testimonials.quotes).filter((q) => filled(q.text));
  const testimonialsSection = quotes.length
    ? `<section class="testimonials" id="testimonials">
  <div class="section-head reveal">
    <p class="eyebrow">${esc(c.testimonials.eyebrow)}</p>
    <h2>${esc(c.testimonials.title)}</h2>
  </div>

  <div class="quote-grid qn-${Math.min(quotes.length, 3)} reveal">
${quotes
  .map(
    (q) => `    <div class="quote-card">
      <span class="quote-mark">&rdquo;</span>
      <p class="quote-text">${esc(q.text)}</p>
      ${filled(q.author) ? `<p class="quote-attr">${esc(q.author)}</p>` : ""}
    </div>`
  )
  .join("\n\n")}
  </div>
</section>
`
    : "";

  const faqSection = faqItems.length
    ? `<section class="faq" id="faq">
  <div class="section-head reveal">
    <p class="eyebrow">${esc(c.faq.eyebrow)}</p>
    <h2>${esc(c.faq.title)}</h2>
  </div>
  <dl class="faq-list reveal">
${faqItems.map((i) => `    <div class="faq-item">\n      <dt>${esc(i.q)}</dt>\n      <dd>${esc(tok(i.a, s))}</dd>\n    </div>`).join("\n")}
  </dl>
</section>

`
    : "";
  const privacyHref = `${c.privacy_slug}/`;
  const analytics = filled(s.analytics_token)
    ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(s.analytics_token)}"}'></script>\n`
    : "";

  const photoSmall = String(s.photo).replace(/\.jpg$/i, "-800.jpg");
  const hasSmall = fs.existsSync(path.join(STATIC, photoSmall.replace(/^\/+/, "")));
  const photoImg = `<img src="${rel(s.photo, prefix)}"${hasSmall ? ` srcset="${rel(photoSmall, prefix)} 800w, ${rel(s.photo, prefix)} 1200w" sizes="(max-width: 900px) 90vw, 400px"` : ""} width="1200" height="1500" alt="${esc(c.hero.photo_alt)}" loading="eager" fetchpriority="high" decoding="async">`;

  const extraLines = list(c.impressum.extra_lines)
    .filter(filled)
    .map((l) => `      <p>${esc(l)}</p>`)
    .join("\n");

  const uidLine = filled(s.uid)
    ? `${esc(s.uid)}`
    : `<span class="placeholder">${esc(c.uid_pending)}</span>`;

  return `<!DOCTYPE html>
<html lang="${esc(c.html_lang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>${esc(c.meta.title)}</title>
<meta name="description" content="${esc(c.meta.description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#0B1655">

${hreflangs}

<meta property="og:type" content="website">
<meta property="og:site_name" content="imp-ress">
<meta property="og:title" content="${esc(c.meta.title)}">
<meta property="og:description" content="${esc(c.meta.description)}">
<meta property="og:image" content="${ogImageAbs}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="imp-ress — ${esc(s.city)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${esc(c.og_locale)}">
${LANGS.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${esc(readJSON(l).og_locale)}">`).join("\n")}

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(c.meta.title)}">
<meta name="twitter:description" content="${esc(c.meta.description)}">
<meta name="twitter:image" content="${ogImageAbs}">
<meta name="twitter:image:alt" content="imp-ress — ${esc(s.city)}">

<script type="application/ld+json">
${ldJson}
</script>

<link rel="preload" href="${prefix}assets/fonts/cormorant-garamond-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
${hasSmall ? `<link rel="preload" as="image" href="${rel(photoSmall, prefix)}" imagesrcset="${rel(photoSmall, prefix)} 800w, ${rel(s.photo, prefix)} 1200w" imagesizes="(max-width: 900px) 90vw, 400px" fetchpriority="high">` : ""}
<link rel="stylesheet" href="${prefix}assets/style.css">
</head>
<body>

<header>
  <a class="wordmark" href="./">imp<span class="wm-dot">&middot;</span>ress</a>
  <nav class="lang-switch" aria-label="${esc(c.nav_label)}">
    ${langSwitch}
  </nav>
</header>

<main>

<section class="hero">
  <div class="hero-text reveal">
    <p class="eyebrow">${esc(c.hero.eyebrow)}</p>
    <h1>${esc(c.hero.name)}</h1>
    <p class="hero-subtitle">${esc(c.hero.subtitle)}</p>
    <div class="bio">
      ${bio}
    </div>
  </div>

  <div class="hero-visual reveal">
    <div class="portrait-frame">
      <div class="seal"><span>IP</span></div>
      ${photoImg}
    </div>
    ${filled(s.photo_credit) ? `<p class="credit">${esc(s.photo_credit)}</p>` : ""}
  </div>
</section>

<section class="services" id="services">
  <div class="services-inner">
    <div class="section-head reveal">
      <p class="eyebrow">${esc(c.services.eyebrow)}</p>
      <h2>${esc(c.services.title)}</h2>
    </div>

    ${filled(c.services.intro) || filled(c.services.intro_note) ? `<div class="services-intro reveal">
      ${filled(c.services.intro) ? `<p>${esc(c.services.intro)}</p>` : ""}
      ${filled(c.services.intro_note) ? `<p class="note">${esc(c.services.intro_note)}</p>` : ""}
    </div>

    ` : ""}<div class="service-grid reveal">
${services}
    </div>
  </div>
</section>

${testimonialsSection}<section class="contact" id="contact">
  <div class="section-head reveal">
    <p class="eyebrow">${esc(c.contact.eyebrow)}</p>
    <h2>${esc(c.contact.title)}</h2>
  </div>

  <a class="contact-email reveal" href="mailto:${esc(s.email)}">${esc(s.email)}</a>
  <div class="contact-actions reveal">
    <a class="btn btn-primary" href="mailto:${esc(s.email)}">${esc(c.contact.btn_mail || "")}</a>
    ${filled(s.linkedin) ? `<a class="btn btn-ghost" href="${esc(s.linkedin)}" target="_blank" rel="noopener"><svg class="li-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>${esc(c.contact.btn_linkedin || "LinkedIn")}</a>` : ""}
  </div>

</section>

</main>

<footer id="contact-footer">
  <div class="footer-inner">
    <div>
      <h3>${esc(c.footer.contact_title)}</h3>
      ${filled(s.company_name) ? `<p>${esc(s.company_name)}</p>\n      ` : ""}<p>${esc(s.owner_name)}</p>
      <p>${esc(`${s.street}, A-${s.postal_code} ${c.impressum.city || s.city}`)}</p>
      <p>${filled(s.phone) ? `<a href="tel:${esc(String(s.phone).replace(/[^+\d]/g, ""))}">${esc(s.phone).replace(/ /g, "&nbsp;")}</a> &ndash; ` : ""}<a href="mailto:${esc(s.email)}">${esc(s.email)}</a></p>
      ${filled(s.linkedin) ? `<p><a class="li-link" href="${esc(s.linkedin)}" target="_blank" rel="noopener"><svg class="li-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>LinkedIn</a></p>` : ""}
    </div>
    <div>
      <a class="wordmark footer-logo" href="#top" aria-label="imp-ress">imp<span class="wm-dot">&middot;</span>ress</a>
      <p>${esc(c.footer.about)}</p>
    </div>
  </div>
  <div class="footer-bottom">
    &copy; ${year} ${esc(filled(s.company_name) ? s.company_name : "imp-ress")} &mdash; ${esc(host)} &middot; <a href="faq/">FAQ</a> &middot; <a href="${c.legal_slug}/">${esc(c.impressum.title)}</a> &middot; <a href="${privacyHref}">${esc(c.footer.privacy_label)}</a>
  </div>
</footer>

${analytics}<script src="${prefix}assets/main.js"></script>
</body>
</html>
`;
}

// ---------- page confidentialité ----------
function buildPrivacy(lang, c, s) {
  const prefix = "../../";
  const site = s.site_url.replace(/\/+$/, "");
  const slugOf = (l) => readJSON(l).privacy_slug;
  const canonical = `${site}/${lang}/${c.privacy_slug}/`;
  const hreflangs =
    LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${site}/${l}/${slugOf(l)}/">`).join("\n") +
    `\n<link rel="alternate" hreflang="x-default" href="${site}/fr/${slugOf("fr")}/">`;
  const langSwitch = LANGS.map((l) => {
    const active = l === lang;
    return `<a class="lang-btn${active ? " active" : ""}" href="${active ? "./" : "../../" + l + "/" + slugOf(l) + "/"}" hreflang="${l}" lang="${l}" aria-label="${l.toUpperCase()} – ${LANG_NAMES[l]}"${active ? ' aria-current="page"' : ""}>${l.toUpperCase()}</a>`;
  }).join("\n    ");
  const sections = list(c.privacy.sections).slice();
  if (filled(s.analytics_token) && c.privacy.analytics) sections.splice(3, 0, c.privacy.analytics);
  const body = sections.map((x) => `    <h2>${esc(x.h)}</h2>\n    <p>${esc(tok(x.p, s))}</p>`).join("\n");
  return `<!DOCTYPE html>
<html lang="${esc(c.html_lang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(c.privacy.title)} — imp-ress</title>
<meta name="description" content="${esc(c.privacy.meta)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#0B1655">
${hreflangs}
<link rel="preload" href="${prefix}assets/fonts/cormorant-garamond-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${prefix}assets/style.css">
</head>
<body>
<header>
  <a class="wordmark" href="${prefix}${lang}/">imp<span class="wm-dot">&middot;</span>ress</a>
  <nav class="lang-switch" aria-label="${esc(c.nav_label)}">
    ${langSwitch}
  </nav>
</header>
<main>
  <section class="legal">
    <h1>${esc(c.privacy.title)}</h1>
${body}
    <p class="legal-back"><a href="${prefix}${lang}/">&larr; ${esc(c.privacy.back)}</a></p>
  </section>
</main>
<footer>
  <div class="footer-bottom">
    &copy; ${new Date().getFullYear()} ${esc(filled(s.company_name) ? s.company_name : "imp-ress")} &mdash; ${esc(site.replace(/^https?:\/\//, ""))}
  </div>
</footer>
${filled(s.analytics_token) ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(s.analytics_token)}"}'></script>\n` : ""}</body>
</html>
`;
}

// ---------- page FAQ ----------
function buildFaq(lang, c, s) {
  const prefix = "../../";
  const site = s.site_url.replace(/\/+$/, "");
  const canonical = `${site}/${lang}/faq/`;
  const hreflangs =
    LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${site}/${l}/faq/">`).join("\n") +
    `\n<link rel="alternate" hreflang="x-default" href="${site}/fr/faq/">`;
  const langSwitch = LANGS.map((l) => {
    const active = l === lang;
    return `<a class="lang-btn${active ? " active" : ""}" href="${active ? "./" : "../../" + l + "/faq/"}" hreflang="${l}" lang="${l}" aria-label="${l.toUpperCase()} – ${LANG_NAMES[l]}"${active ? ' aria-current="page"' : ""}>${l.toUpperCase()}</a>`;
  }).join("\n    ");
  const items = list(c.faq.items).filter((i) => filled(i.q) && filled(i.a));
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: c.html_lang,
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: tok(i.a, s) },
    })),
  };
  const body = items
    .map((i) => `    <div class="faq-item">\n      <dt>${esc(i.q)}</dt>\n      <dd>${esc(tok(i.a, s))}</dd>\n    </div>`)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="${esc(c.html_lang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(c.faq.title)} — imp-ress</title>
<meta name="description" content="${esc(c.faq.meta || c.faq.title)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#0B1655">
${hreflangs}
<script type="application/ld+json">
${JSON.stringify(ld, null, 2).replace(/</g, "\\u003c")}
</script>
<link rel="preload" href="${prefix}assets/fonts/cormorant-garamond-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${prefix}assets/style.css">
</head>
<body>
<header>
  <a class="wordmark" href="${prefix}${lang}/">imp<span class="wm-dot">&middot;</span>ress</a>
  <nav class="lang-switch" aria-label="${esc(c.nav_label)}">
    ${langSwitch}
  </nav>
</header>
<main>
  <section class="legal faq-page">
    <p class="eyebrow">${esc(c.faq.eyebrow)}</p>
    <h1>${esc(c.faq.title)}</h1>
    <dl class="faq-list">
${body}
    </dl>
    <p class="legal-back"><a href="${prefix}${lang}/">&larr; ${esc(c.privacy.back)}</a></p>
  </section>
</main>
<footer>
  <div class="footer-bottom">
    &copy; ${new Date().getFullYear()} ${esc(filled(s.company_name) ? s.company_name : "imp-ress")} &mdash; ${esc(site.replace(/^https?:\/\//, ""))}
  </div>
</footer>
${filled(s.analytics_token) ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(s.analytics_token)}"}'></script>\n` : ""}</body>
</html>
`;
}

// ---------- page mentions légales / Impressum ----------
function buildLegal(lang, c, s) {
  const prefix = "../../";
  const site = s.site_url.replace(/\/+$/, "");
  const slugOf = (l) => readJSON(l).legal_slug;
  const canonical = `${site}/${lang}/${c.legal_slug}/`;
  const hreflangs =
    LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${site}/${l}/${slugOf(l)}/">`).join("\n") +
    `\n<link rel="alternate" hreflang="x-default" href="${site}/fr/${slugOf("fr")}/">`;
  const langSwitch = LANGS.map((l) => {
    const active = l === lang;
    return `<a class="lang-btn${active ? " active" : ""}" href="${active ? "./" : "../../" + l + "/" + slugOf(l) + "/"}" hreflang="${l}" lang="${l}" aria-label="${l.toUpperCase()} – ${LANG_NAMES[l]}"${active ? ' aria-current="page"' : ""}>${l.toUpperCase()}</a>`;
  }).join("\n    ");
  const vals = {
    "%COMPANY%": s.company_name, "%OWNER%": s.owner_name, "%STREET%": s.street, "%ZIP%": s.postal_code,
    "%CITY%": c.impressum.city || s.city, "%PHONE%": s.phone, "%EMAIL%": s.email, "%UID%": s.uid,
    "%FN%": s.fn_number, "%COURT%": s.fn_court, "%AUTHORITY%": s.authority, "%CHAMBER%": s.chamber,
  };
  const fillLine = (line) => {
    let skip = false;
    const out = String(line).replace(/%[A-Z]+%/g, (k) => {
      if (!(k in vals)) return k;
      if (!filled(vals[k])) skip = true;
      return String(vals[k] ?? "");
    });
    return skip ? null : out;
  };
  const lines = list(c.impressum.sections)
    .map((sec) => {
      const ls = list(sec.lines).map(fillLine).filter((x) => x !== null);
      return ls.length ? `    <h2>${esc(sec.h)}</h2>\n` + ls.map((x) => `    <p>${esc(x)}</p>`).join("\n") : "";
    })
    .filter(Boolean)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="${esc(c.html_lang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(c.impressum.title)} — imp-ress</title>
<meta name="description" content="${esc(c.impressum.meta || `${c.impressum.title} — ${filled(s.company_name) ? s.company_name : "imp-ress"}`)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#0B1655">
${hreflangs}
<link rel="preload" href="${prefix}assets/fonts/cormorant-garamond-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${prefix}assets/style.css">
</head>
<body>
<header>
  <a class="wordmark" href="${prefix}${lang}/">imp<span class="wm-dot">&middot;</span>ress</a>
  <nav class="lang-switch" aria-label="${esc(c.nav_label)}">
    ${langSwitch}
  </nav>
</header>
<main>
  <section class="legal">
    <h1>${esc(c.impressum.title)}</h1>
${lines}
    <p class="legal-back"><a href="${prefix}${lang}/">&larr; ${esc(c.privacy.back)}</a></p>
  </section>
</main>
<footer>
  <div class="footer-bottom">
    &copy; ${new Date().getFullYear()} ${esc(filled(s.company_name) ? s.company_name : "imp-ress")} &mdash; ${esc(site.replace(/^https?:\/\//, ""))}
  </div>
</footer>
</body>
</html>
`;
}

// ---------- llms.txt (pour les assistants IA) ----------
function buildLlms(s) {
  const site = s.site_url.replace(/\/+$/, "");
  const en = readJSON("en");
  const svcIntro = [en.services.intro, en.services.intro_note].filter(filled).join(" ");
  const svc = list(en.services.items).map((i) => `- ${i.title}: ${i.text}`).join("\n");
  const about = list(en.hero.bio).filter(filled).join("\n\n");
  const faq = list(en.faq && en.faq.items)
    .filter((i) => filled(i.q) && filled(i.a))
    .map((i) => `### ${i.q}\n${tok(i.a, s)}`)
    .join("\n\n");
  const quotes = list(en.testimonials && en.testimonials.quotes)
    .filter((q) => filled(q.text))
    .map((q) => `- "${q.text}" — ${q.author}`)
    .join("\n");
  return `# imp-ress

> ${en.meta.description}

## Key facts
- Name: imp-ress (legal name: ${s.company_name})
- Founder and contact person: ${s.owner_name}, French-Austrian, based in Vienna
- Founded: ${filled(s.founding_date) ? s.founding_date : "2026"}
- Sector: public relations, brand and destination representation, business development, events, press trips, consulting for tourism and lifestyle brands
- Geographic focus: Austria and beyond
- Working languages: German, French, English
- Website: ${site}/ (French, German and English versions)

## About (written in the first person by Ilona Perrot)
${about}

## Pages
${LANGS.map((l) => `- [${LANG_NAMES[l]}](${site}/${l}/)`).join("\n")}
- [FAQ](${site}/en/faq/)
- [Legal notice / Impressum](${site}/en/${en.legal_slug}/)
- [Privacy / Datenschutz / Confidentialité](${site}/en/${en.privacy_slug}/)

## Services
${svcIntro}

${svc}

## Frequently asked questions
${faq}
${quotes ? `\n## What clients and partners say\n${quotes}\n` : ""}
## Contact
- Email: ${s.email}
${filled(s.phone) ? `- Phone: ${s.phone}\n` : ""}${filled(s.linkedin) ? `- LinkedIn: ${s.linkedin}\n` : ""}- Address: ${s.street}, ${s.postal_code} Vienna, Austria
`;
}

// libellé du numéro de TVA selon la langue de la page
function uidLabel(lang) {
  return lang === "en" ? "VAT ID" : "UID";
}

// ---------- page racine (redirection vers /fr/) ----------
function buildRoot(s) {
  const site = s.site_url.replace(/\/+$/, "");
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=fr/">
<title>imp-ress — Ilona Perrot</title>
<meta name="robots" content="index, follow">
<link rel="canonical" href="${site}/fr/">
<link rel="icon" href="assets/favicon.ico" sizes="32x32">
${LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${site}/${l}/">`).join("\n")}
<link rel="alternate" hreflang="x-default" href="${site}/fr/">
</head>
<body>
<p>imp-ress — <a href="fr/">Français</a> · <a href="de/">Deutsch</a> · <a href="en/">English</a></p>
<script>window.location.replace("fr/");</script>
</body>
</html>
`;
}

function buildSitemap(s) {
  const site = s.site_url.replace(/\/+$/, "");
  const today = new Date().toISOString().slice(0, 10);
  const alt =
    LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${site}/${l}/"/>`).join("\n") +
    `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${site}/fr/"/>`;
  const urls = LANGS.map(
    (l) => `  <url>
    <loc>${site}/${l}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
${alt}
  </url>`
  ).join("\n\n");
  const pslug = (l) => readJSON(l).privacy_slug;
  const palt =
    LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${site}/${l}/${pslug(l)}/"/>`).join("\n") +
    `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${site}/fr/${pslug("fr")}/"/>`;
  const purls = LANGS.map(
    (l) => `  <url>
    <loc>${site}/${l}/${pslug(l)}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
${palt}
  </url>`
  ).join("\n\n");
  const falt =
    LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${site}/${l}/faq/"/>`).join("\n") +
    `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${site}/fr/faq/"/>`;
  const lslug = (l) => readJSON(l).legal_slug;
  const lalt =
    LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${site}/${l}/${lslug(l)}/"/>`).join("\n") +
    `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${site}/fr/${lslug("fr")}/"/>`;
  const lurls = LANGS.map(
    (l) => `  <url>
    <loc>${site}/${l}/${lslug(l)}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
${lalt}
  </url>`
  ).join("\n\n");
  const furls = LANGS.map(
    (l) => `  <url>
    <loc>${site}/${l}/faq/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
${falt}
  </url>`
  ).join("\n\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

${urls}

${furls}

${lurls}

${purls}

</urlset>
`;
}

// ---------- finitions communes à toutes les pages (icônes, partage, accessibilité) ----------
function polish(html, s, lang) {
  const site = s.site_url.replace(/\/+$/, "");
  const m = html.match(/href="((?:\.\.\/)*)assets\/style\.css"/);
  const prefix = m ? m[1] : "";
  const get = (re) => { const r = html.match(re); return r ? r[1] : ""; };
  const head = [];
  head.push(`<link rel="icon" href="${prefix}assets/favicon.ico" sizes="32x32">`);
  head.push(`<link rel="icon" type="image/png" href="${prefix}assets/favicon-32.png" sizes="32x32">`);
  head.push(`<link rel="apple-touch-icon" href="${prefix}assets/apple-touch-icon.png">`);
  head.push(`<link rel="manifest" href="${prefix}assets/site.webmanifest">`);
  head.push(`<link rel="preload" href="${prefix}assets/fonts/jost-latin-300-normal.woff2" as="font" type="font/woff2" crossorigin>`);
  if (!/property="og:title"/.test(html) && lang) {
    const title = get(/<title>([\s\S]*?)<\/title>/);
    const desc = get(/<meta name="description" content="([^"]*)"/);
    const canon = get(/<link rel="canonical" href="([^"]*)"/);
    const loc = readJSON(lang).og_locale;
    head.push(
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="imp-ress">`,
      `<meta property="og:title" content="${title}">`,
      `<meta property="og:description" content="${desc}">`,
      `<meta property="og:url" content="${canon}">`,
      `<meta property="og:locale" content="${loc}">`,
      `<meta property="og:image" content="${site}/assets/uploads/og-imp-ress.png">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${title}">`,
      `<meta name="twitter:description" content="${desc}">`,
      `<meta name="twitter:image" content="${site}/assets/uploads/og-imp-ress.png">`
    );
  }
  if (!/application\/ld\+json/.test(html) && lang) {
    const title = get(/<title>([\s\S]*?)<\/title>/).replace(/&amp;/g, "&");
    const desc = get(/<meta name="description" content="([^"]*)"/).replace(/&amp;/g, "&").replace(/&#39;/g, "'");
    const canon = get(/<link rel="canonical" href="([^"]*)"/);
    const home = readJSON(lang).nav_home || "imp-ress";
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", "@id": `${canon}#webpage`, url: canon, name: title, description: desc, inLanguage: readJSON(lang).html_lang, isPartOf: { "@id": `${site}/#website` }, about: { "@id": `${site}/#organization` } },
        { "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: "imp-ress", item: `${site}/${lang}/` },
          { "@type": "ListItem", position: 2, name: title.split(" — ")[0], item: canon },
        ] },
      ],
    };
    head.push(`<script type="application/ld+json">\n${JSON.stringify(ld, null, 2).replace(/</g, "\\u003c")}\n</script>`);
  }
  head.push(`<noscript><style>.reveal{opacity:1!important;transform:none!important}</style></noscript>`);
  html = html.replace("</head>", head.join("\n") + "\n</head>");
  html = html.replace("<main>", '<main id="main">');
  if (lang) {
    const label = { fr: "Aller au contenu", de: "Zum Inhalt springen", en: "Skip to content" }[lang];
    html = html.replace("<body>", `<body>\n<a class="skip-link" href="#main">${label}</a>`);
  }
  return html;
}

// ---------- page 404 ----------
function build404(s) {
  const msg = {
    fr: ["Page introuvable", "Retour à l'accueil"],
    de: ["Seite nicht gefunden", "Zur Startseite"],
    en: ["Page not found", "Back to home"],
  };
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>404 — imp-ress</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0B1655">
<link rel="icon" href="/assets/favicon.ico" sizes="32x32">
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
<header>
  <a class="wordmark" href="/fr/">imp<span class="wm-dot">&middot;</span>ress</a>
</header>
<main id="main">
  <section class="legal" style="text-align:center">
    <p class="eyebrow">404</p>
${LANGS.map((l) => `    <p><a href="/${l}/">${msg[l][0]} — ${msg[l][1]} (${l.toUpperCase()})</a></p>`).join("\n")}
  </section>
</main>
</body>
</html>
`;
}

// ---------- exécution ----------
const settings = readJSON("settings");

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
if (fs.existsSync(STATIC)) fs.cpSync(STATIC, DIST, { recursive: true });

for (const lang of LANGS) {
  const content = readJSON(lang);
  fs.mkdirSync(path.join(DIST, lang), { recursive: true });
  fs.writeFileSync(path.join(DIST, lang, "index.html"), polish(buildPage(lang, content, settings), settings, lang));
  fs.mkdirSync(path.join(DIST, lang, content.legal_slug), { recursive: true });
  fs.writeFileSync(path.join(DIST, lang, content.legal_slug, "index.html"), polish(buildLegal(lang, content, settings), settings, lang));
  fs.mkdirSync(path.join(DIST, lang, "faq"), { recursive: true });
  fs.writeFileSync(path.join(DIST, lang, "faq", "index.html"), polish(buildFaq(lang, content, settings), settings, lang));
  fs.mkdirSync(path.join(DIST, lang, content.privacy_slug), { recursive: true });
  fs.writeFileSync(path.join(DIST, lang, content.privacy_slug, "index.html"), polish(buildPrivacy(lang, content, settings), settings, lang));
}

fs.writeFileSync(path.join(DIST, "index.html"), buildRoot(settings));
fs.writeFileSync(path.join(DIST, "sitemap.xml"), buildSitemap(settings));
fs.writeFileSync(path.join(DIST, "llms.txt"), buildLlms(settings));
const siteUrl = settings.site_url.replace(/\/+$/, "");
const aiBots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot"];
fs.writeFileSync(
  path.join(DIST, "robots.txt"),
  `User-agent: *\nAllow: /\n\n# Assistants IA et moteurs de réponse : accès explicitement autorisé\n` +
    aiBots.map((b) => `User-agent: ${b}\nAllow: /\n`).join("\n") +
    `\nSitemap: ${siteUrl}/sitemap.xml\n`
);
fs.writeFileSync(
  path.join(DIST, "assets", "site.webmanifest"),
  JSON.stringify(
    {
      name: "imp-ress",
      short_name: "imp-ress",
      start_url: "/fr/",
      display: "browser",
      background_color: "#F3F1EA",
      theme_color: "#0B1655",
      icons: [
        { src: "icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    null,
    2
  )
);
fs.writeFileSync(path.join(DIST, "404.html"), build404(settings));

console.log("Site généré dans dist/ (fr, de, en).");
