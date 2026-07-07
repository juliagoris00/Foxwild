# Lille Games

Deze repository bevat twee losse spellen:

- `/bingo/` — Lille Bar Crawl Bingo
- `/rumble/` — Rijsel Rumble autospel

Firebase Realtime Database rules:

```json
{
  "rules": {
    "games": {
      "lille-barcrawl-2026": { ".read": true, ".write": true },
      "rijsel-rumble-2026": { ".read": true, ".write": true }
    }
  }
}
```

Links op GitHub Pages:

- Hoofdmenu: `https://juliagoris00.github.io/Pubcrawl/`
- Bingo: `https://juliagoris00.github.io/Pubcrawl/bingo/`
- Bingo host: `https://juliagoris00.github.io/Pubcrawl/bingo/admin.html`
- Rumble: `https://juliagoris00.github.io/Pubcrawl/rumble/`
- Rumble host: `https://juliagoris00.github.io/Pubcrawl/rumble/admin.html`

Hostcode: `LILLE2026`
