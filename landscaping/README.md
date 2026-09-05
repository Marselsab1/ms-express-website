# CLC Outdoor Services — website

Static site. No build step, no dependencies. Open `index.html` in a browser and
it runs; drop the folder on any host and it's live.

```
index.html          all page content lives here
css/styles.css      all styling — brand colours are at the very top
js/main.js          nav, carousel, lightbox, form
assets/             photos, share image
favicon.svg  robots.txt  sitemap.xml
```

## Before this goes live — 4 things

1. **Logo.** `assets/logo.png` is a stand-in. Drop the real emblem over it —
   transparent PNG or SVG, and keep the filename. The header is near-black so
   the artwork sits on the ground it was drawn for; height is set in CSS, so
   any reasonable file size works.
2. **Photos.** Every file in `assets/` starting `hero`, `about` or `project-`
   is a labelled placeholder, not a real image. Replace each with a real photo,
   keeping the same filename (or update the `src` in `index.html`). Widescreen
   JPGs around 1600px wide are the sweet spot. `assets/og.png` is the image
   that shows when the site is shared — worth replacing with a real photo too.
3. ~~**Form key.**~~ Done — the quote form posts to Web3Forms and emails each
   submission to carsonmcentire1@gmail.com. Replies go to the visitor's own
   address, so hitting reply in the inbox answers them directly. To send leads
   somewhere else, make a new form at web3forms.com under that address and
   swap the `access_key` value in `index.html`.

   **The form cannot be tested from the Claude artifact preview.** That page
   runs under a content security policy that blocks requests to outside hosts,
   so submitting there always reports a failure regardless. Test it on a real
   host once the site is deployed.
4. **Domain.** Search `clcoutdoorservices.com` in `index.html`, `robots.txt`
   and `sitemap.xml` and swap in the real domain.

## Editing content

Everything is plain HTML with a comment above each section, so you can search
for the words you see on the page and edit them in place.

- **Brand colours** — top of `css/styles.css`, under `1. TOKENS`.
  `--accent` is the logo red, `--black` is the page ground, `--navy` is the one
  coloured band. Change those three and the whole site re-skins.
- **Process steps** — the accordion in the `PROCESS` section. Copy a whole
  `<div class="step">` block; the `aria-controls` id must match the panel's id.
- **Trust cards** — the four cards under the hero. Every claim on them should be
  something a customer could verify. Don't add "licensed & insured" or
  "financing available" unless both are actually true.
- **Services** — add or delete `<li>` lines inside any of the three columns
  in the `SERVICES` section.
- **Reviews** — copy a whole `<article class="rcard">` block and edit the
  text, name, initial and date. Also update the rating and count in three
  places: the hero, the reviews heading, and the JSON-LD block in `<head>`.
- **Service areas** — the `<ul class="areas">` list, plus the matching
  `areaServed` entries in the JSON-LD block.
- **Phone number** — it appears in several places. Search for `5806732`.

## Design

Layout follows a dark contractor-site pattern: utility bar, sticky header,
full-bleed hero, four trust cards, an angled navy feature band, service cards,
a consultation strip, a numbered process accordion, then reviews, service area
and the quote form. Type is Archivo (headings, 800/900) over Figtree (body).

## The reviews carousel

Scrolls continuously and eases to a stop when hovered, then eases back up when
the pointer leaves — it never snaps. It also pauses on keyboard focus, when
scrolled out of view, and when the browser tab is hidden. For anyone with
"reduce motion" turned on it becomes an ordinary swipeable row instead.

Speed lives in `js/main.js` as `SPEED` (pixels per second, default 42).
`EASE_IN` and `EASE_OUT` control how quickly it slows and speeds back up.
