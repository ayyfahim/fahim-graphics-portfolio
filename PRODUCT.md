# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

static HTML/CSS/JS — specified by the user ("you can use simple html css js"). No framework, no build step, no package manager. Deployable by drag-and-drop to Netlify / GitHub Pages / Vercel. Must be served over http:// (not opened as a file) because the image-processing demos read pixel data from canvas.

## Users

**Primary user:** an art director, studio owner, production manager, or agency producer looking for a retoucher. They arrive from a link in an application, a directory, or a referral, and they are scanning for craft level. They will judge quality in seconds from the artwork itself, then look for range and reliability.

**Their job:** decide whether this person's hand is good enough to put in front of their clients, and whether they can handle the kind of work the studio actually ships.

**Secondary user:** the portfolio owner, who must be able to swap in their own name, contact details, and artwork without touching layout code.

## Product Purpose

A portfolio that presents its owner as an accomplished, full-range image retoucher and gets them hired for professional work — retouching, compositing, colour, restoration, cutouts, and print preparation.

It is explicitly **not** an application to any single job posting. It must read as a body of work that stands on its own and can be sent to any prospective client, agency, or studio.

## Positioning

Control over the image at the pixel level, demonstrated rather than asserted. The portfolio's differentiator is that the visitor can *operate* the techniques — the conversions, grades, and separations run live in the browser on real photographs, so the craft is inspectable instead of merely displayed.

Secondary specialism: precision keepsake work (baby handprints and footprints converted to print-ready black-and-white artwork). This is one capability among several, not the thesis.

## Operating Context

- Source material is photographic: portraits, products, interiors, landscapes, and damaged or archival originals.
- Work is judged both by eye and by instrument. Professional image work is checked against scopes — histogram, RGB parade, waveform, vectorscope — because a display can lie and the data cannot.
- Output is prepared for a destination: screen, press, large-format, or product. Resolution, colour mode, black values, transparency, and batch consistency are real constraints.
- Remote, asynchronous, English-language written communication.

## Capabilities and Constraints

**Capability areas the portfolio presents:**

- Cut-out, masking, and alpha work (hair, fabric, semi-transparent edges)
- Colour grading and correction
- Black-and-white conversion (channel-aware)
- Skin retouching and frequency separation
- Compositing and clean-up
- Photo restoration (fade, dust, scratches, damage)
- Print preparation
- Precision keepsake artwork (handprint / footprint line conversion)

**Hard constraints:**

- Static site, no build step, no dependencies.
- Every identity fact ships as a clearly-marked placeholder — see *Open Decisions*.
- Imagery: freely licensed stock, credited. Processing demos must be genuine in-browser computation, not saved before/after JPEGs, and must be labelled as demonstrations on stock photography rather than presented as client commissions.

**Open decisions — deliberately undecided, must NOT be invented:**

- Owner's name, years of experience, email, location/time zone, social and portfolio links, client list.

## Brand Commitments

None supplied. No existing name, logo, palette, or typographic system to preserve. Voice should read as a working professional: precise, technical where it earns trust, no agency jargon and no hype.

## Evidence on Hand

- **No real client work samples exist yet.** No commissioned files, no client-supplied images.
- **No testimonials, no client names, no logos, no awards, no project counts, and no years-of-experience figure exist.** Future work must not fabricate any of these. Where social proof would normally sit, the design must omit it or provide an explicitly labelled slot.
- Freely licensed stock photography is available and is the material the live demonstrations run on.

## Product Principles

1. **The artwork leads.** The first viewport is an image at full scale, not a headline about images.
2. **Demonstrate, don't assert.** Every capability claim should be backed by something the visitor can operate or inspect.
3. **Range, then depth.** The visitor must see breadth quickly, and be able to go deep on any single technique.
4. **Instruments earn trust.** Showing the measurement alongside the image separates a professional from a hobbyist faster than any adjective.
5. **Never overstate.** Demonstrations on stock are labelled as such. The credibility of the whole site depends on it.
6. **The owner must be able to maintain it.** A non-developer has to swap text and images confidently, or the site rots on day one.

## Accessibility & Inclusion

No client-specific standard was established. Target WCAG 2.2 AA: every comparison and demo must be operable by keyboard as well as pointer, all artwork needs descriptive alt text, and motion must respect `prefers-reduced-motion`. Colour must never be the only channel carrying meaning, since a portion of this audience has colour-vision deficiency.
