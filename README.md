# Foxwild - Wie is het?

Mobiele partygame voor de Foxwild-roadtrip.

## Link

Na upload naar GitHub Pages:

- Spel: `https://juliagoris00.github.io/Foxwild/wie-is-het/`
- Admin/spelscherm: `https://juliagoris00.github.io/Foxwild/wie-is-het/admin.html`

## Nieuw in deze versie

- Teams kunnen altijd hun naam wijzigen via de knop **Naam**.
- Na het invullen van teamnaam komt ieder team in een wachtruimte.
- Teams klikken op de grote 🦊-knop om aan te geven dat ze klaar zijn.
- De host start de eerste ronde pas als iedereen erin zit.
- De hostknop staat onderaan de spelpagina.
- De optie **Andere naam** is verwijderd uit de antwoordopties.
- Bij onthullen verschijnt een duidelijke uitslag-popup.
- Bij quotevragen wordt extra context getoond wanneer die uit de WhatsApp-export kon worden gehaald.
- Host kan pauzeren/stoppen, hervatten, onthullen, volgende ronde starten en resetten.

## Uploaden

Upload de inhoud van deze map naar je GitHub repository `Foxwild` en laat oude bestanden vervangen.

## Firebase Rules

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

## Hostcode

De hostcode staat in `wie-is-het/js/firebase-config.js`.



## v15 fix

Deze versie fixt een probleem waarbij de ronde soms bleef hangen na “Onthul nu”.
