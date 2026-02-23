// ============================================================
// CONFIGURACIÓN GLOBAL DEL BLOG
// Cambia estos valores para personalizar todo el sitio.
// Todos los demás archivos importan desde aquí.
// ============================================================

export const SITE = {
  name: 'Radianco',
  description: 'A blog by friends who started building together.',
  descriptionEs: 'Un blog de amigos que empezaron a construir juntos.',
  url: 'https://tu-dominio.com', // Cambiar por tu dominio real
  defaultLang: 'en' as const,
  defaultTheme: 'light' as const,
};

// ============================================================
// CATEGORÍAS DE ARTÍCULOS
// ============================================================

export type CategoryId = 'dev' | 'nocode' | 'reads';

export const CATEGORIES: Record<CategoryId, { en: string; es: string; icon: string; description: { en: string; es: string } }> = {
  dev: {
    en: 'Dev',
    es: 'Dev',
    icon: '⌨',
    description: {
      en: 'Technical articles for developers',
      es: 'Artículos técnicos para desarrolladores',
    },
  },
  nocode: {
    en: 'NoCode',
    es: 'NoCode',
    icon: '✦',
    description: {
      en: 'Technology without the jargon',
      es: 'Tecnología sin jerga técnica',
    },
  },
  reads: {
    en: 'Reads',
    es: 'Reads',
    icon: '◉',
    description: {
      en: 'Essays, ideas, and long-form writing',
      es: 'Ensayos, ideas y escritura en profundidad',
    },
  },
};

// ============================================================
// AUTORES
// ============================================================

export interface AuthorSocials {
  github?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  website?: string;
  email?: string;
}

export interface Author {
  id: string;
  name: string;
  bio: { en: string; es: string };
  shortBio: { en: string; es: string };  // Para tarjetas y listados
  avatar: string;       // ruta en /public/avatars/
  socials: AuthorSocials;
}

export const AUTHORS: Author[] = [
  {
    id: 'sebastian-franco',
    name: 'Sebastián Franco',
    bio: {
      en: 'Master\'s in Artificial Intelligence with 7+ years of experience in data engineering, data science, and analytics. Specialized in designing data-driven solutions that integrate scalable architectures, governance frameworks, and applied AI — transforming complex data ecosystems into actionable business value across public, marketing, and financial sectors.',
      es: 'Máster en Inteligencia Artificial con más de 7 años de experiencia en ingeniería de datos, ciencia de datos y analítica. Especializado en diseñar soluciones basadas en datos que integran arquitecturas escalables, marcos de gobernanza e IA aplicada — transformando ecosistemas complejos de datos en valor de negocio accionable en los sectores público, de marketing y financiero.',
    },
    shortBio: {
      en: 'Data Engineer · MSc in Artificial Intelligence',
      es: 'Ingeniero de Datos · MSc en Inteligencia Artificial',
    },
    avatar: '/avatars/sebastian-franco.jpg',
    socials: {
      github: 'https://github.com/sebastianfranks',
      linkedin: 'https://www.linkedin.com/in/sebastian-franco-acevedo/',
      twitter: '',
      instagram: '',
      website: '',
      email: '',
    },
  },
  {
    id: 'juan-sebastian-rada',
    name: 'Juan Sebastián Rada',
    bio: {
      en: 'Builder and thinker. Always exploring new ideas.',
      es: 'Constructor y pensador. Siempre explorando nuevas ideas.',
    },
    shortBio: {
      en: 'Builder and thinker. Always exploring new ideas.',
      es: 'Constructor y pensador. Siempre explorando nuevas ideas.',
    },
    avatar: '',
    socials: {
      github: 'https://github.com/',
      linkedin: 'https://linkedin.com/in/',
      twitter: '',
      instagram: '',
      website: '',
      email: '',
    },
  },
  {
    id: 'francisco-diago',
    name: 'Francisco Diago',
    bio: {
      en: 'Curious mind with a passion for technology and design.',
      es: 'Mente curiosa con pasión por la tecnología y el diseño.',
    },
    shortBio: {
      en: 'Curious mind with a passion for technology and design.',
      es: 'Mente curiosa con pasión por la tecnología y el diseño.',
    },
    avatar: '',
    socials: {
      github: 'https://github.com/',
      linkedin: 'https://linkedin.com/in/',
      twitter: '',
      instagram: '',
      website: '',
      email: '',
    },
  },
];

// Helper
export function getAuthor(id: string): Author | undefined {
  return AUTHORS.find((a) => a.id === id);
}
