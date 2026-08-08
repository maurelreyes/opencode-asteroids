'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Paleta & tipografía compartida con el gabinete ────────────────────────
const HUD_FG = '#7AF2C1';
const HUD_HL = '#FFB347';
const HUD_TX = '#E6F2EC';
const HUD_MU = 'rgba(150,180,200,0.45)';

const HUDF = {
  s:   '700 15px "JetBrains Mono", ui-monospace, monospace',
  t:   '400 11px "JetBrains Mono", ui-monospace, monospace',
  big: '700 46px "Michroma", "JetBrains Mono", monospace',
  med: '400 18px "JetBrains Mono", ui-monospace, monospace',
};

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Backspace','Enter'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = HUD_TX;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = HUD_TX;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── ShootingStar ──────────────────────────────────────────────────────────────
class ShootingStar {
  constructor() {
    this.radius = 8;
    this.speed  = rand(350, 480);
    this.ttl    = rand(4, 6);
    this.life   = this.ttl;
    this.dead   = false;

    const side = randInt(0, 3);
    switch (side) {
      case 0: this.x = rand(0, W);    this.y = 0;           break; // arriba
      case 1: this.x = rand(0, W);    this.y = H;           break; // abajo
      case 2: this.x = 0;             this.y = rand(0, H);  break; // izquierda
      case 3: this.x = W;             this.y = rand(0, H);  break; // derecha
    }

    const towardCenter = Math.atan2(H / 2 - this.y, W / 2 - this.x);
    const angle = towardCenter + rand(-0.8, 0.8);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const lifeRatio = this.ttl / this.life;
    const alpha = Math.max(0, lifeRatio);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Estela
    const trailLen = this.speed * 0.04;
    const trailX = this.x - (this.vx / this.speed) * trailLen;
    const trailY = this.y - (this.vy / this.speed) * trailLen;
    ctx.strokeStyle = `rgba(255,220,80,${alpha.toFixed(2)})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(255,200,40,0.9)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(trailX, trailY);
    ctx.stroke();

    // Núcleo
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const ROT   = 3.5;
    const THRUST = speedBoost > 0 ? 520 : 260;
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (tripleShot <= 0) return [new Bullet(ox, oy, this.angle)];
    const px = -Math.sin(this.angle) * TRIPLE_SPREAD;
    const py =  Math.cos(this.angle) * TRIPLE_SPREAD;
    return [
      new Bullet(ox - px, oy - py, this.angle),
      new Bullet(ox,      oy,      this.angle),
      new Bullet(ox + px, oy + py, this.angle),
    ];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (speedBoost > 0) {
      const pulse = 14 + Math.sin(performance.now() / 80) * 3;
      ctx.strokeStyle = 'rgba(0,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (shieldActive) {
      const pulse = SHIELD_RADIUS + Math.sin(performance.now() / 70) * 3;
      ctx.strokeStyle = 'rgba(80,180,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (tripleShot > 0) {
      const pulse = 18 + Math.sin(performance.now() / 90) * 3;
      ctx.strokeStyle = 'rgba(255,0,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = SKINS[currentSkin].color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = SKINS[currentSkin].flame;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(230,242,236,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Escudo ─────────────────────────────────────────────────────────────────────
const SHIELD_MAX      = 100;
const SHIELD_DRAIN    = 35;
const SHIELD_REGEN    = 18;
const SHIELD_COST_HIT = 10;
const SHIELD_MIN_ACT  = 15;
const SHIELD_RADIUS   = 26;
let shieldEnergy = SHIELD_MAX;
let shieldActive = false;

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, shootingStars;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer, starSpawnTimer;
let speedBoost;
let tripleShot;
let asteroidKills;
let scoreThreshold;
const SPEED_BOOST_DURATION  = 5;
const TRIPLE_SHOT_DURATION  = 5;
const BOOST_CHANCE          = 0.35;
const TRIPLE_SPREAD         = 7;

const SKINS = [
  { name: 'Clásico',   color: '#fff',    flame: 'rgba(255,130,0,0.85)'   },
  { name: 'Neón',      color: '#0ff',    flame: 'rgba(120,255,220,0.85)' },
  { name: 'Fuego',     color: '#ff6a2a', flame: 'rgba(255,70,0,0.9)'     },
  { name: 'Esmeralda', color: '#4ade80', flame: 'rgba(120,255,160,0.85)' },
];

function loadSkin() {
  const stored = localStorage.getItem('asteroids-skin');
  if (stored == null) return 0;
  const idx = Number(stored);
  return (Number.isFinite(idx) && idx >= 0 && idx < SKINS.length) ? idx : 0;
}

function setSkin(i) {
  if (i >= 0 && i < SKINS.length) {
    currentSkin = i;
    localStorage.setItem('asteroids-skin', String(i));
  }
}

let currentSkin = loadSkin();
let skinsCursor;
let skinsReturn;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets       = [];
  asteroids     = [];
  particles     = [];
  shootingStars = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  speedBoost     = 0;
  shieldEnergy   = SHIELD_MAX;
  tripleShot     = 0;
  asteroidKills  = 0;
  scoreThreshold = 1000;
  starSpawnTimer = rand(4, 8);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets       = [];
  particles     = [];
  shootingStars = [];
  ship.reset();
  starSpawnTimer = rand(4, 8);
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function maybeGrantBoost() {
  if (Math.random() < BOOST_CHANCE) {
    if (Math.random() < 0.5) speedBoost  = SPEED_BOOST_DURATION;
    else                      tripleShot = TRIPLE_SHOT_DURATION;
  }
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    if (pressed('KeyS')) { state = 'skins'; skinsReturn = 'gameover'; skinsCursor = currentSkin; return; }
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'skins') {
    if (pressed('ArrowLeft'))  skinsCursor = (skinsCursor - 1 + SKINS.length) % SKINS.length;
    if (pressed('ArrowRight')) skinsCursor = (skinsCursor + 1) % SKINS.length;
    if (pressed('Enter') || pressed('Space')) { setSkin(skinsCursor); state = skinsReturn; }
    if (pressed('Escape') || pressed('Backspace')) { state = skinsReturn; }
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'paused') {
    if (pressed('Enter')) { state = 'playing'; return; }
    if (pressed('KeyS')) { state = 'skins'; skinsReturn = 'paused'; skinsCursor = currentSkin; return; }
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    shootingStars.forEach(s => s.update(dt));
    shootingStars = shootingStars.filter(s => !s.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Pausar
  if (pressed('Enter')) { state = 'paused'; return; }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  if (speedBoost  > 0) speedBoost  -= dt;
  if (tripleShot  > 0) tripleShot  -= dt;

  const shiftHeld = keys['ShiftLeft'] || keys['ShiftRight'];
  if (shiftHeld && shieldEnergy >= SHIELD_MIN_ACT) {
    shieldActive = true;
    shieldEnergy = Math.max(0, shieldEnergy - SHIELD_DRAIN * dt);
    if (shieldEnergy <= 0) shieldActive = false;
  } else {
    shieldActive = false;
    if (!shiftHeld) shieldEnergy = Math.min(SHIELD_MAX, shieldEnergy + SHIELD_REGEN * dt);
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  shootingStars.forEach(s => s.update(dt));
  particles.forEach(p => p.update(dt));

  bullets       = bullets.filter(b => !b.dead);
  particles     = particles.filter(p => !p.dead);
  shootingStars = shootingStars.filter(s => !s.dead);

  // Spawn estrella fugaz
  starSpawnTimer -= dt;
  if (starSpawnTimer <= 0) {
    shootingStars.push(new ShootingStar());
    starSpawnTimer = rand(4, 8);
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        asteroidKills++;
        if (asteroidKills >= 10) { asteroidKills = 0; maybeGrantBoost(); }
        if (score >= scoreThreshold) { scoreThreshold += 1000; maybeGrantBoost(); }
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz
  for (const b of bullets) {
    for (const s of shootingStars) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        score += 200;
        explode(s.x, s.y, 12);
      }
    }
  }
  bullets       = bullets.filter(b => !b.dead);
  shootingStars = shootingStars.filter(s => !s.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      const contactDist = ship.radius + a.radius * 0.82;
      if (shieldActive && dist(ship, a) < SHIELD_RADIUS + a.radius * 0.82) {
        a.dead = true;
        shieldEnergy = Math.max(0, shieldEnergy - SHIELD_COST_HIT);
        if (shieldEnergy <= 0) shieldActive = false;
        explode(a.x, a.y, a.size * 5);
        asteroids.push(...a.split());
      } else if (!shieldActive && dist(ship, a) < contactDist) {
        killShip();
        break;
      }
    }
  }

  // Nave vs estrella fugaz
  if (ship.invincible <= 0) {
    for (const s of shootingStars) {
      const contactDist = ship.radius + s.radius;
      if (shieldActive && dist(ship, s) < SHIELD_RADIUS + s.radius) {
        s.dead = true;
        shieldEnergy = Math.max(0, shieldEnergy - SHIELD_COST_HIT);
        if (shieldEnergy <= 0) shieldActive = false;
        explode(s.x, s.y, 12);
      } else if (!shieldActive && dist(ship, s) < contactDist) {
        killShip();
        break;
      }
    }
  }

  asteroids = asteroids.filter(a => !a.dead);

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = SKINS[currentSkin].color;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.textAlign = 'left';

  ctx.font = HUDF.t;
  ctx.fillStyle = HUD_MU;
  ctx.fillText('SCORE', 14, 20);
  ctx.font = HUDF.s;
  ctx.fillStyle = HUD_TX;
  ctx.fillText(String(score), 14, 38);

  ctx.textAlign = 'center';
  ctx.font = HUDF.t;
  ctx.fillStyle = HUD_MU;
  ctx.fillText('NIVEL', W / 2, 20);
  ctx.font = HUDF.s;
  ctx.fillStyle = HUD_TX;
  ctx.fillText(String(level), W / 2, 38);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (speedBoost > 0 || tripleShot > 0) {
    ctx.textAlign = 'center';
    let y = H - 16;
    if (speedBoost > 0) {
      ctx.font = HUDF.s;
      ctx.fillStyle = HUD_FG;
      ctx.fillText(`VELOCIDAD ${speedBoost.toFixed(1)}s`, W / 2, y);
      y -= 22;
    }
    if (tripleShot > 0) {
      ctx.font = HUDF.s;
      ctx.fillStyle = HUD_HL;
      ctx.fillText(`TRIPLE ${tripleShot.toFixed(1)}s`, W / 2, y);
    }
  }

  const barW = 140, barH = 8, bx = 14, by = H - 24;
  ctx.textAlign = 'left';
  ctx.font = HUDF.t;
  ctx.fillStyle = HUD_MU;
  ctx.fillText('ESCUDO', bx, by - 4);
  ctx.strokeStyle = HUD_MU;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, barW, barH);
  const fillW = barW * (shieldEnergy / SHIELD_MAX);
  ctx.fillStyle = shieldActive ? 'rgba(255,179,71,0.80)' : 'rgba(122,242,193,0.40)';
  ctx.fillRect(bx, by, fillW, barH);
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = HUD_FG;
  ctx.font        = HUDF.big;
  ctx.fillText(title, W / 2, H / 2 - 24);
  ctx.font        = HUDF.med;
  ctx.fillStyle   = HUD_MU;
  ctx.fillText(sub, W / 2, H / 2 + 18);
}

function drawSkinsMenu() {
  ctx.fillStyle = 'rgba(5,7,10,0.88)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = HUD_FG;
  ctx.font = HUDF.big;
  ctx.fillText('SKINS', W / 2, 80);

  const spacing = 160;
  const startX  = W / 2 - (SKINS.length - 1) * spacing / 2;
  const previewY = H / 2 - 10;
  const SHIP_SCALE = 1.8;

  for (let i = 0; i < SKINS.length; i++) {
    const x = startX + i * spacing;
    const y = previewY;
    const sel = i === skinsCursor;

    if (sel) {
      ctx.strokeStyle = 'rgba(122,242,193,0.45)';
      ctx.lineWidth = 2;
      const bx = x - 44;
      const by = y - 48;
      const bw = 88;
      const bh  = 100;
      ctx.beginPath();
      ctx.moveTo(bx + 8, by);
      ctx.lineTo(bx + bw - 8, by);
      ctx.arcTo(bx + bw, by, bx + bw, by + 8, 8);
      ctx.lineTo(bx + bw, by + bh - 8);
      ctx.arcTo(bx + bw, by + bh, bx + bw - 8, by + bh, 8);
      ctx.lineTo(bx + 8, by + bh);
      ctx.arcTo(bx, by + bh, bx, by + bh - 8, 8);
      ctx.lineTo(bx, by + 8);
      ctx.arcTo(bx, by, bx + 8, by, 8);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = SKINS[i].color;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo( 9 * SHIP_SCALE,  0);
    ctx.lineTo(-6 * SHIP_SCALE, -5 * SHIP_SCALE);
    ctx.lineTo(-3 * SHIP_SCALE,  0);
    ctx.lineTo(-6 * SHIP_SCALE,  5 * SHIP_SCALE);
    ctx.closePath();
    ctx.stroke();

    if (sel) {
      ctx.strokeStyle = SKINS[i].flame;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-4, -2.2);
      ctx.lineTo(-15, 0);
      ctx.lineTo(-4, 2.2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = sel ? HUD_TX : 'rgba(230,242,236,0.25)';
    ctx.font = sel ? HUDF.s : '400 14px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(SKINS[i].name, x, previewY + 62);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = HUD_MU;
  ctx.font = '400 13px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillText('← → SELECCIONAR    ENTER CONFIRMAR    ESC CANCELAR', W / 2, H - 38);
}

function draw() {
  ctx.fillStyle = '#05070A';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  shootingStars.forEach(s => s.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score} · ESPACIO REINICIAR · S SKINS`);

  if (state === 'paused') {
    ctx.fillStyle = 'rgba(5,7,10,0.55)';
    ctx.fillRect(0, 0, W, H);
    drawOverlay('PAUSA', 'ENTER REANUDAR · S SKINS');
  }

  if (state === 'skins')
    drawSkinsMenu();
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
