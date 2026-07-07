# Foxwild - Wie is het?

Deze versie bevat alleen het autospel **Wie is het?**. De bingo staat niet in dit pakket, zodat niemand daar al bij kan.

## Links

- Spel: `/wie-is-het/`
- Host: `/wie-is-het/admin.html`
- Hostcode: `LILLE2026`

## Firebase Rules

Zet in Firebase → Realtime Database → Rules:

```json
{
  "rules": {
    "games": {
      "wie-is-het-2026": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

Klik daarna op **Publish**.

## Uploaden naar GitHub

Upload de inhoud van deze map naar je repository. Dus upload:

- `index.html`
- `README.md`
- `wie-is-het/`

Niet alleen de zip uploaden.
