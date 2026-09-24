{
  description = "How lit-html renders: an explainer video";

  inputs = {
    # Same nixpkgs as the fleet, so torch & friends come straight from the store.
    nixpkgs.url = "github:NixOS/nixpkgs/624af665418d3c65d544145b4d34ad696439570e";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };

      # Word alignment of the narration (pipeline/align.py).
      python = pkgs.python3.withPackages (ps: with ps; [
        numpy
        soundfile
        torch
        torchaudio
      ]);

      # Google Fonts used by the video, at the google/fonts commit nixpkgs'
      # google-fonts package pins. Each lands in $out as <Name>.ttf.
      googleFonts = "https://raw.githubusercontent.com/google/fonts/5174b3333331c966c38f4355d50b03ca1c1df2f9";
      fontFiles = {
        Inter = { path = "ofl/inter/Inter%5Bopsz,wght%5D.ttf"; sha256 = "0cchapf21n0kp3l9qcja91xb5ymi11z284bpr6rcmpa9zy00l5i9"; };
        InterItalic = { path = "ofl/inter/Inter-Italic%5Bopsz,wght%5D.ttf"; sha256 = "1rkcyrmhszg3z7i4jamlw87jmvpcw1sq9c87iw2v50apg5j8xndc"; };
        JetBrainsMono = { path = "ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf"; sha256 = "1npy7wcl5ag12gjdaj1flncj40kx2hg8k4i6y3lj2b14xi15lwa8"; };
        JetBrainsMonoItalic = { path = "ofl/jetbrainsmono/JetBrainsMono-Italic%5Bwght%5D.ttf"; sha256 = "0n75gzfj1a4hs2jd92lfps7kv3n5489qa6n2w4fayszmsdf2mbl5"; };
      };
      fonts = pkgs.linkFarm "lit-explainer-fonts" (pkgs.lib.mapAttrsToList (name: f: {
        name = "${name}.ttf";
        path = pkgs.fetchurl { name = "${name}.ttf"; url = "${googleFonts}/${f.path}"; inherit (f) sha256; };
      }) fontFiles);

      # The real lit-html, from npm: the video's data about the example
      # template (strings, markers, parts, DOM) is captured from it.
      litHtml = pkgs.runCommand "lit-html-3.3.3" {
        src = pkgs.fetchurl {
          url = "https://registry.npmjs.org/lit-html/-/lit-html-3.3.3.tgz";
          sha256 = "1sx08z26lpirawl80k01ldn9lqg9iqmdnj4fxqpkcz1jlqw4205f";
        };
      } ''
        mkdir -p $out
        tar -xzf $src -C $out --strip-components=1
      '';
    in
    {
      packages.${system} = { inherit fonts litHtml; };

      devShells.${system}.default = pkgs.mkShell {
        packages = [ python pkgs.ffmpeg pkgs.nodejs pkgs.chromium pkgs.jq ];
        LIT_FONTS = "${fonts}";
        LIT_HTML = "${litHtml}";
      };
    };
}
