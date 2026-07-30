# AGENTS.md

Juego Asteroids de un solo archivo en HTML5 Canvas. Sin build, sin bundler, sin dependencias, sin tests, sin `package.json`. Strings de UI en español.

## Cómo ejecutar / verificar

Abre `index.html` en el navegador, o `npx serve .` y luego `http://localhost:3000`. No hay nada que typecheck, lint o testear — solo verificación visual.

## Arquitectura

- `game.js` es todo el juego (`<script>` en `index.html`). Sin módulos.
- `index.html` hardcodea el canvas `width=800 height=600`; `game.js` vuelve a declarar `W=800`, `H=600`. Cambiar ambos juntos — no se derivan uno del otro.
- El mundo es toroidal: la pantalla envuelve vía `wrap(v, max)`; las coordenadas de entidades usan `[0, W|H)`.
- El estado del juego vive en variables a nivel de módulo: `ship, bullets, asteroids, particles, score, lives, level, state, deadTimer`. `initGame()` es el único punto de entrada (también usado para reiniciar).
- Máquina de estados `state`: `'playing' | 'dead' | 'gameover'`. `'dead'` es la breve pausa de reaparición; `'gameover'` espera Space para llamar `initGame()`.
- Clases de entidad: `Ship`, `Bullet`, `Asteroid`, `Particle`. `size` del asteroide ∈ {1,2,3}; las tablas `RADII`, `SPEEDS`, `POINTS` se indexan por size.
- Bucle principal: `requestAnimationFrame` → `loop(ts)` → `update(dt)` + `draw()`. `dt` se limita a 0.05s máximo.

## Convenciones de input

- El mapa `keys` guarda el estado mantenido; `justPressed` registra los borde (edges).
- `pressed(code)` consume un borde one-shot — llamar una vez por frame por tecla. Usarlo para input mantenido es incorrecto; usar `keys[code]` para acciones continuas (rotar, propulsar).
- `keydown` llama `e.preventDefault()` en flechas + Space para evitar scroll de página.

## Descuido entre doc y código

`README.md` anuncia power-ups y un tipo de asteroide "estrella fugaz". Ninguno existe en `game.js` — el README es aspiracional/desactualizado. No asumir esos sistemas al editar; confiar en el código.