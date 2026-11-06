# KV Studio — Kanneworff & Viuff

Et dansk, responsivt projektværksted med fem interaktive 3D-værktøjer. Selvstændig konceptapplikation med fiktive demodata; ikke et officielt projektsystem eller et projekteringsværktøj.

**Website:** https://hallojoe.github.io/kanneworff-viuff/

## Værktøjer

| Side | Funktioner |
| --- | --- |
| `#/projekt` | Parametrisk bygning, facadevalg, før/forslag, areal, volumen, pris- og CO₂-scenarier |
| `#/byggefaser` | Fem redigerbare sekventielle faser, tidslinje, afspilning og 4D-model |
| `#/byggeplads` | Kranradius, kran- og oplagsplacering, indkørsel og geometriske konflikttjek |
| `#/jord-kloak` | Grøftesnit, rørdiameter, fald, jordmængder og transportoverslag |
| `#/aflevering` | Mangler med placering, prioritet, ansvar, noter, status, 3D-markører og CSV-eksport |

Fælles projektnavn og bygningsmål deles mellem siderne. Lys/mørk visning følger systemet ved første besøg og husker derefter brugerens valg. 3D understøtter orbit, zoom, faste kameravinkler, skjult tag, PNG og fuldskærm. Formularer og resultater fungerer også uden WebGL.

## Teknologi og lokal udvikling

React 19, TypeScript, Three.js, Vite, Vitest og Testing Library. Ingen backend. Skrifttyper distribueres lokalt med applikationen.

Kræver **Node.js 22.12+**; workflowet bruger Node.js 24.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Vite anvender base `/kanneworff-viuff/`. Udviklingsserveren åbnes derfor på `http://localhost:5173/kanneworff-viuff/`. Hashbaserede adresser fungerer ved direkte navigation og genindlæsning på GitHub Pages uden serverrewrites.

## Publicering med GitHub Actions

`.github/workflows/pages.yml` kører ved push til `main`, pull requests mod `main` og manuelt via Actions → **Test, build and deploy to GitHub Pages** → Run workflow.

1. `npm ci` installerer låste afhængigheder.
2. Vitest kontrollerer beregninger, validering og centrale brugerhandlinger.
3. TypeScript kontrollerer typer, og Vite producerer `dist/`.
4. Ved `main` uploades Pages-artifactet, og et separat job publicerer det.

Pull requests tester og bygger, men publicerer ikke. Repositoryets **Settings → Pages → Source** skal være **GitHub Actions**. Deployment-jobbet har kun `pages: write` og `id-token: write`; build har `contents: read`. Der kræves ingen egne secrets. Ved et nyt repository kan Pages skulle aktiveres efter første commit. Se Actions-loggen, hvis Configure Pages fejler med 404.

## Projektdata og backup

Projekt og tema gemmes i `localStorage` på den aktuelle browser/origin. Projektet valideres ved indlæsning. **Eksportér projekt** laver en JSON-kopi, der kan importeres i en anden browser. Import validerer version, intervaller, typer, faser og mangelplaceringer, før den erstatter projektet efter bekræftelse. Mangler kan også eksporteres som semikolonsepareret UTF-8 CSV med beskyttelse mod formelindsprøjtning. PNG-knappen eksporterer selve 3D-modellen.

Der er ingen cloud-synkronisering, brugerkonti, BIM/IFC-import eller Dalux-integration. Del ikke fortrolige data via et offentligt repository; appens eksportfiler skal håndteres separat. Browserdata kan forsvinde ved sletning af browserhistorik eller skift af browser. Tag JSON-backup.

## Beregningsgrundlag og begrænsninger

Alle standardpriser og CO₂-faktorer er **illustrative, redigerbare scenarieantagelser**. Ingen af dem er hentet fra virksomhedens priser eller verificerede EPD'er. Materialescenariet er en forenklet helbygningsantagelse, ikke en isoleret facadeberegning. Skift af materiale indlæser scenariets standardfaktorer; brugeren kan derefter ændre dem.

- Etageareal = længde × bredde × etager. Volumen = etageareal × etagehøjde.
- Anlægsoverslag = etageareal × kr./m², ekskl. moms. Grund, rådgivning, finansiering og reserve er ikke medregnet.
- CO₂-scenarie = etageareal × kg CO₂e/m² ÷ 1.000. Dette er **ikke** en bygnings-LCA eller dokumentation af myndighedskrav.
- Faser er sekventielle og viser skematiske hovedtrin. Råhuset bygges etagevis. Tidsprocent er ikke fysisk færdiggørelsesgrad.
- Kran: afstand til fjerneste hjørne i vandret plan. Løftekurve, last, højde, vind, naboforhold og kransikkerhed vurderes ikke.
- Overlap: kran/bygning, oplag/bygning og oplag/adgang. Ingen komplet kollisions- eller sikkerhedsanalyse; skurby, hegn og øvrige konflikter kontrolleres ikke.
- Grøft: konstant bredde, lodrette sider og lineært fald. Fald = længde × promille ÷ 1.000. Fast jordvolumen = længde × bredde × gennemsnitsdybde. Løst volumen bruger det indtastede løsningstillæg. Antal læs rundes op.
- Dybde er til grøftebund, med rørets underside på bunden. Udjævningslag, afstivning, skråningsanlæg, grundvand, hydraulik og jordklassificering er ikke medregnet.
- Mangelmarkører tilhører fem skematiske zoner; de er ikke opmålt på en BIM-model.

## Struktur

- `src/lib/project.ts`: data, validering, beregninger og eksport.
- `src/lib/scene.ts`: parametriske Three.js-modeller og oprydning af GPU-ressourcer.
- `src/components/Viewport.tsx`: kamera, interaktion og WebGL-livscyklus.
- `src/pages/Tools.tsx`: de fem værktøjssider.
- `src/App.tsx`: navigation, delt projekt og tema.
- `src/**/*.test.*`: beregnings-, import- og UI-tests.

Værktøjerne er inspireret af virksomhedens offentligt beskrevne arbejde med hoved- og totalentreprise, tidlig projektinddragelse, jord/beton/kloak og aflevering: https://kanneworffviuff.dk/.
