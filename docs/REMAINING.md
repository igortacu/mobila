# Lucrări care depind de surse sau probe lipsă

Pagina pentru prezentarea din 24 noiembrie este disponibilă și verificată local/offline. Etapele de mai jos nu sunt declarate trecute în `docs/QA.md`:

| Lucrare | Ce lipsește pentru acceptare |
| --- | --- |
| **Poziția patului în demo** | Patul a fost mutat pe peretele de lângă dulap la X=1023 mm, Z=1363 mm, rotire 90°, împreună cu noptierele. Trebuie confirmate amplasarea și culoarul de 440 mm prin plan și ruletă. |
| Import OBJ+MTL PRO100, maparea materialelor, apoi GLB | Un export real PRO100 cu materialele și texturile asociate. M-DEMO folosește mostrele parametrice; importul real nu este prezentat drept funcțional. |
| Import și evaluare din schițe | Imaginile originale `IMG_1683…1691` și un rezultat real verificabil. `reference/expected-furniture.json` conține doar transcrierea manuală furnizată. |
| Testul de livrare în mesagerie | Deschiderea linkului și a HTML-ului atașat în Telegram, Viber și WhatsApp pe iOS și Android, cu WebGL și rotire verificată. Matricea rămâne „Netestat” în `docs/DELIVERY.md`. |
| Editorul în L și finisajele de producător | Editorul curent este dreptunghiular. Viewerul oferă opt simulări orientative de suprafață și patru podele procedurale; nu există încă mostre fizice sau texturi ale producătorului. |
| Site-ul de portofoliu `apps/site` | Urmează după M-DEMO și va reutiliza `packages/viewer`. Pagina client găzduită de acum este un fișier static de demonstrație. |

Nu folosi URL-ul greu de ghicit drept control de acces. Repozitoriul GitHub Pages este public și conține doar HTML-ul filtrat al demonstrației, fără scanarea brută sau `metadata.json`.
