# Starea proiectului RoomSheet Studio — 26 noiembrie 2026

Acest document separă funcțiile implementate de cele validate pentru utilizare. La 24 noiembrie, clientul a semnalat că poziția patului din demo era greșită. La 26 noiembrie, patul și noptierele au fost mutate pe peretele lateral de lângă dulap, conform indicației clientului, iar pagina publică a fost actualizată. Nu folosi scena drept plan de montaj fără confirmarea cotelor și a amplasării.

## Ce există și cum funcționează

| Parte | Stare | Implementare și verificare |
| --- | --- | --- |
| Structura proiectului | Implementat | `packages/room-model` ține geometria și verificările; `packages/viewer` construiește scena three.js; `apps/studio` gestionează interfața, importul scanării, proiectele și exportul. |
| Import RoomPlan | Implementat pentru cele două fișiere primite | `reference/captured-room.json` este importat; scanarea incompletă din `reference/fixtures/captured-room-partial.json` este respinsă cu motiv în română. Testul golden verifică regresia parserului, nu precizia fizică a scanării. |
| Editor manual | Parțial | Cameră dreptunghiulară, cote, uși, ferestre, goluri, nișe, calorifer, AC, țeavă, priză și întrerupător. Forma în L nu este implementată. |
| Mobilier demonstrativ | Parțial | Dulap, pat, două noptiere și masă de toaletă generate parametric din comanda transcrisă. Comoda scoasă din comandă nu apare. Geometria și materialele sunt aproximări, fără model PRO100 real. Masa de toaletă este ridicată cu 500 mm față de podea în mostra curentă, pe baza interpretării cererii din 26 noiembrie. |
| Dulap interactiv | Implementat ca mostră | Cele două fronturi glisează; se pot arăta bara, sertarele și rafturile. Lățimile coloanelor nespecificate în schiță sunt inferate. |
| Pat interactiv | Mecanism implementat; amplasare mutată, de confirmat vizual | Somiera și salteaua se ridică și arată o ladă cu despărțitor. Numărul compartimentelor este inferat. Tăblia este acum pe peretele de lângă dulap. |
| Aranjare și verificări | Parțial | În Studio se editează X, Z și rotirea fiecărei piese. Sunt afișate avertismente pentru segmentul 770/792 mm, ușă, tavan, suprapuneri, limitele camerei și culoare. Ancorele folosesc distanțe absolute față de colț; la schimbarea camerei, o piesă care nu încape primește avertisment. Aceste verificări nu confirmă intenția de design sau poziția patului. |
| Ruletă | Implementat | Cotele de control opționale produc diferența scanare/model minus măsurarea cu ruleta. |
| Lumină și finisaje | Demonstrativ | Ora, anotimpul, orientarea ferestrei, cerul, lustra, temperatura becului și LED-ul oglinzii schimbă scena. Sunt disponibile culori, opt simulări de finisaj de perete și patru podele procedurale; nu sunt mostre de producător. |
| Salvare și export | Implementat local | Proiectele se salvează în IndexedDB, cu rezervă în memorie dacă stocarea eșuează. Exportul produce un HTML autonom cu scenă și date filtrate, fără resurse externe; pagina client nu permite mutarea mobilierului. |
| Pagină găzduită | Actualizată la 26 noiembrie | [Previzualizarea client](https://igortacu.github.io/roomsheet-preview-019c3bbad77eecba/) este un fișier static într-un repo public cu nume greu de ghicit. URL-ul nu oferă autentificare. Scanarea brută și `metadata.json` cu GPS nu sunt publicate. |

## Poziția patului și controlul camerei

Mostrele Studio și generatorul paginii folosesc acum un singur set de plasamente din `apps/studio/src/sample-layout.ts`: patul are centrul **X = 1023 mm, Z = 1363 mm, rotire = 90°**, cu tăblia la peretele lateral de lângă dulap. Cele două noptiere au fost mutate lângă pat. Testul verifică lipsa suprapunerilor și a pieselor ieșite din cameră; latura dinspre arcadă are un culoar calculat de 440 mm și primește avertisment sub pragul de 600 mm. Controlul 3D a fost schimbat în orbitare în jurul punctului privit, cu apropiere prin rotiță sau gest cu două degete. Aceste valori și culoarul trebuie confirmate vizual și prin cote înainte de producție.

Expresia „lemnul cu oglinda ridicate cu 50 cm” a fost interpretată drept **masa de toaletă completă**, cu partea de jos la 500 mm de podea; oglinda și coloana se ridică împreună. Cota este stocată ca `elevationMm` în plasament, editabilă în Studio și păstrată în export. Înălțimea propriu-zisă a piesei rămâne 1450 mm, iar partea de sus ajunge la aproximativ 1950 mm de la podea. Această interpretare cere confirmare; ușile dulapului nu au fost ridicate.

Studio permite ajustarea prin câmpurile X/Z/Rotire și salvarea proiectului; acea ajustare nu actualizează automat pagina publică. Poziția din mostra actuală rămâne o propunere până la confirmarea clientului.

## Ce lipsește sau nu este validat

| Prioritate | Lucrare | Condiție pentru închidere |
| --- | --- | --- |
| 1 | Confirmarea plasamentului patului și a cotei mesei de toaletă | Poziția patului pe peretele de lângă dulap, culoarul de 440 mm și interpretarea ridicării mesei cu 500 mm confirmate pe plan și cu ruleta; pagina publică actualizată. |
| 2 | Livrare reală pe telefon | Linkul și HTML-ul deschise din Telegram, Viber și WhatsApp pe iOS și Android; WebGL, rotire și pașii suplimentari notați în `docs/DELIVERY.md`. Toate rândurile sunt încă „Netestat”. |
| 3 | Import CAD | OBJ+MTL real din PRO100, unități/axe/materiale validate, maparea materialelor și reimportul; GLB este a doua cale. Nu există încă export PRO100 în `reference/`. |
| 4 | Geometrie și finisaje finale | Editor de cameră în L; texturi și mostre reale de producător. |
| 5 | Import din schițe | Imaginile originale `IMG_1683…1691`, flux cache/live cu revizuire și confirmare, evaluarea AC9–AC13. `reference/expected-furniture.json` este numai transcrierea manuală primită. |
| 6 | Site de portofoliu | `apps/site`, dependent de `packages/viewer`, după M-DEMO. |

**M-DEMO nu este acceptat integral:** pagina și mostrele funcționează, dar poziția revizuită a patului nu este încă validată prin măsurători, iar deschiderea în mesagerie pe telefoane reale nu a fost probată. Nu revendicăm AC3/AC4 sau AC9–AC13. Starea fiecărui criteriu este în `docs/QA.md`.

## Cum se rulează și cum se verifică

Din rădăcina repo-ului:

```bash
npm install
npm run dev
```

În Studio: importă `reference/captured-room.json`, apasă **Încarcă mostrele comenzii**, apoi vezi poziția patului de sus. În secțiunea **Mobilă** poți modifica X, Z și Rotire pentru pat și salva proiectul. Pentru a verifica codul și genera rezerva locală:

```bash
npm run build
npm test
npm run demo:client
npm run client:audit -- dist/demo-client/roomsheet-demo.html
npm run client:verify -- dist/demo-client/roomsheet-demo.html
```

La 26 noiembrie, `npm run build` a trecut, toate cele **21 de teste Vitest** au trecut, iar auditul HTML-ului autonom a trecut la **496645 octeți**. Testul browser offline la 390×844, CPU 4×, a raportat FCP **1596 ms**, fără cereri externe sau erori; orbitarea a modificat efectiv imaginea scenei. Acest profil emulat nu înlocuiește un iPhone sau Android real. Fișierul `dist/demo-client/roomsheet-demo.html` este generat local și ignorat de Git; pagina găzduită este distribuită din repo-ul public separat.

## Fișiere de pornire

- `docs/SPEC.md`: cerințele și criteriile de acceptare.
- `docs/QA.md`: rezultatele verificate și criteriile neînchise.
- `docs/DELIVERY.md`: matricea testelor pe telefoane.
- `reference/expected-furniture.json`: dimensiunile și proveniența câmpurilor din transcrierea furnizată.
- `apps/studio/src/sample-layout.ts`: plasamentele implicite comune Studio și demo.
- `packages/viewer/src/index.ts`: geometria demonstrativă și interacțiunile dulapului/patului.

Nu adăuga `metadata.json` din exportul de scanare în repo: conține coordonate GPS.
