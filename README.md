# Foxwild · Wie is het?

Nieuwe versie zonder bingo. Dit spel bestaat uit:

- Most likely-vragen
- Wie zei deze quote?
- Waar of leugen?
- Foxwild-feitjes
- 40 seconden per ronde
- Geen motivatie of extra tekst
- Inzetknoppen: 1, 3 of 5 punten
- Live scorebord via Firebase

## Uploaden naar GitHub

Upload de inhoud van deze map naar je repository `Foxwild`.

Uiteindelijk moet je in GitHub zien:

```text
index.html
README.md
wie-is-het/
```

## Links

Spel:

```text
https://juliagoris00.github.io/Foxwild/wie-is-het/
```

Optioneel spelscherm:

```text
https://juliagoris00.github.io/Foxwild/wie-is-het/admin.html
```

Hostcode:

```text
LILLE2026
```

## Firebase Rules

Gebruik deze rules in Firebase Realtime Database:

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

## Schoon beginnen

Open het optionele spelscherm en klik één keer op **Reset spel** voordat jullie beginnen.


## v5 wijzigingen
- Foxwild-kennisvragen vervangen door leukere groepsstatistieken.
- Waar/leugen-vragen zijn nu ongeveer in balans.
- Sommige quotevragen hebben “Dit is nooit gezegd” als juist antwoord.
- Motivatie blijft volledig weg: alleen kiezen + inzet.


## v7 wijzigingen
- De twee niet-meespelende personen zijn uit de spelerslijst verwijderd.
- Vragen/antwoorden waarin zij voorkwamen zijn verwijderd.
- De twee vragen over het totale aantal tekstberichten zijn verwijderd.
- De volgorde blijft per reset willekeurig.
