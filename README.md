# Foxwild · Wie is het?

Nieuwe versie zonder bingo. Dit spel bestaat uit:

- Most likely-vragen
- Wie zei deze quote?
- Waar of leugen?
- Foxwild-feitjes
- 60 seconden per ronde
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


## v8 wijzigingen
- De vragen over meest/minst berichten zijn terug als personenvragen.
- De totalen-vragen over hoeveel berichten er precies in totaal zijn gestuurd blijven eruit.
- Bij minst/meest wordt gekeken naar de vakantiegangers die meedoen.
- Nieuw toegevoegd: minste berichten in de lustrumgroep en minste berichten in de QUOTES!!!-groep.


## v10 wijzigingen
- Elke reset maakt een nieuwe willekeurige vragenvolgorde.
- Tijdens één spel ziet iedereen wel dezelfde vraag in dezelfde ronde.
- Op de gewone spelpagina zit nu een verborgen hostfunctie achter de hostcode.
- Als alle auto's hebben geantwoord, kan de host de timer overslaan en direct onthullen.
- De hostknop is lokaal: alleen zichtbaar op het toestel waarop de hostcode is ingevoerd.


## v13 wijzigingen

- Tijd per ronde staat op 60 seconden.
- Host kan de timer pauzeren en hervatten.
- Wouter en Chandler zijn samengevoegd tot één speler: Wouter / Chandler.


## Nieuw in v13

- Op de spelpagina staat nu altijd een knop **Naam** om je team/auto naam tussendoor te wijzigen. Handig als een telefoon het startscherm overslaat.
- In de lokale hostknop zit nu ook **Reset spel**.
- De host kan het spel **stoppen/pauzeren** en later weer verder laten gaan.
- De losse adminpagina blijft beschikbaar op `/wie-is-het/admin.html`.
