# Mariano Trevisan · portfolio

Sitio personal estático: HTML, CSS y JavaScript sin dependencias ni paso de build.
Se publica con GitHub Pages en https://mariano92004.github.io

## Qué tiene

- **Inicio**: un campo de píxeles animado (ruido de valor + tramado Bayer) que se mueve lento y reacciona al cursor. Respeta `prefers-reduced-motion` y se pausa cuando no está en pantalla.
- **Capturas tramadas**: cada captura se dibuja en un `<canvas>` con una trama de cuatro azules. Al pasar el cursor se ve el color original y al hacer clic se abre ampliada.
- **Sensor de nivel**: una ilustración interactiva del tanque, controlada con un `<input type="range">`.
- **Español e inglés**: el español está en el HTML; el inglés en `js/i18n.js`. El idioma inicial sale del navegador y la elección se guarda en `localStorage`.

## Estructura

```
index.html
css/style.css
js/i18n.js        textos en inglés
js/main.js        campo de píxeles, tramado, visor, tanque e idioma
assets/img/       capturas en WebP
assets/favicon.svg
.nojekyll         evita que GitHub Pages procese el sitio con Jekyll
```
