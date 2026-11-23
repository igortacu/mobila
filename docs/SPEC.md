# RoomSheet Studio — specificația MVP

## Scop și surse

Aplicație locală pentru atelier: proiectantul importă scanarea Apple RoomPlan sau introduce măsurătorile într-un editor de cameră, apoi importă în primul rând exportul OBJ din PRO100, verifică încadrarea și trimite clientului o previzualizare interactivă pe telefon. Livrarea principală țintă este o pagină statică la un link de pe domeniul firmei, cu URL greu de ghicit; HTML-ul autonom rămâne rezervă. Pasul 0 verifică ambele căi pe iOS și Android din Telegram, Viber și WhatsApp. Interfața este în română. Codul, numele din date și comentariile sunt în engleză. Importul opțional al schițelor prin OpenRouter este o cale secundară pentru comenzile fără export PRO100 și singurul apel extern al aplicației locale. Fără cheie API, aplicația de proiectare funcționează local. Găzduirea paginii client este doar distribuție statică, fără backend sau conturi.

Materialul disponibil acum: prototipul HTML atașat, comanda transcrisă în mesaj, scanarea completă `reference/captured-room.json` și scanarea ratată `reference/fixtures/captured-room-partial.json`. Nu există încă un export OBJ+MTL real din PRO100; `oak.jpg`, imaginile `IMG_1683…1691` și `expected-furniture.json` lipsesc încă. Fișierele RoomPlan sunt folosite ca fixture-uri geometrice; `metadata.json` cu GPS nu intră în repo. Valorile estimate din text nu vor fi prezentate ca rezultate calculate din scanare.

## Livrabil și flux

Monorepo de la început: `packages/room-model` conține tipurile, normalizarea și `checks/`; `packages/viewer` conține scena, iluminarea și finisajele, fără import sau cod de proiectare; `apps/studio` conține aplicația actuală, importurile RoomPlan/CAD/schiță, editorul, persistența și exportul. Vite, TypeScript `strict`, `three@0.160.1` exact, DOM simplu, Vitest și Playwright. `npm install && npm run dev` pornește Studio fără backend de producție. Un plugin mic Vite servește doar `/api/sketch` în dezvoltare și citește cheia din `.env.local`. Proiectele se salvează în IndexedDB; fiecare operație are `try/catch`, iar o eroare lasă sesiunea utilizabilă în memorie. Fișierul client de rezervă are țintă **≤5 MB** și nu face cereri de rețea pentru resurse. Pagina statică principală va folosi `packages/viewer` și un proiect publicat static; URL-ul greu de ghicit nu este tratat ca autentificare.

Ecrane: lista proiectelor → proiect nou → import scanare **sau** editor de cameră → import OBJ+MTL din PRO100 sau mostre → asociere materiale → aranjare → verificări → export. GLB este a doua cale CAD. În M-DEMO, editorul acceptă doar camere dreptunghiulare; forma în L urmează după demonstrație. Editorul folosește lungimile pereților și înălțimea tavanului, cu previzualizare 2D și elemente plasate prin perete, distanță în mm de la colț, lățime, înălțime și parapet unde se aplică: ușă, fereastră, arcadă/gol, nișă, calorifer, aparat AC, țeavă, priză și întrerupător. Camera introdusă manual poartă eticheta „dimensiuni estimate” în proiect și fișierul client până la înlocuirea cu o scanare sau măsurători confirmate. După M-DEMO, înlocuirea camerei păstrează ancorele pieselor la pereții corespunzători, recalculează coordonatele și semnalează în `checks/` orice piesă care nu mai încape; nu o redimensionează și nu o deplasează tăcut. Abia după ce modulele 1–7 trec criteriile lor de acceptare se adaugă importul din schiță. Acesta are mod „Din cache” și „Live”. Fără cheie, „Live” este dezactivat cu explicație; cache poate funcționa fără rețea. Înainte de plasarea unui model propus din schiță, proiectantul vede imaginea, câmpurile editabile și previzualizarea 3D și apasă „Confirm dimensiunile”. Costul și durata sunt afișate pentru apelurile live. Se afișează explicit că imaginile sunt trimise unui furnizor extern prin OpenRouter.

## Model de date

Toate lungimile persistate, importate și exportate sunt în **mm**; conversia în metri se face numai în adaptoarele three.js. Nu persistăm sau exportăm metadate despre locație, coordonate GPS, heading ori nume de locuri.

- `RoomModel`: `width`, `length`, `height`, `axisRotation`, contur în puncte 2D (dreptunghi sau L), pereți cu id stabil, segment, grosime și înălțime, goluri asociate unui perete (`arch|door|window`, poziție, lățime, înălțime, parapet), nișe, obstacole (`radiator|ac|pipe|socket|switch`) cu poziție pe perete și dimensiuni, avertismente geometrice și `measurementStatus: "estimated"|"measured"`. `controlMeasurements?` conține cote măsurate cu ruleta, identificate prin perechea de repere/segment și valoare în mm; `measurementDiffs` este raportul calculat scanare minus ruletă, în mm, inclusiv valoarea absolută și marcajul de depășire a toleranței. Datele originale se păstrează separat, fără ajustarea tăcută a scanării. `axisRotation` este doar rotirea geometrică relativă pentru corectare, nu heading geografic. Fiecare perete poate avea opțional `appearance` (culoare, textură, sursă) și `mountedItems` (tip, distanță de la colț, înălțime, dimensiuni, sursă, încredere); acestea pregătesc faza 2, fără a implementa captură foto.
- `FurnitureSpec`: tip enumerat (`wardrobe|bed|nightstand|vanity|dresser|generic_cabinet`), dimensiuni, picioare, materiale pe componente, uși, secțiuni verticale, rafturi, bară, sertare, oglindă și LED. Fiecare număr extras din schiță este `{value, source: "read"|"inferred", confidence: 0..1}`; câmpurile lipsă rămân vizibile, nu devin valori implicite ascunse. Unitatea este mm.
- `FurnitureInstance`: id, `FurnitureSpec` sau referință la fișierul CAD, poziție X/Z și rotație, plus opțional `wallAnchor` (id perete, **distanță absolută în mm de la colțul de referință**, offset perpendicular în mm și orientare relativă) pentru înlocuirea camerei; dimensiunile verificate rămân explicite. `source` diferențiază mostră, CAD și schiță confirmată. Modelul CAD păstrează ierarhia de grupuri/obiecte PRO100 ca piese individuale, cu nume, material și vizibilitate.
- `MaterialCatalogEntry`: cod, nume, culoare sau textură, rugozitate, metalness. Asocierea `importedName → catalogCode` este memorată per firmă.
- `Project`: versiune de schemă, nume local, `RoomModel`, lista pieselor, materiale, finisaje, iluminare și plasamente. Fișierul client primește numai datele necesare vizualizării și fișierele inline.

Mostrele confirmate din comandă: dulap 1700×600×2500 (corp 2420, picioare 80; glisante MDF P017 și oglindă; secțiune 500 cu raft 350 de sus, bară, 4 sertare în 700; două coloane cu 384 apoi 382 mm); pat 1846×2046 (tăblie 850 peste picioare, cadru 320, picioare 80, ladă și somieră rabatabilă); două noptiere 400×400×500, câte două sertare; masă de toaletă 770×400×1450 (oglindă 620×1250, LED lateral, coloană 150 cu trei rafturi, bază 200 cu două sertare). PAL H1710 ST10 este pentru corpuri, MDF P017 `#AA9D8C` pentru capace și fațade, cu excepția tapițeriei patului în ton P017. Comoda PAL K101 PE este **scoasă din comandă**; apare doar în datele de evaluare, nu în scena inițială. Grosimea de 18 mm, lățimile celor două coloane de dulap, dimensiunea saltelei, grosimea tăbliei, compartimentele lăzii și materialele mesei de toaletă sunt inferențe și se etichetează ca atare.

## Module și limite

| Modul | Responsabilitate și contract |
| --- | --- |
| `roomplan/` în `apps/studio` | Citește CapturedRoom, validează câmpuri, normalizează mm. Funcții pure: orientare la axa dominantă, îmbinare pereți coliniari/coincidenți, deduplicare goluri după alinierea la peretele părinte, eliminare pereți suprapuși pe un gol, împerechere fețe de perete gros, închidere/verificare contur. Raportează precis segmentul lipsă; nu inventează o cameră validă din două ziduri. |
| `room-editor/` în `apps/studio` | Creează același `RoomModel` din măsurători introduse, cu formular și plan 2D. M-DEMO: dreptunghi. După M-DEMO: formă în L și înlocuirea camerei. Editează goluri, nișe, calorifer, AC, țeavă, priză și întrerupător montate pe pereți. Validează conturul și limitele elementelor. Înlocuirea camerei păstrează distanțele absolute ale ancorelor, apoi rulează verificările; o piesă care nu mai încape rămâne la ancora ei și primește avertisment. |
| `cad-import/` în `apps/studio` | Calea principală: OBJ+MTL din PRO100, apoi GLB. Citește bounding box, compară cu dimensiunea cunoscută pentru mm/cm/m, stabilește axa verticală, mută pivotul la centrul bazei și listează toate numele materialelor **și texturilor**. Păstrează grupurile/obiectele ca elemente distincte pentru ascunderea ușilor și afișarea interiorului. Dacă MTL indică texturi lipsă, se folosește asocierea la catalog. Ambiguitatea de scară sau axă cere alegere în UI. Până la primirea unui fișier real, testele folosesc un OBJ sintetic și ipotezele de mai jos. |
| `materials/` în `apps/studio` | Catalogul firmei: PAL H1710 ST10 din `oak.jpg`, MDF P017, oglindă, profil aluminiu, crom, picioare negre; asocierea automată din mapări salvate. Viewer primește numai materialele deja rezolvate. |
| `sketch-import/` | Modul secundar, construit ultimul, după trecerea modulelor 1–7. Proxy Vite cu cheia numai pe server, model id din `.env.local`, răspuns structurat JSON Schema, validare locală cu Ajv, un retry la schemă invalidă și erori prezentate în formular. Verificări deterministe pentru lățimi + panouri, înălțimi rafturi, corp + picioare și adâncimi plauzibile. Răspunsurile reușite sunt salvate per hash de imagini în `fixtures/sketch-cache/`. Furnizorii care permit antrenarea pe datele trimise sunt excluși. |
| `scene/` în `packages/viewer` | Construiește camera, golurile reale, arcada, nișa, plinta și cornișa; generează mostrele și modelele parametrice confirmate prin aceeași funcție; folosește umbre, reflexii cubemap și ascunderea pereților spre cameră. Include vederi de sus, din ușă, din pat, spre dulap și spre oglindă. Primește plasamente finale; gesturile de proiectare și limitarea mutării stau în Studio. |
| `lighting/` în `packages/viewer` | Portarea formulei din prototip pentru anotimp și orele 05–23, busola ferestrei, cer senin/înnorat, becuri 2700/3000/4000/6500 K. Parametrii geografici rămân numai în codul aplicației de proiectare; viewer primește un tabel precalculat de direcții solare, fără coordonate ori nume de loc. Soarele iluminează prin goluri, cu umbre active. |
| `finishes/` în `packages/viewer` | Paletă și finisaje mat, satinat, perlat, metalizat, cameleon, catifea, marmorino, microciment; texturi de podea procedurale. |
| `checks/` în `packages/room-model` | Funcții pure pentru potrivirea pe segment, rezerva față de tavan, diagonala de ridicare, culoar <600 mm, suprapuneri, raza ușii și interferența cu prize, întrerupătoare, calorifere sau alte obstacole de pe perete. Semnalează explicit când o piesă ancorată nu mai încape după înlocuirea camerei și calculează diferențele dintre scanare și `controlMeasurements`; nu redimensionează sau mută piese. Mesajele includ cifrele și cer ruleta pentru marje sub precizia scanării. |
| `export/` în `apps/studio` | Produce pagina statică pentru domeniul firmei folosind `packages/viewer` și un HTML autonom de rezervă, cu bundle, JSON și texturi inline, fără fetch/CDN, țintă **≤5 MB**. Clientul poate schimba pereți/tavan, finisaje, oră, anotimp și lămpi, dar nu poate muta mobila. `docs/DELIVERY.md` stabilește comportamentul pe telefoane înaintea implementării exportului. |
| `app/` în `apps/studio` | Fluxurile proiectantului, starea UI și persistența. Nu conține algoritmii de geometrie sau verificare. |

## Acceptare și dovezi

| Criteriu | Verificare obligatorie |
| --- | --- |
| AC1 | Golden file pentru scanarea reală: 4005×2840×2632 ±10, perete arcadă 336, un gol de 1310×2300, nișă 675, fereastră 1718×1482, ușă 824×2114; import fără erori în consolă. Acesta este **test de regresie**, nu dovadă a preciziei scanării; precizia se verifică numai prin `controlMeasurements` față de ruletă. |
| AC2 | Test scanare malformată/cu doi pereți și verificare mesaj românesc care numește lipsa. |
| AC3 | Test import OBJ în mm și m cu același bounding box final. |
| AC4 | Test listă materiale necunoscute, mapare și reimport automat. |
| AC5 | Test `770` pe segment `792` → rezervă `22` mm și mesaj cu ruleta; verificare numerică a spațiului rămas lângă ușă pentru dulap. |
| AC6 | Test unitar poziție solară la ore/anotimp; verificare vizuală a umbrelor prin fereastră și arcadă. |
| AC7 | Playwright deschide exportul `file://` offline la 390×844; grep pentru coordonate/nume de locuri și resurse externe. Livrarea efectivă pe telefon urmează decizia testului de mesagerie din `docs/DELIVERY.md`. |
| AC8 | Playwright pe profil de telefon emulat 390×844 cu CPU throttling **4×** măsoară `first-contentful-paint` <3 s; se raportează mediul și se verifică fișierul client **≤5 MB**. |
| AC8b | Test de echivalență: editorul dreptunghiular cu 4005×2840×2632, arcadă 1310 la 738 mm și ușă 824 la 1934 mm produce aceleași avertismente de încadrare ca scanarea. Verificare pentru eticheta „dimensiuni estimate” în export; după M-DEMO, test separat pentru ancore absolute și avertismentul la înlocuirea camerei. |
| AC9 | Fără cheie, butonul Live este dezactivat, cu explicație; restul fluxului funcționează. |
| AC10 | Imaginile dulapului comparate cu `expected-furniture.json`: dimensiuni ±2 mm; compartimentul și rafturile sunt corecte sau marcate la revizuire. |
| AC11 | Teste schemă și consistență: răspuns invalid nu plasează automat modelul, câmpurile greșite sunt evidențiate. |
| AC12 | Căutare a cheii de test în bundle, export și dump IndexedDB: zero apariții. |
| AC13 | Playwright cu rețeaua oprită și „Din cache”: schiță → revizuire → confirmare → model în cameră. |

Vitest testează fiecare pas de curățare, golden file, conversia unităților, soarele, verificările de spațiu, diferențele față de cotele cu ruleta, echivalența dintre camera scanată și cea introdusă manual, schema, consistența și bounding box-ul generatoarelor. Playwright parcurge import scanare → mostre → export → fișier client offline și salvează capturi pentru regresie vizuală. Un test separat verifică ancorele absolute după M-DEMO. `docs/QA.md` va lega fiecare criteriu de rezultate. `npm run eval:sketch` va compara fiecare imagine din `reference/sketches/` cu adevărul de teren, raportând pe câmp ±2 mm, ±10 mm, greșit și lipsă, pe piesă trecere/eșec și comparație între model id-uri; rularea live este manuală și rezultatul intră în `docs/EVAL.md`.

## Riscuri și decizii

- Cele două scanări reale sunt disponibile pentru AC1 și AC2; imaginile schițelor lipsesc, deci AC10 și evaluarea live nu pot fi revendicate. Testul golden este regresie față de această scanare, nu dovadă de precizie fizică.
- Scala și axa CAD pot fi ambigue; UI cere corectarea înainte de plasare.
- Precizia RoomPlan poate fi mai slabă decât rezerva de 22 mm; avertismentul cere măsurare cu ruleta înainte de producție.
- HTML autonom poate depăși 5 MB dacă include texturi mari sau GLB complexe; optimizarea texturilor și testul de mărime sunt porți de acceptare.
- Calitatea și costul citirii schițelor depind de model; demonstrația folosește cache dacă evaluarea live din aceeași dimineață nu a trecut.
- Previzualizările linkului din mesagerie și fișierele `file://` pot funcționa diferit pe telefon. Pasul 0 testează ambele căi; rezultatele necunoscute nu sunt tratate ca succes. Pentru testarea pe dispozitive și trimiterea mesajelor sunt necesare dispozitivele, conturile de test și domeniul firmei; până la test, linkul static rămâne ținta, nu un rezultat verificat.

## To verify with a real PRO100 file

Nu există încă un export PRO100 autentic. Pentru fixture-ul sintetic presupunem că OBJ folosește `o` sau `g` pentru elemente, `usemtl` pentru fiecare piesă, MTL are `newmtl` și eventual `map_Kd`, iar geometria poate fi în mm, cm sau m și cu Y sau Z vertical. Acestea sunt ipoteze de implementare, nu fapte confirmate despre exportul firmei. Un export real trebuie verificat pentru: convenția unităților și axei; originea/pivotul; numele și granularitatea grupurilor (uși, fronturi, rafturi); legăturile MTL și căile texturilor; codificarea numelor; fețe/normale; și dacă exportul conține mai multe piese de mobilier într-un singur OBJ. Orice diferență se înregistrează aici și se adaugă ca fixture de regresie.

## Poziționare față de PRO100

PRO100 poate deja randa și oferi panorame 3D pe telefon. Demo-ul pune în față camera reală scanată, lumina după oră/anotimp și orientarea ferestrei, culori și finisaje modificabile, avertismente de încadrare și un fișier interactiv autonom. `docs/DEMO.md` va prezenta această comparație fără a promite o calitate de randare superioară.

## Later

După M-DEMO, `apps/site` va fi site-ul de prezentare cu portofoliu 3D, construit pe `packages/viewer`; tot după M-DEMO se construiește pagina client găzduită pentru domeniul firmei, folosind același `packages/viewer`. Spike-ul de la pasul 0 poate folosi o pagină statică minimă pentru test, fără a construi `apps/site` sau pagina finală. Restul lucrărilor ulterioare: backend de producție, conturi, colaborare, plăți, randare AI, reconstrucție AI a camerei, fotogrammetrie sau Gaussian splatting, aplicații iOS/Android, editare liberă a geometriei și devize. În faza 2, o aplicație iOS poate salva cadre foto împreună cu poziția și parametrii camerei în timpul scanării RoomPlan; imaginile se pot proiecta pe pereții reconstruiți pentru culoare/tapet, iar un model vizual poate doar eticheta prize, întrerupătoare, calorifere, țevi, AC, pervazuri, șine, mobilier existent și finisaje. Pozițiile vin din scanare și poziția camerei, nu din model; fiecare etichetă se confirmă înainte de folosire.

## Ordinea implementării

Estimările sunt zile de lucru pentru un dezvoltator, incluzând implementarea și verificarea de bază; se revizuiesc după primirea scanării și a unui OBJ real. Marcajul **M-DEMO** arată strict ce trebuie să funcționeze la prima demonstrație.

| Pas | Livrabil / poartă | Efort estimat | M-DEMO |
| --- | --- | ---: | :---: |
| **0** | Spike minim: pagină statică cu o scenă three.js și HTML autonom echivalent. Se verifică deschiderea **paginii găzduite din previzualizarea linkului** în Telegram, Viber și WhatsApp pe iOS și Android, apoi fișierul HTML ca rezervă. În `docs/DELIVERY.md` se notează, pentru fiecare aplicație și sistem, linkul/fișierul, deschiderea, interactivitatea, pașii suplimentari și versiunea testată. Livrarea principală țintă este linkul static pe domeniul firmei; rezultatul testului se închide **înainte de `export/`**. | 1–2 zile + acces la domeniu, dispozitive și conturi | Da |
| **M-DEMO / 1** | `RoomModel`, import scanare cu AC1 și erori AC2; editor manual doar dreptunghi; scenă cu mostrele mobilierului. | 3–5 zile | Da |
| **M-DEMO / 2** | Import OBJ+MTL, materiale și mapări. Intră în M-DEMO **numai dacă există un export PRO100 real în `reference/`**; fără el, M-DEMO folosește mostre parametrice, iar importerul cu fixture sintetic trece la etapa 5. | 2–3 zile | Condiționat de OBJ real |
| **M-DEMO / 3** | Verificarea 770/792 și rezerva lângă ușă (AC5); lumină după oră/anotimp și umbre (AC6); comenzi vizuale esențiale. | 2–3 zile | Da |
| **M-DEMO / 4** | Export client conform deciziei de la pasul 0, deschidere pe telefon (AC7), ≤5 MB și măsurare AC8 pe profil mobil cu CPU 4×. | 2–4 zile | Da |
| **5** | Completați fluxul modulelor 1–7: import OBJ+MTL pe fixture sintetic dacă lipsește exportul real, finisaje și podele complete, aranjare și verificări extinse, editor L, GLB, înlocuirea camerei cu ancore absolute și raportul scanare–ruletă. Închideți AC3, AC4, AC8b și verificările rămase. | 4–7 zile, plus 2–3 dacă OBJ a fost amânat | Nu |
| **6** | Numai după trecerea modulelor 1–7: import din schiță, revizuire, cache, proxy, evaluare și AC9–AC13. | 5–8 zile | Nu |
| **7** | QA final în `docs/QA.md`, corectarea problemelor reale, revizia critică față de SPEC și `docs/DEMO.md`. | 1–2 zile | Nu |

M-DEMO este complet când AC1, AC5, AC6 și AC7 au dovezi, camera dreptunghiulară poate fi introdusă manual, mostrele parametrice pot fi afișate (și un OBJ real numai dacă există în `reference/`) și livrarea din `docs/DELIVERY.md` este susținută de probe pe ambele platforme. Testul AC1 rămâne doar regresie geometrică, fără afirmație despre acuratețea scanării față de realitate.

**Poarta ARCHITECT:** această specificație trebuie arătată înainte de a începe codul, conform cerinței de lucru în etape.
