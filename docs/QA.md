# QA — stare curentă

Acesta este registrul criteriilor de acceptare. „Parțial” nu înseamnă trecut; verificarea finală se face după implementarea modulelor respective. Golden file-ul RoomPlan verifică regresia rezultatului, nu precizia scanării în camera reală.

| Criteriu | Test sau verificare | Stare |
| --- | --- | --- |
| AC1 | `apps/studio/src/roomplan/index.test.ts`: fixture complet, snapshot, dimensiuni ±10 mm, un singur gol de arcadă. Import în browser: eticheta „Scanare RoomPlan”, avertismentul de 22 mm și zero erori în consola capturată. | Trecut pentru fixture-ul primit; Playwright repetă fluxul la poarta QA finală. |
| AC2 | Același test: fixture-ul real cu doi pereți este respins. În browser apare „are doar 2 pereți; lipsesc pereți, ușa și fereastra sau conturul închis”; zero erori în consola capturată. | Trecut pentru fixture-ul primit. |
| AC3 | Vitest: OBJ în mm și m → același bounding box. | Planificat în etapa 5; nu există OBJ real. |
| AC4 | Vitest și UI: materiale necunoscute, mapare, reimport automat. | Planificat în etapa 5. |
| AC5 | Vitest: 770 mm pe segmentul 792 mm → 22 mm; dulap 1700 mm lângă ușa de la 1934 mm → 234 mm. Verificare în UI pentru mostre. Teste separate pentru culoarele laterale de 477/517 mm, suprapuneri, depășirea camerei și arcul de deschidere estimat al ușii. Poziția și rotația pieselor sunt editabile în Studio. | Trecut pentru configurația mostrelor și mutarea verificată în browser. |
| AC6 | Vitest pentru altitudinea solară la ore/anotimp și rotirea direcției după orientarea ferestrei. Verificare vizuală în browser: vară 12:00 cu umbre de la goluri, iarnă 20:00 cu soarele sub orizont; lustra stinsă/aprinsă și LED-urile oglinzii schimbă scena. Cinci vederi, rotirea prin tragere și schimbarea culorii pereților au fost verificate în browser; captura este în `docs/demo-step3.jpg`; consola capturată: zero erori. | Trecut pentru simularea demonstrativă; regresia vizuală automată și gestul cu două degete pe telefon rămân la QA finală. |
| AC7 | `npm run client:verify -- dist/demo-client/roomsheet-demo.html`: Chrome deschide HTML-ul prin `file://` cu rețeaua oprită la 390×844; canvas și comenzile pentru dulap, pat, lumină și culori funcționează; zero cereri externe și zero erori de consolă. `client:audit` nu găsește resurse separate sau marcaje de localizare cunoscute. | Trecut local pe exportul demo; deschiderea din mesagerie pe iOS/Android rămâne netestată. |
| AC8 | Același script folosește CPU throttling 4×. Pe Apple M1 Pro, macOS Darwin 27.0.0 și Chrome 157.0.8103.51: FCP 2404 ms, 1892 ms, apoi 1636 ms pe versiunea finală; fișierul are 492729 octeți, sub 5 MB. | Trecut în mediul de test raportat; performanța telefoanelor reale rămâne netestată. |
| AC8b | Vitest: editorul dreptunghiular cu cotele scanării dă avertismentul 22 mm; eticheta „Dimensiuni estimate” apare în Studio și export. Teste pentru ancora absolută în mm și avertismentul la înlocuirea camerei; în browser, masa păstrează 2440 mm de la colț după micșorarea camerei și primește „nu mai încape”. | Trecut pentru camera dreptunghiulară și ancorele disponibile. |
| AC9 | Fără cheie, importul live din schiță este dezactivat cu explicație. | După M-DEMO. |
| AC10 | Fixture-urile schiței dulapului versus `expected-furniture.json`. | După M-DEMO; imaginile lipsesc. |
| AC11 | Vitest: schemă invalidă și inconsistențe nu creează piesă fără confirmare. | După M-DEMO. |
| AC12 | Căutare a cheii de test în bundle, IndexedDB și HTML client. | După M-DEMO. |
| AC13 | Playwright offline în mod cache: schiță → revizuire → confirmare. | După M-DEMO; imaginile lipsesc. |

La 23 noiembrie 2026, `npm run build` și `npm test` au trecut (20 teste Vitest în 7 fișiere). Browserul a confirmat importul și refuzul scanărilor, salvarea proiectului, avertismentele AC5, lumina AC6, ușile glisante deschise pe fiecare parte, somiera ridicată, mutarea mobilierului, raportul ruletă–model și ancora absolută după micșorarea camerei; consola capturată nu conține erori. Pagina client găzduită răspunde HTTP 200 și afișează dulapul deschis. Auditul npm a raportat 0 vulnerabilități. Testele în aplicațiile de mesagerie pe telefoane reale sunt neefectuate și apar ca atare în `docs/DELIVERY.md`.
