# Starea proiectului RoomSheet Studio — 24 noiembrie 2026

Acest document separă funcțiile implementate de cele validate pentru utilizare. **Poziția patului din demo este greșită**, conform observației clientului. Modelul se poate ridica și arată lada, dar amplasarea sa în cameră nu este aprobată. Pagina publică reproduce aceeași poziție greșită. Nu folosi această scenă drept plan de montaj sau drept dovadă că mobilierul este așezat corect.

## Ce există și cum funcționează

| Parte | Stare | Implementare și verificare |
| --- | --- | --- |
| Structura proiectului | Implementat | `packages/room-model` ține geometria și verificările; `packages/viewer` construiește scena three.js; `apps/studio` gestionează interfața, importul scanării, proiectele și exportul. |
| Import RoomPlan | Implementat pentru cele două fișiere primite | `reference/captured-room.json` este importat; scanarea incompletă din `reference/fixtures/captured-room-partial.json` este respinsă cu motiv în română. Testul golden verifică regresia parserului, nu precizia fizică a scanării. |
| Editor manual | Parțial | Cameră dreptunghiulară, cote, uși, ferestre, goluri, nișe, calorifer, AC, țeavă, priză și întrerupător. Forma în L nu este implementată. |
| Mobilier demonstrativ | Parțial | Dulap, pat, două noptiere și masă de toaletă generate parametric din comanda transcrisă. Comoda scoasă din comandă nu apare. Geometria și materialele sunt aproximări, fără model PRO100 real. |
| Dulap interactiv | Implementat ca mostră | Cele două fronturi glisează; se pot arăta bara, sertarele și rafturile. Lățimile coloanelor nespecificate în schiță sunt inferate. |
| Pat interactiv | **Mecanism demonstrativ implementat; amplasare greșită** | Somiera și salteaua se ridică și arată o ladă cu despărțitor. Numărul compartimentelor este inferat. Plasamentul din cameră trebuie corectat și aprobat. |
| Aranjare și verificări | Parțial | În Studio se editează X, Z și rotirea fiecărei piese. Sunt afișate avertismente pentru segmentul 770/792 mm, ușă, tavan, suprapuneri, limitele camerei și culoare. Ancorele folosesc distanțe absolute față de colț; la schimbarea camerei, o piesă care nu încape primește avertisment. Aceste verificări nu confirmă intenția de design sau poziția patului. |
| Ruletă | Implementat | Cotele de control opționale produc diferența scanare/model minus măsurarea cu ruleta. |
| Lumină și finisaje | Demonstrativ | Ora, anotimpul, orientarea ferestrei, cerul, lustra, temperatura becului și LED-ul oglinzii schimbă scena. Sunt disponibile culori, opt simulări de finisaj de perete și patru podele procedurale; nu sunt mostre de producător. |
| Salvare și export | Implementat local | Proiectele se salvează în IndexedDB, cu rezervă în memorie dacă stocarea eșuează. Exportul produce un HTML autonom cu scenă și date filtrate, fără resurse externe; pagina client nu permite mutarea mobilierului. |
| Pagină găzduită | Publicată, **cu patul amplasat greșit** | [Previzualizarea client](https://igortacu.github.io/roomsheet-preview-019c3bbad77eecba/) este un fișier static într-un repo public cu nume greu de ghicit. URL-ul nu oferă autentificare. Scanarea brută și `metadata.json` cu GPS nu sunt publicate. |

## Problema prioritară: poziția patului

Mostrele din `apps/studio/src/main.ts` și generatorul paginii din `apps/studio/src/export/demo.ts` folosesc acum pentru pat centrul **X = 1400 mm, Z = 1550 mm, rotire = 0°**. Aceste valori au fost alese pentru demonstrație; nu sunt o transcriere verificată a amplasării cerute. De aceea patul apare greșit în Studio și în pagina publică. Mecanismul de ridicare este o funcție separată și nu rezolvă poziția.

**Corectare:** fixează poziția și orientarea pe planul camerei cu clientul, apoi schimbă plasamentul implicit și generatorul demo. Verifică scena de sus și din ușă, spațiile de trecere și avertismentele, exportă din nou HTML-ul și republică pagina. Până la această verificare, statutul plasamentului este **neaprobat**. Studio permite o ajustare temporară prin câmpurile X/Z/Rotire și salvarea proiectului; acea ajustare nu actualizează automat pagina publică.

## Ce lipsește sau nu este validat

| Prioritate | Lucrare | Condiție pentru închidere |
| --- | --- | --- |
| 1 | Corectarea plasamentului patului | Poziție/orientare confirmate pe plan, verificare vizuală și geometrică, export și publicare refăcute. |
| 2 | Livrare reală pe telefon | Linkul și HTML-ul deschise din Telegram, Viber și WhatsApp pe iOS și Android; WebGL, rotire și pașii suplimentari notați în `docs/DELIVERY.md`. Toate rândurile sunt încă „Netestat”. |
| 3 | Import CAD | OBJ+MTL real din PRO100, unități/axe/materiale validate, maparea materialelor și reimportul; GLB este a doua cale. Nu există încă export PRO100 în `reference/`. |
| 4 | Geometrie și finisaje finale | Editor de cameră în L; texturi și mostre reale de producător. |
| 5 | Import din schițe | Imaginile originale `IMG_1683…1691`, flux cache/live cu revizuire și confirmare, evaluarea AC9–AC13. `reference/expected-furniture.json` este numai transcrierea manuală primită. |
| 6 | Site de portofoliu | `apps/site`, dependent de `packages/viewer`, după M-DEMO. |

**M-DEMO nu este acceptat integral:** pagina și mostrele funcționează, dar poziția patului este greșită și deschiderea în mesagerie pe telefoane reale nu a fost probată. Nu revendicăm AC3/AC4 sau AC9–AC13. Starea fiecărui criteriu este în `docs/QA.md`.

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

La 24 noiembrie, `npm run build` a trecut, toate cele **20 de teste Vitest** au trecut, iar auditul HTML-ului autonom a trecut la **495984 octeți**. Testul browser offline la 390×844, CPU 4×, a raportat FCP **1476 ms**, fără cereri externe sau erori; acest profil emulat nu înlocuiește un iPhone sau Android real. Fișierul `dist/demo-client/roomsheet-demo.html` este generat local și ignorat de Git; pagina găzduită este distribuită din repo-ul public separat. Ambele conțin încă plasamentul greșit al patului.

## Fișiere de pornire

- `docs/SPEC.md`: cerințele și criteriile de acceptare.
- `docs/QA.md`: rezultatele verificate și criteriile neînchise.
- `docs/DELIVERY.md`: matricea testelor pe telefoane.
- `reference/expected-furniture.json`: dimensiunile și proveniența câmpurilor din transcrierea furnizată.
- `apps/studio/src/main.ts` și `apps/studio/src/export/demo.ts`: plasamentele implicite de corectat.
- `packages/viewer/src/index.ts`: geometria demonstrativă și interacțiunile dulapului/patului.

Nu adăuga `metadata.json` din exportul de scanare în repo: conține coordonate GPS.
