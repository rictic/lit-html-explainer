{
  description = "How lit-html renders: an explainer video";

  inputs = {
    # Same nixpkgs as the fleet, so torch & friends come straight from the store.
    nixpkgs.url = "github:NixOS/nixpkgs/624af665418d3c65d544145b4d34ad696439570e";
    # The mixed soundtrack (narration + music, `python pipeline/mix.py`), and
    # the poster frame (the title card). Generated once; pinned here.
    soundtrack = {
      url = "https://code.rictic.com/api/packages/agent-1/generic/lit-html-explainer/94b925e76c39821e70b52142cd0a43e1/soundtrack.flac";
      flake = false;
    };
    poster = {
      url = "https://code.rictic.com/api/packages/agent-1/generic/lit-html-explainer/f785f5347917619410dee933436422fe/poster.jpg";
      flake = false;
    };
    # The rendered video (`nix run .#render -- video --fps 60`).
    video = {
      url = "https://code.rictic.com/api/packages/agent-1/generic/lit-html-explainer/a2f4aacb74f02ff594fee0bf2a714f12/lit-html-renders.mp4";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, soundtrack, poster, video }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };

      # Word alignment of the narration (pipeline/align.py) and the mix.
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

      # A small AAC copy of the soundtrack for the live page.
      soundtrackM4a = pkgs.runCommand "soundtrack.m4a" { nativeBuildInputs = [ pkgs.ffmpeg ]; } ''
        ffmpeg -v error -i ${soundtrack} -c:a aac -b:a 128k -movflags +faststart -f mp4 $out
      '';

      # The demo: the rendered video with captions, chapters and transcript,
      # and under live/ the renderer itself, drawing in your browser in sync
      # with the soundtrack (the same code the video was rendered with).
      site = pkgs.runCommand "lit-html-explainer-site" { } ''
        mkdir -p $out/live/video $out/live/timing $out/live/truth $out/live/fonts
        cp ${./site/index.html} $out/index.html
        cp ${./timing/captions.vtt} $out/captions.vtt
        cp ${./timing/timeline.json} $out/timeline.json
        cp ${poster} $out/poster.jpg
        cp ${video} $out/lit-html-renders.mp4
        cp ${./video/index.html} $out/live/index.html
        cp -r ${./video/src} $out/live/video/src
        cp ${./timing/timeline.json} $out/live/timing/timeline.json
        cp ${./truth/truth.json} $out/live/truth/truth.json
        cp -L ${fonts}/*.ttf $out/live/fonts/
        cp ${soundtrackM4a} $out/live/soundtrack.m4a
      '';

      # `nix run .#render -- video` / `-- still 212.5` / `-- sheet --scene markers`
      # (run from a checkout: it renders the working tree's video/ against the
      # pinned soundtrack)
      render = pkgs.writeShellApplication {
        name = "lit-explainer-render";
        runtimeInputs = [ pkgs.nodejs pkgs.chromium pkgs.ffmpeg ];
        runtimeEnv = { LIT_FONTS = "${fonts}"; LIT_AUDIO = "${soundtrack}"; };
        text = ''exec node "''${LIT_REPO:-$PWD}/tools/render.mjs" "$@"'';
      };
    in
    {
      packages.${system} = { inherit fonts litHtml site render soundtrackM4a; default = site; };
      apps.${system}.render = { type = "app"; program = "${render}/bin/lit-explainer-render"; };

      devShells.${system}.default = pkgs.mkShell {
        packages = [ python pkgs.ffmpeg pkgs.nodejs pkgs.chromium pkgs.jq ];
        LIT_FONTS = "${fonts}";
        LIT_HTML = "${litHtml}";
      };
    };
}
