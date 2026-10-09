# Chessy Night

Website source for the Chessy Night club: events, chess puzzles, shared rankings, and organiser tools.

## Local development

Requires Node.js 24 or newer and npm.

```sh
npm ci
npm run build
node scripts/check.mjs
npm run validate
node scripts/preview.mjs
```

The preview runs at http://localhost:4173 using an in-memory test database. Production data is not copied into this repository.

## Editing

- `worker/page.html`: public website layout and interactions.
- `worker/main.js` and `worker/content.js`: request handling and club functionality.
- `worker/admin.html`: organiser interface.
- `db/schema.ts` and `drizzle/`: database schema and migrations.
- `scripts/build.mjs`: builds the Cloudflare Worker.

## Publishing

The current live site is hosted by Sites at https://chessy-night-rebuilt.kishelraj.chatgpt.site. GitHub stores the source; a push does not automatically deploy the site. Production requires the existing D1 database and R2 photo storage bindings recorded in `.openai/hosting.json`.

## About and Contact

The About and Contact views are published. Team cards use placeholder roles and photos. The founder section links to the supplied Instagram reference. The enquiry form opens WhatsApp with the visitor's message; the visitor reviews and sends it there.
