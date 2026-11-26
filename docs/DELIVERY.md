# Pasul 0 — livrare pe telefon

## Artefacte pregătite

- Pagina statică de test: https://igortacu.github.io/roomsheet-delivery-spike-2026/
- HTML autonom de rezervă: [`spikes/delivery/dist/roomsheet-delivery-spike.html`](../spikes/delivery/dist/roomsheet-delivery-spike.html), generat cu `npm run spike:build`.
- Sursa paginii: `spikes/delivery/`; pagina găzduită și fișierul de rezervă provin din același HTML, cu three.js și scena incluse inline. Nu folosesc CDN, cont, cameră, date reale despre cameră sau API de proiect.
- Repozitoriul public de test conține numai HTML-ul sintetic: https://github.com/igortacu/roomsheet-delivery-spike-2026

Ținta de livrare pentru produs este **link static pe domeniul firmei**. Pentru spike folosim subdomeniul gratuit GitHub Pages. Trecerea la domeniul firmei nu cere schimbări de cod; va cere DNS și asocierea domeniului/certificatului TLS la serviciul de găzduire. HTML-ul autonom rămâne rezervă. Acest spike nu publică date ale clienților.

## Verificări automate și locale

| Verificare | Rezultat | Dovadă |
| --- | --- | --- |
| `npm install` | Reușit | Dependențe actualizate și audit npm cu 0 vulnerabilități raportate. |
| `npm run spike:build` | Reușit | Două fișiere HTML echivalente, 472286 octeți fiecare. |
| Sintaxa JS inline | Reușit | `new Function` pe scriptul extras din HTML. |
| Browser local, scenă WebGL | Reușit | Pagina afișează scena și mesajul „Scena 3D funcționează”. |
| Browser local, rotire prin tragere | Reușit | Indicatorul a trecut de la −20° la 104°. |
| Pagina publică, versiunea curentă | Reușit în browser desktop | GitHub Pages a raportat `built`; URL-ul a răspuns HTTP 200 cu 472286 octeți. Scena WebGL și tragerea au fost verificate în browser; recompilarea ulterioară a schimbat numai dependența de build. |
| Pagina publică la 390×844 | Reușit în emulare de viewport | Scena și mesajul de stare au rămas vizibile fără derulare orizontală. Nu reprezintă un test iOS sau Android real. |
| Auditul static pregătit pentru fișierul client | Reușit pe HTML-ul sintetic | `npm run client:audit -- spikes/delivery/dist/roomsheet-delivery-spike.html`: 472286 octeți, cod inline și fără resurse separate sau marcaje de localizare cunoscute. AC7/AC8 rămân de verificat pe exportul final. |

Verificarea browserului local este pe desktop. Ea nu substituie testele din aplicațiile de mesagerie sau pe iPhone/Android.
Deschiderea directă `file://` nu a putut fi testată în browserul automatizat: politica browserului permite aici numai `http:` și `https:`. Fișierul a fost verificat prin construirea inline și sintaxa JavaScript; comportamentul ca atașament rămâne de verificat pe telefon.

## Instrucțiuni pentru testul pe telefon

1. Pe iPhone, trimite linkul paginii de test către un chat propriu/de test în Telegram, Viber și WhatsApp. Deschide-l atingând **previzualizarea linkului**, apoi, dacă este necesar, folosește „Deschide în browser”. Repetă pentru fișierul HTML ca atașament.
2. Pentru fiecare deschidere, notează dacă pagina apare direct în aplicație, din previzualizare sau numai în browser extern; dacă vezi dulapul 3D și mesajul „Scena 3D funcționează”; dacă rotirea cu degetul schimbă unghiul; orice pas suplimentar sau eroare.
3. Notează versiunea iOS, versiunea aplicației și data testului. Repetă aceiași pași pe Android când telefonul împrumutat este disponibil. **Android rămâne „netestat” până atunci.**
4. Nu folosi o captură statică drept dovadă WebGL: indicatorul unghiului trebuie să se schimbe după tragere.

## Matricea de rezultate reale

Completează `direct / previzualizare / browser`, `WebGL`, `rotire`, `pași/eroare` și versiunile pentru fiecare rând. „Netestat” nu înseamnă reușit.

| Sistem | Aplicație | Canal | Deschidere | WebGL | Rotire | Pași suplimentari / eroare | Versiuni OS + app / dată |
| --- | --- | --- | --- | --- | --- | --- | --- |
| iOS | Telegram | Link | Netestat | Netestat | Netestat | — | — |
| iOS | Viber | Link | Netestat | Netestat | Netestat | — | — |
| iOS | WhatsApp | Link | Netestat | Netestat | Netestat | — | — |
| iOS | Telegram | HTML atașat | Netestat | Netestat | Netestat | — | — |
| iOS | Viber | HTML atașat | Netestat | Netestat | Netestat | — | — |
| iOS | WhatsApp | HTML atașat | Netestat | Netestat | Netestat | — | — |
| Android | Telegram | Link | Netestat | Netestat | Netestat | — | — |
| Android | Viber | Link | Netestat | Netestat | Netestat | — | — |
| Android | WhatsApp | Link | Netestat | Netestat | Netestat | — | — |
| Android | Telegram | HTML atașat | Netestat | Netestat | Netestat | — | — |
| Android | Viber | HTML atașat | Netestat | Netestat | Netestat | — | — |
| Android | WhatsApp | HTML atașat | Netestat | Netestat | Netestat | — | — |

## Decizie

La 23 noiembrie 2026, utilizatorul a cerut explicit continuarea fără testele iOS pentru prezentarea din 24 noiembrie. Decizia de implementare pentru demo este **link static principal + HTML autonom de rezervă**. Pagina client filtrată, fără scanarea brută sau metadata GPS, este publicată la https://igortacu.github.io/roomsheet-preview-019c3bbad77eecba/ . Fișierul local echivalent actualizat la 26 noiembrie este `dist/demo-client/roomsheet-demo.html` (496645 octeți). Repozitoriul GitHub Pages este public; URL-ul aleatoriu reduce descoperirea accidentală, dar nu oferă autentificare.

Această decizie permite exportul pentru demo; **nu validează deschiderea în Telegram, Viber sau WhatsApp**. Toate rândurile din matricea de mai sus rămân „Netestat” până la probe pe telefoane reale. La prezentare, păstrează pagina deschisă pe laptop și HTML-ul local ca rezervă dacă linkul nu se deschide în aplicația de mesagerie. Trecerea la domeniul firmei cere DNS și asocierea domeniului/TLS la gazda statică.
