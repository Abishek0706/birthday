const BIRTHDAY_NAME = 'DHARU MA';
const opening = document.querySelector('#opening');
const experience = document.querySelector('#experience');
const openButton = document.querySelector('#open-surprise');
const secretButton = document.querySelector('#secret-button');
const finale = document.querySelector('#finale');
const ending = document.querySelector('#ending');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const particleCanvas = document.querySelector('#particle-canvas');
const particleContext = particleCanvas?.getContext('2d');
const particles = [];
let canvasWidth = 0;
let canvasHeight = 0;
let particleFrame = 0;
let lastTrailAt = 0;
let previousParticleTime = 0;
let lastOcclusionUpdate = 0;
let occlusionAreas = [];
let pointerDepthX = 0;
let pointerDepthY = 0;
let easedDepthX = 0;
let easedDepthY = 0;
const particleColors = ['#dca4d0', '#ed9eaf', '#f2bdc1', '#f1d2cb', '#e5b5e4'];
const occlusionSelectors = '.hero-copy, .photo-frame, .hero-bottom, .section-heading, .letter-card, .reason-card, .timeline-item, .keepsake-copy, .secret-section > *, .ending-copy, .ending-footer';

function resizeParticleCanvas() {
  if (!particleCanvas || !particleContext) return;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
  const previousWidth = canvasWidth;
  const previousHeight = canvasHeight;
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  if (previousWidth && previousHeight) {
    particles.forEach((particle) => {
      particle.x = particle.x / previousWidth * canvasWidth;
      particle.baseX = particle.baseX / previousWidth * canvasWidth;
      particle.y = particle.y / previousHeight * canvasHeight;
    });
  }
  particleCanvas.width = Math.round(canvasWidth * pixelRatio);
  particleCanvas.height = Math.round(canvasHeight * pixelRatio);
  particleContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function addParticle(x, y, burst = false, heart = true) {
  const layer = burst ? 1 : Math.random();
  const depth = layer < 0.36 ? 0.25 : layer < 0.78 ? 0.58 : 1;
  const size = depth < 0.4 ? 2.1 + Math.random() * 1.1 : depth < 0.8 ? 3.1 + Math.random() * 1.8 : 4 + Math.random() * 2.4;
  const direction = Math.random() * Math.PI * 2;
  const particle = {
    x,
    y,
    baseX: x,
    vx: burst ? Math.cos(direction) * (35 + Math.random() * 145) : 0,
    vy: burst ? Math.sin(direction) * (35 + Math.random() * 145) : -(7 + Math.random() * 19) * (0.5 + depth * 0.5),
    size: burst ? 2 + Math.random() * 3.5 : size,
    alpha: burst ? 0.65 + Math.random() * 0.3 : 0.12 + depth * 0.42,
    phase: Math.random() * Math.PI * 2,
    drift: (5 + Math.random() * 21) * (0.45 + depth * 0.65),
    driftSpeed: 0.35 + Math.random() * 0.9,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.55,
    pulse: Math.random() < 0.4 ? 0.08 + Math.random() * 0.16 : 0,
    depth,
    color: particleColors[Math.floor(Math.random() * particleColors.length)],
    heart,
    burst,
    age: 0,
    life: burst ? 1.05 + Math.random() * 0.85 : Infinity,
  };
  particles.push(particle);
  if (particles.length > 180) {
    const oldestBurst = particles.findIndex((particle) => particle.burst);
    particles.splice(oldestBurst >= 0 ? oldestBurst : 0, 1);
  }
  return particle;
}

function burstParticles(x, y, count = 18) {
  if (reduceMotion || !particleContext) return;
  for (let index = 0; index < count; index += 1) {
    addParticle(x, y, true, index % 4 !== 3);
  }
}

function pointIsCovered(x, y) {
  return occlusionAreas.some((area) => x >= area.left && x <= area.right && y >= area.top && y <= area.bottom);
}

function drawHeart(particle, time, x, y) {
  const pulse = 1 + Math.sin(time * 0.001 + particle.phase) * particle.pulse;
  const shimmer = 0.03 + (Math.sin(particle.age * 0.38 + particle.phase) + 1) * 0.485;
  const edgeFade = Math.min(1, Math.max(0, (canvasHeight - particle.y) / 48), Math.max(0, (particle.y + 12) / 48));
  particleContext.save();
  particleContext.globalAlpha = particle.alpha * shimmer * edgeFade;
  particleContext.translate(x, y);
  particleContext.rotate(particle.rotation);
  particleContext.scale(particle.size * pulse, particle.size * pulse);
  particleContext.fillStyle = particle.color;
  if (particle.depth < 0.36 && 'filter' in particleContext) particleContext.filter = 'blur(0.35px)';
  if (particle.depth > 0.8 || particle.burst) {
    particleContext.shadowColor = particle.color;
    particleContext.shadowBlur = particle.depth > 0.8 ? 5 : 3;
  }
  particleContext.beginPath();
  particleContext.moveTo(0, 0.38);
  particleContext.bezierCurveTo(-0.82, -0.12, -0.58, -0.77, 0, -0.3);
  particleContext.bezierCurveTo(0.58, -0.77, 0.82, -0.12, 0, 0.38);
  particleContext.fill();
  particleContext.restore();
}

function drawSparkle(particle, time, x, y) {
  particleContext.save();
  particleContext.globalAlpha = particle.alpha * Math.min(1, particle.life / 0.25);
  particleContext.translate(x, y);
  particleContext.rotate(particle.rotation + time * 0.0005);
  particleContext.fillStyle = '#fff0e8';
  particleContext.shadowColor = '#f6bfd0';
  particleContext.shadowBlur = 5;
  particleContext.fillRect(-0.7, -0.7, 1.4, 1.4);
  particleContext.restore();
}

function animateParticles(time) {
  if (!particleContext || !particleCanvas) return;
  const delta = previousParticleTime ? Math.min((time - previousParticleTime) / 1000, 0.04) : 0.016;
  previousParticleTime = time;
  easedDepthX += (pointerDepthX - easedDepthX) * 0.035;
  easedDepthY += (pointerDepthY - easedDepthY) * 0.035;
  if (time - lastOcclusionUpdate > 250) {
    occlusionAreas = [...document.querySelectorAll(occlusionSelectors)]
      .filter((element) => {
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.05;
      })
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return { left: bounds.left - 5, right: bounds.right + 5, top: bounds.top - 4, bottom: bounds.bottom + 4 };
      });
    lastOcclusionUpdate = time;
  }
  particleContext.clearRect(0, 0, canvasWidth, canvasHeight);
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.age += delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.rotation += particle.rotationSpeed * delta;
    if (!particle.burst) {
      particle.x = particle.baseX + Math.sin(particle.age * particle.driftSpeed + particle.phase) * particle.drift;
      if (particle.y < -12) {
        particle.y = canvasHeight + 12 + Math.random() * 48;
        particle.baseX = Math.random() * canvasWidth;
        particle.age = 0;
      }
    }
    if (particle.burst) particle.life -= delta;
    if (particle.burst && particle.life <= 0) {
      particles.splice(index, 1);
      continue;
    }
    const drawX = particle.x + easedDepthX * particle.depth * 18;
    const drawY = particle.y + easedDepthY * particle.depth * 8;
    if (particle.burst || !pointIsCovered(drawX, drawY)) {
      if (particle.heart) drawHeart(particle, time, drawX, drawY);
      else drawSparkle(particle, time, drawX, drawY);
    }
  }
  particleFrame = window.requestAnimationFrame(animateParticles);
}

function startParticleAnimation() {
  if (!particleContext || reduceMotion || particleFrame) return;
  resizeParticleCanvas();
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const count = mobile ? (cores <= 4 ? 30 : 42) : (cores <= 4 ? 96 : 132);
  let existing = particles.filter((particle) => !particle.burst).length;
  while (existing < count) {
    const particle = addParticle(Math.random() * canvasWidth, Math.random() * canvasHeight);
    particle.age = Math.random() * 20;
    existing += 1;
  }
  while (existing > count) {
    const index = particles.findIndex((particle) => !particle.burst);
    if (index < 0) break;
    particles.splice(index, 1);
    existing -= 1;
  }
  previousParticleTime = 0;
  particleFrame = window.requestAnimationFrame(animateParticles);
}

function stopParticleAnimation() {
  if (particleFrame) window.cancelAnimationFrame(particleFrame);
  particleFrame = 0;
}

function vibrateBriefly() {
  if ('vibrate' in navigator) navigator.vibrate(12);
}

if (particleCanvas && particleContext && !reduceMotion) {
  startParticleAnimation();
  window.addEventListener('resize', resizeParticleCanvas, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopParticleAnimation();
    else startParticleAnimation();
  });
  document.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' && !window.matchMedia('(pointer: fine)').matches) return;
    pointerDepthX = (event.clientX / window.innerWidth - 0.5) * 2;
    pointerDepthY = (event.clientY / window.innerHeight - 0.5) * 2;
    const now = performance.now();
    if (now - lastTrailAt < 65) return;
    lastTrailAt = now;
    addParticle(event.clientX, event.clientY, true, true);
  }, { passive: true });
  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.button')) return;
    burstParticles(event.clientX, event.clientY, 7);
  }, { passive: true });
}

document.querySelectorAll('[data-name]').forEach((element) => {
  element.textContent = BIRTHDAY_NAME;
});

document.querySelectorAll('.couple-photo').forEach((photo) => {
  photo.addEventListener('load', () => photo.classList.add('is-loaded'), { once: true });
  photo.addEventListener('error', () => {
    photo.closest('.photo-window')?.classList.add('photo-unavailable');
  }, { once: true });
  if (photo.complete && photo.naturalWidth > 0) photo.classList.add('is-loaded');
});

function revealExperience() {
  if (!opening || !experience || opening.classList.contains('is-gone')) return;
  opening.classList.add('is-gone');
  experience.inert = false;
  document.body.classList.remove('is-opening');
  document.body.classList.add('is-revealed');
  burstParticles(window.innerWidth / 2, window.innerHeight / 2, 24);
  vibrateBriefly();
  window.setTimeout(() => opening.remove(), reduceMotion ? 20 : 1600);
}

document.body.classList.add('is-opening');
openButton?.addEventListener('click', revealExperience);

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    if (entry.target.id === 'letter-copy') {
      entry.target.querySelectorAll('p').forEach((line, index) => {
        window.setTimeout(() => line.classList.add('is-written'), reduceMotion ? 0 : index * 780);
      });
    }
    if (entry.target.id === 'ending') entry.target.classList.add('is-revealed');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.18 });

document.querySelectorAll('.reveal, #letter-copy, #ending').forEach((element) => observer.observe(element));

document.querySelectorAll('.reason-card').forEach((card) => {
  card.addEventListener('click', () => {
    const isExpanded = card.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.reason-card[aria-expanded="true"]').forEach((expanded) => {
      expanded.setAttribute('aria-expanded', 'false');
    });
    card.setAttribute('aria-expanded', String(!isExpanded));
  });
});

function burstHearts(frame, x, y) {
  for (let index = 0; index < 8; index += 1) {
    const heart = document.createElement('span');
    heart.className = 'photo-burst';
    heart.setAttribute('aria-hidden', 'true');
    heart.textContent = index % 3 === 0 ? '♥' : '♡';
    heart.style.left = `${x + (Math.random() - 0.5) * 38}%`;
    heart.style.top = `${y + (Math.random() - 0.5) * 24}%`;
    heart.style.setProperty('--drift', `${(Math.random() - 0.5) * 90}px`);
    heart.style.fontSize = `${10 + Math.random() * 9}px`;
    frame.append(heart);
    window.setTimeout(() => heart.remove(), 1600);
  }
}

document.querySelectorAll('[data-heart-burst]').forEach((frame) => {
  const celebrate = (event) => {
    const bounds = frame.getBoundingClientRect();
    const clientX = event.clientX || bounds.left + bounds.width / 2;
    const clientY = event.clientY || bounds.top + bounds.height / 2;
    const x = (clientX - bounds.left) / bounds.width * 100;
    const y = (clientY - bounds.top) / bounds.height * 100;
    burstHearts(frame, x, y);
    burstParticles(clientX, clientY, 22);
    vibrateBriefly();
  };
  frame.addEventListener('click', celebrate);
  frame.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    burstHearts(frame, 50, 45);
  });
});

if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll('[data-tilt]').forEach((scene) => {
    let frameId = 0;
    scene.addEventListener('pointermove', (event) => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const bounds = scene.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        scene.style.transform = `rotateY(${x * 5}deg) rotateX(${-y * 4}deg)`;
      });
    });
    scene.addEventListener('pointerleave', () => {
      if (frameId) cancelAnimationFrame(frameId);
      scene.style.transform = '';
    });
  });
}

let scrollTicking = false;
window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    const timeline = document.querySelector('.timeline');
    if (timeline) {
      const bounds = timeline.getBoundingClientRect();
      const progress = Math.min(100, Math.max(0, ((window.innerHeight * 0.8 - bounds.top) / (bounds.height + window.innerHeight * 0.4)) * 100));
      timeline.querySelector('.timeline-line span')?.style.setProperty('height', `${progress}%`);
    }
    scrollTicking = false;
  });
}, { passive: true });

const orientationTilt = (event) => {
  if (reduceMotion || window.matchMedia('(pointer: fine)').matches) return;
  const gamma = Math.max(-8, Math.min(8, event.gamma || 0));
  const beta = Math.max(-8, Math.min(8, (event.beta || 0) - 45));
  pointerDepthX = gamma / 8;
  pointerDepthY = beta / 8;
  document.querySelectorAll('[data-tilt]').forEach((scene) => {
    scene.style.transform = `rotateY(${gamma * 0.22}deg) rotateX(${-beta * 0.18}deg)`;
  });
};
if ('DeviceOrientationEvent' in window) {
  window.addEventListener('deviceorientation', orientationTilt, { passive: true });
}

function playHeartbeat() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const startAt = context.currentTime + 0.05;
  [0, 0.24].forEach((offset, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(index === 0 ? 76 : 63, startAt + offset);
    gain.gain.setValueAtTime(0.0001, startAt + offset);
    gain.gain.exponentialRampToValueAtTime(0.12, startAt + offset + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt + offset);
    oscillator.stop(startAt + offset + 0.18);
  });
  window.setTimeout(() => context.close(), 1000);
}

secretButton?.addEventListener('click', () => {
  if (!finale || !ending) return;
  burstParticles(window.innerWidth / 2, window.innerHeight / 2, 25);
  finale.classList.add('is-active');
  finale.setAttribute('aria-hidden', 'false');
  playHeartbeat();
  window.setTimeout(() => {
    finale.classList.remove('is-active');
    finale.setAttribute('aria-hidden', 'true');
    ending.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, reduceMotion ? 100 : 5400);
});
