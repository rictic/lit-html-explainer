// Font families (Google Fonts, fetched by the flake; variable weights).

export const FONT = {
  sans: "Inter",
  mono: "JetBrains Mono",
};

const FACES = [
  ["Inter", "Inter.ttf", "normal"],
  ["Inter", "InterItalic.ttf", "italic"],
  ["JetBrains Mono", "JetBrainsMono.ttf", "normal"],
  ["JetBrains Mono", "JetBrainsMonoItalic.ttf", "italic"],
];

export async function loadFonts() {
  await Promise.all(FACES.map(async ([family, file, style]) => {
    const face = new FontFace(family, `url(fonts/${file})`, { weight: "100 900", style });
    await face.load();
    document.fonts.add(face);
  }));
}

// A canvas font string: font(FONT.mono, 28, 500), font(FONT.sans, 40, 700, "italic").
export const font = (family, size, weight = 400, style = "normal") =>
  `${style === "italic" ? "italic " : ""}${weight} ${size}px "${family}"`;
