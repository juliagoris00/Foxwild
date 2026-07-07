# Lille Bar Crawl Bingo

Mobiele bingo-webapp met:

- naam invullen
- unieke 5x5 kaart per speler
- lokaal opslaan van voortgang
- live-scorebord met Firebase Realtime Database
- adminpagina met reset en CSV-download
- confetti bij bingo

## 1. Upload naar GitHub Pages

1. Pak deze zip uit.
2. Ga naar je GitHub repository.
3. Upload **alle bestanden en mappen** uit deze map naar de repository.
4. Ga naar **Settings > Pages**.
5. Kies **Deploy from branch**, branch **main**, folder **/root**.
6. Wacht tot GitHub een link geeft.

## 2. Firebase-config invullen

1. Ga naar Firebase Console.
2. Open je project.
3. Klik op het tandwiel naast **Project Overview**.
4. Klik **Project settings**.
5. Scroll naar **Your apps** en kies je web-app.
6. Kopieer het object `firebaseConfig`.
7. Open in GitHub het bestand `js/firebase-config.js`.
8. Vervang de placeholder-waarden door jouw Firebase-config.
9. Klik **Commit changes**.

Voorbeeld van hoe het eruit moet zien:

```js
window.firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "https://....firebasedatabase.app",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Let op: `databaseURL` moet erbij staan. Staat die niet in je config? Kopieer hem vanuit **Realtime Database** en voeg hem zelf toe.

## 3. Realtime Database regels

Voor een vriendenweekend kun je tijdelijk deze simpele regels gebruiken:

```json
{
  "rules": {
    "games": {
      "lille-barcrawl-2026": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

Ga naar **Realtime Database > Rules**, plak dit erin en klik **Publish**.

Belangrijk: dit is prima voor een tijdelijk spel met vrienden, maar laat open regels niet maandenlang staan.

## 4. Opdrachten aanpassen

Open `js/tasks.js`. Elke regel tussen aanhalingstekens is één opdracht.

Voorbeeld:

```js
"Bestel een drankje volledig in het Frans",
"Maak een groepsselfie in een bar",
```

Zorg dat er minimaal 25 opdrachten zijn, maar 60+ is beter voor unieke kaarten.

## 5. Hostpagina

De hostpagina staat op:

`jouw-website-link/admin.html`

Standaard hostcode:

`LILLE2026`

Die kun je aanpassen in `js/firebase-config.js`:

```js
window.BINGO_ADMIN_CODE = "LILLE2026";
```

## 6. Testen

Open de website op twee telefoons of twee browservensters. Vul twee verschillende namen in. Vink vakjes af. Het scorebord hoort live te veranderen.
