# RoomSheet Studio

MVP local pentru previzualizarea unei camere scanate cu RoomPlan și a mobilierului la comandă. Interfața este în română.

## Pornire

```bash
npm install
npm run dev
```

Deschide adresa afișată de Vite. Încarcă `reference/captured-room.json` din secțiunea **Camera**, apoi apasă **Încarcă mostrele comenzii**. Scanarea incompletă din `reference/fixtures/captured-room-partial.json` este un exemplu de fișier refuzat. Proiectele se pot salva local în browser.

```bash
npm run build
npm test
```

Pagina pentru prezentare și pașii rapizi sunt în [docs/PRESENTATION.md](docs/PRESENTATION.md). Specificația este în [docs/SPEC.md](docs/SPEC.md), parcursul demonstrației în [docs/DEMO.md](docs/DEMO.md), rezultatele verificărilor în [docs/QA.md](docs/QA.md), iar testul de livrare pe telefon în [docs/DELIVERY.md](docs/DELIVERY.md). Exportul autonom funcționează local; deschiderea în aplicațiile de mesagerie pe iOS și Android rămâne netestată. M-DEMO folosește mostre parametrice până la primirea unui OBJ+MTL real din PRO100.
