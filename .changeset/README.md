# Changesets

Tilføj en ny changeset med `npm run changeset`. Vælg pakker, bump-type (major/minor/patch) og skriv en kort beskrivelse. Filen committes til git.

Ved push til `main` kører `publish.yml` der konsumerer changesets, bumpr versioner og publisher til npm.
