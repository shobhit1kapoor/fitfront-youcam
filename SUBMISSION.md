# FitFront Devpost submission kit

## Tagline

See the look before you cart it—a YouCam-powered virtual fitting room inside a
real e-commerce journey.

## Project description

### Inspiration

Online fashion shoppers usually make a visual decision from a product photo and
hope they can imagine the rest. The uncertainty appears at the worst moment:
just before selecting a variant or adding the item to a cart. FitFront puts
YouCam Apparel Virtual Try-On at that exact decision point.

### What it does

On any supported upper-body product, a shopper opens the FitFront fitting room,
uses our original demo model or uploads a front-facing photo, and reviews a clear
privacy disclosure. FitFront sends the photo and the trusted catalog garment to
YouCam Clothes VTO v4. The shopper then compares before and after with an
accessible slider, chooses a real variant, and adds the look to the existing
cart. FitFront explicitly describes the output as an appearance visualization,
not a sizing guarantee.

### How we built it

FitFront significantly extends the Openfront Next.js/Keystone/Postgres commerce
platform. Server-only routes verify the remaining free units and the live
`cloth-v4` feature cost, initialize YouCam file uploads, PUT the shopper and
garment images to the returned presigned URLs, create one asynchronous task, and
poll it every five seconds. A private Postgres ledger stores only task metadata
and enforces three new tasks per anonymous browser session per day. Product and
variant IDs—not arbitrary URLs—select the reference garment from the catalog.

### Challenges

The main challenge was treating VTO as a production workflow rather than an
image effect: protecting the secret key, preventing duplicate billable tasks,
handling expiring results, validating YouCam's image constraints, respecting
privacy, protecting the free-unit allowance, and reconnecting the result to
variants and the cart.

### Accomplishments

- Complete try → compare → select → cart retail journey.
- Server-only YouCam integration with no key or presigned-URL exposure.
- Live cost/balance guard that fails closed and preserves a 100-unit reserve.
- Consent-first flow with no photo/result persistence in FitFront.
- Rights-safe instant demo and meaningful provider-specific recovery messages.
- Responsive, accessible experience built into the existing storefront.

### What we learned

Useful retail AI depends as much on placement, trust, state management, and
honest limitations as model quality. The most valuable integration was not a new
standalone page; it was connecting YouCam to the product, variant, and cart
context the shopper already understands.

### What's next

Future work would add category-specific YouCam endpoints for accessories,
merchant analytics for VTO-to-cart conversion, opt-in saved looks, and verified
fit/measurement data without presenting generative appearance as physical size.

## Significant update statement

FitFront existed before the submission period as the general-purpose Openfront
commerce base. During the hackathon period it was significantly updated with the
FitFront brand and consumer problem framing, a complete YouCam Clothes VTO v4
workflow, new server APIs and task model, credit and quota controls, privacy
consent and retention UX, catalog-to-garment integration, before/after and cart
UI, automated tests, an original demo asset, documentation, deployment support,
and submission materials.

## Two-minute demo script

**0:00–0:15 — Problem**  
“A product image shows the garment, but it still asks shoppers to imagine
themselves in it. FitFront removes that visual uncertainty at the product page.”

**0:15–0:35 — Existing product**  
Open the FitFront storefront, select the Penrose Triangle T-Shirt, and briefly
show real price, size/color variants, product details, and cart.

**0:35–1:05 — YouCam flow**  
Press “Try it on with YouCam,” select the bundled demo model, show the image
guidance and explicit retention consent, then generate. State that both source
and trusted catalog garment images are uploaded server-side and the key never
reaches the browser.

**1:05–1:30 — Result and retail value**  
Move the before/after slider, select a variant, and add the generated look to the
cart. Call out the sizing disclaimer.

**1:30–1:50 — Technical depth**  
Show the architecture diagram or code briefly: free-unit cost/balance guard,
single asynchronous task, five-second polling, session quota, no photo storage.

**1:50–2:00 — Close**  
“FitFront is not a one-call wrapper. It connects YouCam to the exact retail
decision—from product curiosity to a confident cart.”

## Screenshot checklist

1. **Storefront:** FitFront hero, YouCam badge, and featured apparel.
2. **Trust:** product fitting-room dialog with demo/upload choices and privacy UI.
3. **Outcome:** before/after result with variant controls and add-to-cart action.

Use a 1440×900 desktop viewport for the primary images and capture one mobile
supplement if Devpost permits. Do not show API keys, account email, browser
bookmarks, or personal photos.

## Final submission checklist

- [ ] Public repository URL or private repository shared with
      `contact_event@PerfectCorp.com`.
- [ ] Public, free test deployment and concise testing instructions.
- [ ] `YOUCAM_API_KEY` absent from repository, browser network payloads, and video.
- [ ] One real successful VTO and cart flow tested after deployment.
- [ ] Three screenshots uploaded.
- [ ] Public YouTube/Vimeo video between one and three minutes.
- [ ] No copyrighted music, third-party marks, or unlicensed imagery in video.
- [ ] English description includes consumer/retail value and significant updates.
- [ ] Repository includes source, migration, setup, license, and asset attribution.
- [ ] Deployment stays available through August 31, 2026.
- [ ] Entrant is prepared for the winner exit interview and feature article.
