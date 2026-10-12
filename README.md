# imp·ress — site web (FR / DE / EN)

Ce dossier contient tout le site, prêt à être mis en ligne **et** modifiable depuis une interface simple (sans toucher au code).

```
content/     → tous les textes (fr.json, de.json, en.json) et les réglages (settings.json)
static/      → style, scripts et photo
build.js     → fabrique les pages du site à partir des textes
.pages.yml   → décrit l'interface d'édition (fichier caché)
.github/     → publie automatiquement le site à chaque modification (dossier caché)
```

---

## 1. Mise en ligne (une seule fois, ~30 minutes)

**a. Compte GitHub** — créez un compte gratuit sur github.com (si vous n'en avez pas).

**b. Dépôt** — « New repository » → nom : `imp-ress-site` → laissez **Public** → ne cochez rien d'autre → « Create repository ».
(Public ne veut pas dire que n'importe qui peut modifier : seul votre compte peut écrire. Le contenu du site est de toute façon public.)

**c. Téléverser les fichiers** — décompressez l'archive, ouvrez le dossier, **sélectionnez tout son contenu** (pas le dossier lui-même) et glissez-le dans la page du dépôt (« uploading an existing file »), puis « Commit changes ».
- Sur Mac, affichez d'abord les fichiers cachés : `Cmd + Maj + .` dans le Finder.
- Contrôle : dans la liste du dépôt doivent apparaître `.github`, `.pages.yml`, `content`, `static`, `build.js`.

**d. Activer la publication** — dépôt → « Settings » → « Pages » → *Source* : choisissez **GitHub Actions**.
Ouvrez l'onglet « Actions » : « Publier le site » doit s'exécuter (≈ 1 minute). Sinon : « Publier le site » → « Run workflow ».
Votre site est alors visible sur `https://VOTRE-IDENTIFIANT.github.io/imp-ress-site/` (aperçu).

**e. Votre domaine** — « Settings » → « Pages » → *Custom domain* : `www.imp-ress.com` → « Save ».
Chez le prestataire qui gère le domaine imp-ress.com, créez un enregistrement DNS **CNAME** : nom `www`, valeur `VOTRE-IDENTIFIANT.github.io`.
Quand GitHub l'autorise (de quelques minutes à quelques heures), cochez « Enforce HTTPS ».
(Optionnel : faire rediriger `imp-ress.com` vers `www.imp-ress.com` depuis le même prestataire.)

**f. Interface d'édition** — allez sur **app.pagescms.org** → « Sign in with GitHub » → installez l'application GitHub proposée sur le dépôt `imp-ress-site` → ouvrez-le.

---

## 2. Modifier le site au quotidien

Dans Pages CMS, quatre rubriques :

| Rubrique | Ce que vous y modifiez |
|---|---|
| **Réglages** | E-mail, téléphone (optionnel), adresse, LinkedIn, **numéro UID**, raison sociale, photo et son crédit |
| **Textes — Français / Deutsch / English** | Titres Google, mini-CV, les 6 prestations, témoignages, Impressum, pied de page |

Cliquez sur « Save » : le site se met à jour tout seul en 1 à 2 minutes. Pensez à répercuter un changement de texte dans les **trois langues**.

**Bon à savoir**
- **Témoignages** : ajoutez-en jusqu'à 6. Si vous supprimez toutes les citations, la section disparaît du site.
- **Prestations** : le design est prévu pour **6** (3 colonnes) ; leur contenu est librement modifiable.
- **Photo** : importez-la avec un **nouveau nom de fichier**, au format portrait de préférence (elle est recadrée au centre), et **moins de 300 Ko** (une photo de téléphone brute est trop lourde et ralentit le site).
- **UID** : tant que le champ est vide, « à venir / folgt / to follow » s'affiche dans l'Impressum.
- **Impressum** : pour une entreprise inscrite (e.U.), la loi autrichienne demande en principe d'autres mentions (par ex. Firmenbuchnummer et -gericht, appartenance à la WKO, activité réglementée). Vérifiez la liste exacte auprès de la WKO ou d'un juriste ; le champ « Lignes supplémentaires » est prévu pour cela.

---

## 3. Me demander des modifications (design, nouvelle section…)

Sur GitHub : « Code » → « Download ZIP », puis joignez ce ZIP à la conversation. Je vous renverrai **uniquement les fichiers modifiés** à téléverser. Ne repartez jamais d'une ancienne archive pour le dossier `content/` : vos modifications faites via l'interface y sont enregistrées.

---

## 4. Dépannage

- **Le site ne change pas après un « Save »** : dépôt → onglet « Actions ». Une croix rouge = une erreur : envoyez-moi une capture d'écran.
- **Pages CMS réclame un fichier `.pages.yml`** : il n'a pas été téléversé (fichier caché). Recommencez l'étape c avec l'affichage des fichiers cachés.
- **« DNS check unsuccessful » dans Settings → Pages** : l'enregistrement CNAME n'est pas encore propagé ; patientez puis cliquez sur « Check again ».

## 5. Suivi, statistiques et alertes (à activer à la mise en ligne)

Tout est déjà préparé dans le projet ; il suffit de brancher les comptes, tous gratuits.

| Outil | À faire | Où |
|---|---|---|
| **Statistiques (Cloudflare Web Analytics)** | Créer un compte Cloudflare gratuit → Web Analytics → « Add a site » → www.imp-ress.com → copier le *token* → le coller dans Pages CMS, Réglages, « Statistiques : jeton ». La balise s'ajoute toute seule et la page de confidentialité mentionne l'outil (sans cookie, donc sans bandeau). | Cloudflare / Pages CMS |
| **Google Search Console** | Ajouter la propriété « Domaine » imp-ress.com → ajouter l'enregistrement TXT demandé chez IONOS → envoyer `https://www.imp-ress.com/sitemap.xml`. | search.google.com/search-console |
| **Bing Webmaster Tools** | Se connecter → « Importer depuis Google Search Console » → vérifier que le plan du site est bien lu. | bing.com/webmasters |
| **Contrôle hebdomadaire** | Dépôt GitHub → Settings → Secrets and variables → Actions → Variables → créer `SITE_LIVE` = `true`. Le contrôle (Lighthouse, 12 pages, liens) tourne chaque lundi ; **aucun message tant que tout va bien**, un e-mail GitHub en cas de problème. À lancer à la main : onglet Actions → « Contrôle hebdomadaire » → Run workflow. | GitHub |
| **Site en panne ?** | UptimeRobot (offre gratuite) → nouveau moniteur HTTPS sur `https://www.imp-ress.com/fr/` toutes les 5 minutes, alerte par e-mail. | uptimerobot.com |

Le classeur `imp-ress-suivi-marketing.xlsx` sert de tableau de bord mensuel : indicateurs, questions à poser aux assistants IA, générateur de liens UTM et liste de contrôle de lancement.

## SEO / GEO — ce qui est en place

- Titres et descriptions uniques par page et par langue (≤ 65 / ≤ 160 caractères), canonical, hreflang (fr/de/en + x-default), Open Graph et Twitter Cards avec image de partage 1200×630 (`static/assets/uploads/og-imp-ress-pr-consulting.png`).
- Données structurées JSON-LD : ProfessionalService (+ catalogue d'offres), Person, WebSite, WebPage ; FAQPage sur les pages FAQ ; BreadcrumbList sur les pages légales.
- `sitemap.xml` avec hreflang, `robots.txt` (accès explicitement autorisé aux robots IA : GPTBot, ClaudeBot, PerplexityBot…), `llms.txt` (fiche de synthèse pour assistants IA : faits clés, présentation, prestations, FAQ, contact).
- Favicons, apple-touch-icon, `site.webmanifest`, page `404.html`.
- Accessibilité : lien d'évitement, contrastes AA, libellés des boutons de langue, hiérarchie des titres ; contenu visible même sans JavaScript.
- Performance : polices auto-hébergées, photo en deux tailles (`srcset`), aucune ressource externe.
- `node check.js` vérifie tout cela à chaque build.
