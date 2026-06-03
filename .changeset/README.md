# Changesets

Add en ny changeset med `npm run changeset`. Vaelg pakker, bump-type (major/minor/patch) og skriv en kort beskrivelse. Filen committes til git.

Ved push til `main` runer `publish.yml` der konsumerer changesets, bumpr versioner og publisher til npm.
