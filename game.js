'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
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
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

// Power-up de velocidad
const POWERUP_TTL = 10;   // segundos visible en pantalla
const BOOST_TIME  = 5;    // duración del efecto al recogerlo
const BOOST_MULT  = 2;    // multiplicador de empuje
const TRIPLE_TIME = 5;    // duración del triple disparo

// Escudo
const SHIELD_MAX      = 100;  // energía máxima
const SHIELD_DRAIN    = 25;   // energía consumida por segundo activo
const SHIELD_HIT_COST = 20;   // energía que cuesta bloquear un impacto
const SHIELD_RECHARGE = 3;    // energía recargada por segundo estando inactivo

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
    ctx.strokeStyle = '#fff';
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

// ── Estrella Fugaz ───────────────────────────────────────────────────────────
class ShootingStar extends Asteroid {
  constructor(x, y, vx, vy) {
    const size = randInt(1, 2);
    super(x, y, size);
    this.vx = vx;
    this.vy = vy;
    this.radius = RADII[size];
    this.ttl = rand(4, 7);
    this.trail = [];
    this.dead = false;
    this.points = 500;
  }

  split() { return []; }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) { this.dead = true; return; }
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 14) this.trail.pop();
  }

  draw() {
    // Cola brillante
    for (let i = 0; i < this.trail.length; i++) {
      const alpha = (1 - i / this.trail.length) * 0.55;
      const t = this.trail[i];
      const r  = this.radius * (1 - i / this.trail.length) * 0.4;
      ctx.fillStyle = `rgba(255, 255, 150, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cuerpo dorado
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#ffd740';
    ctx.shadowColor = '#ffd740';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ── Skins de la nave ──────────────────────────────────────────────────────────
// Cada skin define cómo se dibuja el cuerpo y la llama del propulsor.
// Reciben el contexto con translate/rotate ya aplicados en la posición de la nave.
const SKINS = [
  {
    name: 'Clásico',
    drawBody(ctx) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.5;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo( 20,  0);
      ctx.lineTo(-12, -9);
      ctx.lineTo( -7,  0);
      ctx.lineTo(-12,  9);
      ctx.closePath();
      ctx.stroke();
    },
    drawFlame(ctx, ship) {
      const boosted = ship.speedBoost > 0;
      if (Math.random() > (boosted ? 0.15 : 0.35)) {
        ctx.beginPath();
        ctx.moveTo(-8, -4);
        ctx.lineTo(-8 - rand(6, boosted ? 26 : 14), 0);
        ctx.lineTo(-8,  4);
        ctx.strokeStyle = boosted ? 'rgba(80, 220, 255, 0.9)' : 'rgba(255, 130, 0, 0.85)';
        ctx.stroke();
      }
    },
  },
  {
    name: 'Delta',
    drawBody(ctx) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.5;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo( 24,  0);
      ctx.lineTo(-14, -8);
      ctx.lineTo( -5, -2);
      ctx.lineTo( -5,  2);
      ctx.lineTo(-14,  8);
      ctx.closePath();
      ctx.stroke();
      // Línea de estela central
      ctx.beginPath();
      ctx.moveTo( 14, 0);
      ctx.lineTo(-5,  0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth   = 1;
      ctx.stroke();
    },
    drawFlame(ctx, ship) {
      const boosted = ship.speedBoost > 0;
      if (Math.random() > (boosted ? 0.15 : 0.35)) {
        ctx.beginPath();
        ctx.moveTo(-7, -3);
        ctx.lineTo(-7 - rand(6, boosted ? 28 : 16), 0);
        ctx.lineTo(-7,  3);
        ctx.strokeStyle = boosted ? 'rgba(220, 80, 255, 0.9)' : 'rgba(80, 220, 255, 0.9)';
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }
    },
  },
  {
    name: 'Fantasmal',
    drawBody(ctx) {
      ctx.save();
      ctx.shadowColor = '#7df';
      ctx.shadowBlur  = 12;
      ctx.fillStyle   = 'rgba(120, 220, 255, 0.18)';
      ctx.strokeStyle = 'rgba(180, 240, 255, 0.95)';
      ctx.lineWidth   = 1.5;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo( 20,  0);
      ctx.lineTo(-12, -9);
      ctx.lineTo( -7,  0);
      ctx.lineTo(-12,  9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
    drawFlame(ctx, ship) {
      const boosted = ship.speedBoost > 0;
      if (Math.random() > (boosted ? 0.15 : 0.35)) {
        ctx.beginPath();
        ctx.moveTo(-8, -3);
        ctx.lineTo(-8 - rand(6, boosted ? 24 : 13), 0);
        ctx.lineTo(-8,  3);
        ctx.strokeStyle = boosted ? 'rgba(255, 255, 255, 0.95)' : 'rgba(140, 230, 255, 0.8)';
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }
    },
  },
  {
    name: 'Guerrero',
    drawBody(ctx) {
      ctx.save();
      ctx.fillStyle   = '#1a202a';
      ctx.strokeStyle = '#ff5a3c';
      ctx.lineWidth   = 1.5;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo( 16,  0);
      ctx.lineTo( 10, -7);
      ctx.lineTo(-16, -11);
      ctx.lineTo( -8,  0);
      ctx.lineTo(-16,  11);
      ctx.lineTo( 10,  7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Filo central
      ctx.beginPath();
      ctx.moveTo( 16, 0);
      ctx.lineTo( -8, 0);
      ctx.strokeStyle = 'rgba(255, 180, 120, 0.5)';
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.restore();
    },
    drawFlame(ctx, ship) {
      const boosted = ship.speedBoost > 0;
      if (Math.random() > (boosted ? 0.15 : 0.35)) {
        ctx.beginPath();
        ctx.moveTo(-10, -5);
        ctx.lineTo(-10 - rand(6, boosted ? 24 : 13), 0);
        ctx.lineTo(-10,  5);
        ctx.strokeStyle = boosted ? 'rgba(255, 140, 80, 0.95)' : 'rgba(255, 90, 40, 0.9)';
        ctx.lineWidth   = 2;
        ctx.stroke();
      }
    },
  },
];

function loadSkinIndex() {
  try {
    const n = parseInt(localStorage.getItem('asteroids-skin'), 10);
    return n >= 0 && n < SKINS.length ? n : 0;
  } catch { return 0; }
}

let currentSkinIndex = loadSkinIndex();
let menuOpen = false;

function selectSkin(i) {
  currentSkinIndex = ((i % SKINS.length) + SKINS.length) % SKINS.length;
  try { localStorage.setItem('asteroids-skin', String(currentSkinIndex)); } catch {}
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
    this.speedBoost    = 0;
    this.tripleShot    = 0;
    this.shieldEnergy  = 0;
    this.shieldActive  = false;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;

    // Escudo: drena mientras activo; se apaga al agotarse y se recarga despacio
    if (this.shieldActive) {
      this.shieldEnergy -= SHIELD_DRAIN * dt;
      if (this.shieldEnergy <= 0) {
        this.shieldEnergy = 0;
        this.shieldActive = false;
      }
    } else if (this.shieldEnergy < SHIELD_MAX) {
      this.shieldEnergy = Math.min(this.shieldEnergy + SHIELD_RECHARGE * dt, SHIELD_MAX);
      if (this.shieldEnergy >= SHIELD_MAX) this.shieldActive = true;
    }

    const ROT   = 3.5;   // rad/s
    const DRAG   = 0.987;
    // Con el power-up de velocidad activo, el empuje se duplica
    const THRUST = 260 * (this.speedBoost > 0 ? BOOST_MULT : 1);  // px/s²

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
    if (this.tripleShot > 0) {
      const SPREAD = 0.1;
      return [
        new Bullet(ox, oy, this.angle - SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    // Burbuja del escudo activo
    if (this.shieldActive) {
      const pulse = 1 + Math.sin(performance.now() / 250) * 0.04;
      const R = 24 * pulse;
      const grad = ctx.createRadialGradient(this.x, this.y, R * 0.4, this.x, this.y, R);
      grad.addColorStop(0, 'rgba(80, 220, 255, 0.15)');
      grad.addColorStop(1, 'rgba(80, 220, 255, 0.03)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, R, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(80, 220, 255, 0.8)';
      ctx.lineWidth   = 1.6;
      ctx.shadowColor = '#4df';
      ctx.shadowBlur  = 12;
      ctx.beginPath();
      ctx.arc(this.x, this.y, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const skin = SKINS[currentSkinIndex];
    skin.drawBody(ctx);
    if (this.thrusting) skin.drawFlame(ctx, this);

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
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-ups ─────────────────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y, type) {
    this.x      = x;
    this.y      = y;
    this.type   = type;  // 'velocidad' | 'triple' | 'escudo'
    this.radius = 12;
    this.ttl    = POWERUP_TTL;
    this.rot    = 0;
    this.dead   = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
    this.rot += dt * 1.5;
  }

  draw() {
    // Parpadea cuando está por desaparecer
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    if (this.type === 'triple') {
      ctx.strokeStyle = '#f90';
      // Tres líneas en abanico
      const SPREAD = 0.35;
      for (let i = -1; i <= 1; i++) {
        const a = i * SPREAD;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
        ctx.stroke();
      }
    } else if (this.type === 'velocidad') {
      ctx.strokeStyle = '#4df';
      // Doble chevron
      ctx.beginPath();
      ctx.moveTo(-7, -6);
      ctx.lineTo(-1, 0);
      ctx.lineTo(-7, 6);
      ctx.moveTo(1, -6);
      ctx.lineTo(7, 0);
      ctx.lineTo(1, 6);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#4f9';
      // Escudo: hexágono con arco interior
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const px = Math.cos(a) * 8;
        const py = Math.sin(a) * 8;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 1.5, 3.5, Math.PI, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps, shootingStars;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let powerUpTimer;
let shootingStarTimer;

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

function spawnPowerUp() {
  const SAFE_DIST = 120;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  const r = Math.random();
  const type = r < 0.33 ? 'velocidad' : r < 0.66 ? 'triple' : 'escudo';
  powerUps.push(new PowerUp(x, y, type));
}

function spawnShootingStar() {
  if (shootingStars.length >= 2) return;
  // Elegir un borde aleatorio para entrar desde fuera de pantalla
  const side = randInt(0, 3);
  let x, y, vx, vy;
  const speed = rand(180, 240);
  const angle = rand(-0.5, 0.5);
  if (side === 0) { x = -20; y = rand(0, H); vx = Math.cos(angle) * speed; vy = Math.sin(angle) * speed; }
  else if (side === 1) { x = W + 20; y = rand(0, H); vx = -Math.cos(angle) * speed; vy = Math.sin(angle) * speed; }
  else if (side === 2) { x = rand(0, W); y = -20; vx = Math.sin(angle) * speed; vy = Math.cos(angle) * speed; }
  else { x = rand(0, W); y = H + 20; vx = Math.sin(angle) * speed; vy = -Math.cos(angle) * speed; }
  shootingStars.push(new ShootingStar(x, y, vx, vy));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  shootingStars = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  powerUpTimer = rand(8, 12);
  shootingStarTimer = rand(8, 15);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  shootingStars = [];
  shootingStarTimer = rand(8, 15);
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
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
function handleMenuKeys() {
  if (pressed('ArrowLeft'))  selectSkin(currentSkinIndex - 1);
  if (pressed('ArrowRight')) selectSkin(currentSkinIndex + 1);
  if (pressed('Enter') || pressed('Space') || pressed('Escape'))
    menuOpen = false;
}

function update(dt) {
  if (pressed('KeyM')) menuOpen = !menuOpen;
  if (menuOpen) { handleMenuKeys(); return; }

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    shootingStars.forEach(s => s.update(dt));
    shootingStars = shootingStars.filter(s => !s.dead);
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

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));
  shootingStars.forEach(s => s.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shieldActive) {
          // Rebote: invertir dirección y separar el asteroide de la nave
          a.vx = -a.vx + rand(-30, 30);
          a.vy = -a.vy + rand(-30, 30);
          const minDist = ship.radius + a.radius * 0.82 + 6;
          const d = dist(ship, a);
          if (d > 0) {
            a.x = ship.x + (a.x - ship.x) / d * minDist;
            a.y = ship.y + (a.y - ship.y) / d * minDist;
          }
          ship.shieldEnergy -= SHIELD_HIT_COST;
          if (ship.shieldEnergy <= 0) {
            ship.shieldEnergy = 0;
            ship.shieldActive = false;
          }
          explode(a.x, a.y, 4);
        } else {
          killShip();
          break;
        }
      }
    }
  }

  // Bala vs estrella fugaz
  for (const b of bullets) {
    for (const s of shootingStars) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        score += s.points;
        explode(s.x, s.y, 12);
      }
    }
  }
  shootingStars = shootingStars.filter(s => !s.dead);

  // Nave vs estrella fugaz
  if (ship.invincible <= 0) {
    for (const s of shootingStars) {
      if (!s.dead && dist(ship, s) < ship.radius + s.radius * 0.82) {
        if (ship.shieldActive) {
          s.vx = -s.vx + rand(-20, 20);
          s.vy = -s.vy + rand(-20, 20);
          ship.shieldEnergy -= SHIELD_HIT_COST;
          if (ship.shieldEnergy <= 0) {
            ship.shieldEnergy = 0;
            ship.shieldActive = false;
          }
          explode(s.x, s.y, 5);
        } else {
          killShip();
          s.dead = true;
          explode(s.x, s.y, 10);
          break;
        }
      }
    }
  }

  // Nave vs power-up
  for (const pu of powerUps) {
    if (!pu.dead && dist(ship, pu) < ship.radius + pu.radius) {
      pu.dead = true;
      if (pu.type === 'velocidad') {
        ship.speedBoost = BOOST_TIME;   // si ya había boost, se refresca
      } else if (pu.type === 'triple') {
        ship.tripleShot = TRIPLE_TIME;   // si ya había poder, se refresca
      } else {
        ship.shieldEnergy = SHIELD_MAX;
        ship.shieldActive = true;
      }
      explode(pu.x, pu.y, 10);
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Spawn periódico de power-ups (máximo uno en pantalla)
  if (powerUps.length === 0) {
    powerUpTimer -= dt;
    if (powerUpTimer <= 0) {
      spawnPowerUp();
      powerUpTimer = rand(12, 20);
    }
  }

  // Spawn periódico de estrellas fugaces (máximo dos en pantalla)
  shootingStarTimer -= dt;
  if (shootingStarTimer <= 0) {
    spawnShootingStar();
    shootingStarTimer = rand(8, 15);
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
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
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Indicadores de power-ups activos
  let hudY = 46;
  if (ship.speedBoost > 0) {
    ctx.fillStyle = '#4df';
    ctx.textAlign = 'left';
    ctx.fillText(`VELOCIDAD ${ship.speedBoost.toFixed(1)}s`, 14, hudY);
    hudY += 18;
  }
  if (ship.tripleShot > 0) {
    ctx.fillStyle = '#f90';
    ctx.textAlign = 'left';
    ctx.fillText(`TRIPLE ${ship.tripleShot.toFixed(1)}s`, 14, hudY);
    hudY += 18;
  }
  if (ship.shieldEnergy > 0) {
    ctx.fillStyle = ship.shieldActive ? '#4f9' : 'rgba(79, 255, 153, 0.6)';
    ctx.textAlign = 'left';
    ctx.fillText(`ESCUDO ${Math.ceil(ship.shieldEnergy)}%`, 14, hudY);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function drawMenu() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 34px monospace';
  ctx.fillText('SELECCIONA SKIN', W / 2, 84);

  const BOX = 150;
  const GAP = 26;
  const total = SKINS.length * BOX + (SKINS.length - 1) * GAP;
  let x = (W - total) / 2 + BOX / 2;
  const y = 258;

  for (let i = 0; i < SKINS.length; i++) {
    const selected = i === currentSkinIndex;

    ctx.save();
    // Marco
    ctx.strokeStyle = selected ? '#fff' : '#4d4d4d';
    ctx.lineWidth   = selected ? 2.5 : 1.5;
    if (selected) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 14; }
    ctx.strokeRect(x - BOX / 2, y - BOX / 2, BOX, BOX);
    if (selected) ctx.shadowBlur = 0;

    // Preview de la nave
    ctx.globalAlpha = selected ? 1 : 0.5;
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.scale(2.2, 2.2);
    SKINS[i].drawBody(ctx);
    ctx.restore();

    // Nombre
    ctx.globalAlpha = selected ? 1 : 0.55;
    ctx.fillStyle   = selected ? '#fff' : '#9a9a9a';
    ctx.font        = '14px monospace';
    ctx.fillText(SKINS[i].name, x, y + BOX / 2 + 27);

    x += BOX + GAP;
  }

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font      = '13px monospace';
  ctx.fillText('← →  ELEGIR SKIN     ENTER / ESC / M  CERRAR', W / 2, H - 46);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  powerUps.forEach(p => p.draw());
  shootingStars.forEach(s => s.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);

  if (menuOpen) drawMenu();
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
