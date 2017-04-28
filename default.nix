with import <nixpkgs> {};
stdenv.mkDerivation rec {
  name = "env";
  env = buildEnv {
    name = name;
    paths = buildInputs;
  };
  buildInputs = [
    nodejs-7_x
    git
    python
    pkgconfig
    gnumake
    icu
    libjpeg
    libwebp
    cairo
    pango
    mapnik
    pixman
  ];
  LANG="C.utf8";
}
