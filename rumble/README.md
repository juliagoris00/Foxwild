# Rijsel Rumble

Interactief autospel voor 4 auto's richting Lille. Iedereen speelt per auto/team. Raad de meerderheid, zet punten in en win bonuspunten met de beste motivatie.

## Uploaden naar GitHub

Upload deze bestanden/mappen naar dezelfde GitHub repository als je Pubcrawl-site:

- rijsel-rumble.html is hier index.html als je aparte repo gebruikt
- admin.html
- css/
- js/

Als je dit naast je bingo in dezelfde repo zet, hernoem dan:
- index.html naar rumble.html
- admin.html naar rumble-admin.html

Dan zijn de links:
- /rumble.html
- /rumble-admin.html

## Firebase

Gebruik dezelfde Firebase-config als bij je bingo. Kopieer jouw bestaande `js/firebase-config.js` of vul dit bestand in.

Zorg dat de Rules dit toestaan:

{
  "rules": {
    "games": {
      "lille-barcrawl-2026": { ".read": true, ".write": true },
      "rijsel-rumble-2026": { ".read": true, ".write": true }
    }
  }
}

## Hostcode

Standaard: LILLE2026

## Vragen aanpassen

Open `js/rumble-questions.js` en pas de vragen aan.
