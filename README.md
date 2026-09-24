# How lit-html renders — an explainer video

A narrated, animated explainer that follows one lit-html template through
`render()`: the tagged template literal, the **prepare** phase (markers, the
`<template>` element, template parts, the template cache), the **create** phase
(cloning and parts), and the **update** phase (dirty-checked commits), then
nesting, lists, and the layers of caching that make re-renders cheap.

It's based on lit's design doc,
[Life of a lit-html render](https://github.com/lit/lit/blob/main/dev-docs/design/how-lit-html-works.md),
and on the source, [`lit-html.ts`](https://github.com/lit/lit/blob/main/packages/lit-html/src/lit-html.ts).

Everything is built from this repo with Nix: `nix develop` for the tools.
