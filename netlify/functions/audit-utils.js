'use strict';

const TRACKS = [
  'Content Creation',
  'Coaching / Consulting',
  'E-commerce / Digital Products',
  'Service Business',
  'Investment / Passive Income'
];

const COPY = {
  en: {
    dimensions: ['On-Camera Presence', 'Teaching / Coaching', 'Available Time', 'Money & Investing', 'Network / Audience'],
    income: { none: 'no income yet', scholarship: 'scholarship only', 'nil-small': 'some NIL under $5k/yr', 'nil-active': 'active NIL ($5k-$50k/yr)', pro: 'a pro contract or salary', post: 'post-sport, rebuilding income' },
    tracks: {
      'Content Creation': 'Content Creation',
      'Coaching / Consulting': 'Coaching / Consulting',
      'E-commerce / Digital Products': 'E-commerce / Digital Products',
      'Service Business': 'Service Business',
      'Investment / Passive Income': 'Investment / Passive Income'
    },
    readiness: ['Starting Strong', 'Building Momentum', 'Strong Foundation', 'High Readiness', 'Elite Readiness']
  },
  es: {
    dimensions: ['Presencia frente a cámara', 'Enseñanza / Coaching', 'Tiempo disponible', 'Dinero e inversiones', 'Red de contactos / Audiencia'],
    income: { none: 'sin ingresos todavía', scholarship: 'solo beca deportiva', 'nil-small': 'algo de NIL, menos de $5 mil al año', 'nil-active': 'NIL activo, entre $5 mil y $50 mil al año', pro: 'contrato o salario profesional', post: 'después del deporte, reconstruyendo ingresos' },
    tracks: {
      'Content Creation': 'Creación de contenido',
      'Coaching / Consulting': 'Coaching / Consultoría',
      'E-commerce / Digital Products': 'Comercio electrónico / Productos digitales',
      'Service Business': 'Negocio de servicios',
      'Investment / Passive Income': 'Inversión / Ingresos pasivos'
    },
    readiness: ['Buen comienzo', 'Generando impulso', 'Base sólida', 'Alta preparación', 'Preparación élite']
  }
};

function normalizeLanguage(value) {
  return value === 'es' ? 'es' : 'en';
}

function cleanText(value, maxLength) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanAuditText(value) {
  return String(value || '')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .trim();
}

function getBestTrack(scores) {
  const camera = scores[0];
  const coaching = scores[1];
  const time = scores[2];
  const money = scores[3];
  const network = scores[4];

  if (camera >= 7 && network >= 6) return 'Content Creation';
  if (coaching >= 7) return 'Coaching / Consulting';
  if (money >= 7) return 'Investment / Passive Income';
  if (time >= 7) return 'Service Business';

  const totals = {
    'Content Creation': camera * 2 + network * 1.5,
    'Coaching / Consulting': coaching * 2 + time,
    'E-commerce / Digital Products': time * 1.5 + money,
    'Service Business': time * 2 + coaching,
    'Investment / Passive Income': money * 2 + time
  };

  return Object.keys(totals).reduce((a, b) => totals[a] > totals[b] ? a : b);
}

function getReadinessLabel(score, language) {
  const labels = COPY[normalizeLanguage(language)].readiness;
  if (score >= 42) return labels[4];
  if (score >= 34) return labels[3];
  if (score >= 25) return labels[2];
  if (score >= 15) return labels[1];
  return labels[0];
}

function getVenue(sport, language) {
  const s = String(sport || '').toLowerCase();
  const es = normalizeLanguage(language) === 'es';
  if (s.includes('football') || s.includes('fútbol americano')) return es ? 'campo' : 'field';
  if (s.includes('baseball') || s.includes('béisbol') || s.includes('softball')) return es ? 'diamante' : 'diamond';
  if (s.includes('soccer') || s.includes('fútbol')) return es ? 'cancha' : 'pitch';
  if (s.includes('hockey')) return es ? 'pista' : 'rink';
  if (s.includes('swim') || s.includes('natación')) return es ? 'piscina' : 'pool';
  if (s.includes('track') || s.includes('cross country') || s.includes('atletismo')) return es ? 'pista' : 'track';
  if (s.includes('golf')) return es ? 'campo' : 'course';
  if (s.includes('gymnastics') || s.includes('gimnasia') || s.includes('wrestling') || s.includes('lucha')) return es ? 'tapiz' : 'mat';
  return es ? 'cancha' : 'court';
}

function validateMainAudit(body) {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body');
  if (cleanText(body.company, 200)) throw new Error('Invalid submission');

  const language = normalizeLanguage(body.language);
  const name = cleanText(body.name, 80);
  const sport = cleanText(body.sport, 100);
  const income = cleanText(body.income, 30);
  const email = cleanText(body.email, 254).toLowerCase();
  const scores = Array.isArray(body.scores) ? body.scores.map(Number) : [];

  if (name.length < 1 || sport.length < 2) throw new Error(language === 'es' ? 'Completa tu nombre y deporte.' : 'Name and sport are required.');
  if (!Object.prototype.hasOwnProperty.call(COPY.en.income, income)) throw new Error(language === 'es' ? 'Selecciona una opción de ingresos válida.' : 'Select a valid income option.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(language === 'es' ? 'Ingresa un correo electrónico válido.' : 'Enter a valid email address.');
  if (scores.length !== 5 || scores.some(score => !Number.isInteger(score) || score < 1 || score > 10)) {
    throw new Error(language === 'es' ? 'Las cinco puntuaciones deben estar entre 1 y 10.' : 'All five scores must be integers from 1 to 10.');
  }

  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const bestTrack = getBestTrack(scores);
  return { name, sport, income, email, scores, totalScore, bestTrack, language };
}

function buildPrompt(audit) {
  const copy = COPY[audit.language];
  const venue = getVenue(audit.sport, audit.language);
  const scoresSummary = audit.scores.map((score, index) => copy.dimensions[index] + ': ' + score + '/10').join(', ');
  const trackName = copy.tracks[audit.bestTrack];

  if (audit.language === 'es') {
    return 'Eres un coach de negocios directo que ayuda a atletas a crear ingresos fuera del deporte. Escribe un diagnóstico personalizado de preparación empresarial de aproximadamente 250 palabras, completamente en español latinoamericano natural. Usa un tono cálido, motivador y de atleta a atleta; nunca corporativo. No uses Spanglish, Markdown, títulos ni encabezados.\n\n' +
      'Atleta: ' + audit.name + ' | Deporte: ' + audit.sport + ' | Ingresos: ' + copy.income[audit.income] + ' | Puntuación: ' + audit.totalScore + '/50 | Dimensiones: ' + scoresSummary + ' | Ruta: ' + trackName + ' | Palabra para el lugar deportivo: ' + venue + '\n\n' +
      'Escribe exactamente 3 párrafos:\n1. Lectura honesta de sus puntuaciones\n2. Por qué ' + trackName + ' es su mejor siguiente paso\n3. Tres acciones concretas para ESTA SEMANA\n\nUsa su nombre y la palabra "' + venue + '" cuando corresponda. Sin relleno.';
  }

  return 'You are a sharp business coach who specializes in helping athletes build income. Write a personalized 250-word business readiness audit. Be direct, specific, motivating—peer to peer, not consultant. Do not use Markdown, titles, or headings.\n\n' +
    'Athlete: ' + audit.name + ' | Sport: ' + audit.sport + ' | Income: ' + copy.income[audit.income] + ' | Score: ' + audit.totalScore + '/50 | Dimensions: ' + scoresSummary + ' | Track: ' + trackName + ' | Venue word: ' + venue + '\n\n' +
    'Write exactly 3 paragraphs:\n1. Honest read on their scores\n2. Why ' + trackName + ' is their best move\n3. Three concrete moves THIS WEEK\n\nUse their name. Use "' + venue + '" when relevant. No fluff.';
}

function buildFallbackAudit(audit) {
  const copy = COPY[audit.language];
  const label = getReadinessLabel(audit.totalScore, audit.language);
  const track = copy.tracks[audit.bestTrack];
  const venue = getVenue(audit.sport, audit.language);

  if (audit.language === 'es') {
    return audit.name + ', aquí tienes una lectura directa de tu perfil.\n\nObtuviste ' + audit.totalScore + ' de 50, lo que te coloca en ' + label + '. La disciplina que desarrollaste en ' + audit.sport + ' ya te da una ventaja. La pregunta no es si puedes crear ingresos fuera de la ' + venue + ', sino qué camino pone tus fortalezas a trabajar más rápido.\n\nTus resultados apuntan claramente a ' + track + '. Esta semana: comprométete con esa ruta, reserva dos horas para comenzar y publica una vez sobre tu identidad como atleta. El movimiento vence a la perfección.';
  }

  return audit.name + ', here is your honest read.\n\nYou scored ' + audit.totalScore + ' out of 50, which puts you at ' + label + '. The discipline you built in ' + audit.sport + ' already gives you an edge. The question is not whether you can build income off the ' + venue + ', but which path puts your strengths to work fastest.\n\nYour scores point clearly to ' + track + '. This week: commit to that track, block two hours to begin, and post once about your athletic identity. Movement beats perfection.';
}

module.exports = {
  COPY,
  TRACKS,
  buildFallbackAudit,
  buildPrompt,
  cleanAuditText,
  cleanText,
  escapeHtml,
  getBestTrack,
  getReadinessLabel,
  getVenue,
  normalizeLanguage,
  validateMainAudit
};
