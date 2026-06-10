import type { Confianza, ParsedCertificate, TipoRepresentacion } from './types';

const MONTHS: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12'
};

const FACULTY_VERBS = [
  'apersonarse',
  'abrir',
  'aceptar',
  'afianzar',
  'arrendar',
  'celebrar',
  'cerrar',
  'cobrar',
  'comprar',
  'comprometer',
  'constituir',
  'delegar',
  'disponer',
  'ejecutar',
  'enajenar',
  'endosar',
  'firmar',
  'formular',
  'gestionar',
  'girar',
  'hipotecar',
  'interponer',
  'negociar',
  'otorgar',
  'pactar',
  'presentar',
  'representar',
  'resolver',
  'solicitar',
  'someter',
  'suscribir',
  'sustituir',
  'transigir',
  'tramitar',
  'vender'
];

const FACULTY_SECTION_MARKERS = [
  /facultades\s*:/i,
  /las\s+atribuciones\s+del\s+gerente\s+general[^.]{0,400}?ser[aá]n\s+las\s+siguientes\s*:/i,
  /a\s+sola\s+firma\s*:/i,
  /facultades\s+correspondientes\s+al\s+gerente\s+general/i
];

const FACULTY_SECTION_END =
  /(?:limitaciones?\s*:|actos\s+sin\s+facultad|observaciones?\s*:|no\s+podr[aá]|queda\s+excluido|revocaci[oó]n|vigencia\s+del\s+poder|asimismo[,;:]?\s+en\s+el\s+asiento|denominaci[oó]n\s+o\s+raz[oó]n\s+social\s*:)/i;

const DATE_PREFIXES =
  '(?:expedido\\s+el|expedido\\s+con\\s+fecha|fecha\\s+de\\s+expedici[oó]n|emitido\\s+el|emitido\\s+con\\s+fecha|con\\s+fecha|de\\s+fecha|fecha)';

const PERSON_NAME_PATTERN =
  '([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ]+){2,}|[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\\s]{8,}?)';

export function parseCertificateText(text: string): ParsedCertificate {
  const normalized = normalizeWhitespace(text);
  const fecha = extractIssueDate(normalized);
  const partida = extractMatch(
    normalized,
    /(?:partida\s*(?:n\.?°?|electr[oó]nica|registral)?|partida\s+electr[oó]nica|partida\s+registral)\s*(?:n\.?°?)?\s*[:\-]?\s*(\d{6,12}(?:-\d+)?)/i
  );
  const oficina = extractMatch(normalized, /oficina\s+registral\s+(?:de\s+)?([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?:\.|,|;|\s+N[uú]mero|\s+Se\s)/i);
  const numeroPublicidad = normalizePublicationNumber(
    extractMatch(normalized, /(?:n[uú]mero\s+de\s+publicidad|publicidad(?:\s+registral)?\s*(?:n\.?[°*]?|nro\.?|n[uú]m\.?|n[uú]mero)?)\s*[:\-]?\s*([A-Z0-9\s-]{5,})/i)
  );
  const representation = detectRepresentation(normalized);
  const apoderados = extractApoderados(normalized, representation);
  const confianza: Record<string, Confianza> = {
    fechaExpedicion: fecha ? 'alto' : 'bajo',
    partidaRegistral: partida ? 'alto' : 'bajo',
    oficinaRegistral: oficina ? 'alto' : 'bajo',
    numeroPublicidad: numeroPublicidad ? 'medio' : 'bajo'
  };

  return {
    fechaExpedicion: fecha,
    partidaRegistral: partida,
    oficinaRegistral: oficina?.trim(),
    numeroPublicidad,
    apoderados,
    confianza,
    requiereRevisionManual: !fecha || apoderados.length === 0
  };
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/N[º°]/gi, 'N.°').trim();
}

function extractMatch(text: string, pattern: RegExp): string | undefined {
  return text.match(pattern)?.[1]?.trim();
}

function extractIssueDate(text: string): string | undefined {
  const headerChunk = text.slice(0, 400);
  const headerTimestamp = headerChunk.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+\d{1,2}:\d{2}:\d{2}/);
  if (headerTimestamp) return toIsoDate(headerTimestamp[3], headerTimestamp[2], headerTimestamp[1]);

  const numericPatterns = [
    new RegExp(`${DATE_PREFIXES}\\s*[:\\-]?\\s*(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})`, 'i'),
    /certificado\s+de\s+vigencia\s+de\s+poder[^\d]{0,80}(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i
  ];

  for (const pattern of numericPatterns) {
    const numeric = text.match(pattern);
    if (numeric) return toIsoDate(numeric[3], numeric[2], numeric[1]);
  }

  const writtenPatterns = [
    new RegExp(`${DATE_PREFIXES}\\s*[:\\-]?\\s*(\\d{1,2})\\s+de\\s+([a-záéíóú]+)\\s+de\\s+(\\d{4})`, 'i'),
    /certificado\s+de\s+vigencia\s+de\s+poder[^\d]{0,80}(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i
  ];

  for (const pattern of writtenPatterns) {
    const written = text.match(pattern);
    if (!written) continue;
    const month = MONTHS[written[2].toLowerCase()];
    if (month) return toIsoDate(written[3], month, written[1]);
  }

  return undefined;
}

function toIsoDate(year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function detectRepresentation(text: string): {
  tipoRepresentacion: TipoRepresentacion;
  coApoderado?: string;
} {
  const isMancomunada = /actuando\s+conjuntamente|de\s+manera\s+conjunta|forma\s+mancomunada|junto\s+con|ambos\s+apoderados|firma\s+de\s+ambos/i.test(text);
  if (!isMancomunada) {
    const indistinta = /de\s+manera\s+indistinta|individual\s+o\s+conjuntamente|separadamente/i.test(text);
    return { tipoRepresentacion: indistinta ? 'indistinta' : 'individual' };
  }
  const coApoderado = extractMatch(text, /junto\s+con\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{8,}?)(?:\.|,|;|\s+Con\s)/);
  return { tipoRepresentacion: 'mancomunada', coApoderado };
}

function extractApoderados(
  text: string,
  representation: { tipoRepresentacion: TipoRepresentacion; coApoderado?: string }
): ParsedCertificate['apoderados'] {
  const patterns = [
    new RegExp(
      `(?:se\\s+otorga\\s+poder(?:es)?(?:\\s+\\w+)?\\s+a|otorga\\s+poder(?:es)?\\s+a|faculta\\s+a|otorga\\s+facultades\\s+a|designa\\s+como\\s+apoderad[oa]\\s+a|se\\s+designa\\s+como\\s+apoderad[oa]\\s+a|se\\s+nombra\\s+como\\s+apoderad[oa]\\s+a|confiere\\s+poder\\s+a)\\s+${PERSON_NAME_PATTERN}(?:,?\\s*(?:identificad[oa]\\s+con\\s+|con\\s+)?DNI\\s*N\\.?°?\\s*(\\d{8}))?(?=,?\\s+(?:para|quien|con|y\\s+para)\\b|\\.|;)`,
      'gi'
    ),
    new RegExp(
      `(?:apoderad[oa](?:\\s+principal)?|representante\\s+legal)\\s*[:\\-]\\s*${PERSON_NAME_PATTERN}(?:,?\\s*(?:identificad[oa]\\s+con\\s+|con\\s+)?DNI\\s*N\\.?°?\\s*(\\d{8}))?(?=,?\\s+(?:para|quien|con)\\b|\\.|;)`,
      'gi'
    ),
    /nombramiento\s+a\s+favor\s+de\s+([A-ZÁÉÍÓÚÑ\s,]{8,}?)(?:,?\s*identificad[oa]\s+con\s+D\.?N\.?I\.?\s*N\.?[°*]?\s*(\d{8}))(?=\s*,?\s*cuyos|\.|;)/gi,
    /nombrar\s+como\s+nuevo\s+gerente\s+general(?:\s+de\s+la\s+sociedad)?\s+a\s+(?:la|el)\s+(?:srta\.?|sra\.?|sr\.?|señora|señor)?\s*([A-ZÁÉÍÓÚÑ\s]{8,}?)(?:,?\s*identificad[oa]\s+con\s+D\.?N\.?I\.?\s*N\.?[°*]?\s*(\d{8}))(?=\s*,?\s*quien|\.|;)/gi
  ];

  const apoderados: ParsedCertificate['apoderados'] = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const nombreApoderado = normalizePersonName(match[1]);
      if (!nombreApoderado || seen.has(nombreApoderado.toLowerCase())) continue;
      seen.add(nombreApoderado.toLowerCase());
      apoderados.push({
        nombreApoderado,
        dniApoderado: match[2],
        tipoPoder: inferPowerType(text),
        tipoRepresentacion: representation.tipoRepresentacion,
        coApoderado: representation.coApoderado,
        facultades: extractFacultades(text),
        limitaciones: extractLimitaciones(text),
        actosSinFacultad: extractNegativeActs(text),
        confianza: {
          nombreApoderado: 'alto',
          dniApoderado: match[2] ? 'alto' : 'bajo',
          tipoPoder: 'medio',
          tipoRepresentacion: representation.tipoRepresentacion === 'individual' ? 'medio' : 'alto',
          facultades: 'medio',
          limitaciones: 'medio'
        }
      });
    }
  }

  return apoderados;
}

function normalizePersonName(value?: string): string | undefined {
  const normalized = value?.replace(/\s+/g, ' ').replace(/\s+(?:con|para|quien)$/i, '').trim();
  if (!normalized || normalized.length < 8) return undefined;
  if (!normalized.includes(',')) return normalized;

  const [left, right] = normalized.split(',').map((part) => part.trim()).filter(Boolean);
  return left && right ? `${right} ${left}` : normalized;
}

function normalizePublicationNumber(value?: string): string | undefined {
  const normalized = value?.replace(/\s+/g, ' ').trim();
  if (!normalized) return undefined;
  const compact = normalized.replace(/\s*-\s*/g, '-');
  return compact.match(/[A-Z0-9]+(?:-[A-Z0-9]+)+|[A-Z0-9]{5,}/)?.[0];
}

function inferPowerType(text: string): string {
  if (/poder\s+especial/i.test(text)) return 'Poder Especial';
  if (/poder\s+con\s+representaci[oó]n/i.test(text)) return 'Poder con Representación';
  return 'Poder General';
}

function extractFacultades(text: string): string[] {
  const sections = extractFacultadSections(text);
  const clauses = sections.flatMap((section) => splitFacultyClauses(section));
  const seen = new Set<string>();

  return clauses.filter((clause) => {
    const key = clause.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractLimitaciones(text: string): string[] {
  const results = text.match(
    /(?:hasta\s+por|por\s+un\s+monto\s+no\s+mayor|con\s+l[ií]mite\s+de|sujeto\s+a\s+autorizaci[oó]n|previa\s+aprobaci[oó]n\s+del\s+directorio|queda\s+excluido)[^.]+/gi
  );
  return [...new Set((results ?? []).map((item) => item.trim()))];
}

function extractNegativeActs(text: string): string[] {
  const results = text.match(/no\s+podr[aá][^.]+/gi);
  return [...new Set((results ?? []).map((item) => capitalizeFirst(item.trim())))];
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function extractFacultadSections(text: string): string[] {
  const sections: string[] = [];

  for (const marker of FACULTY_SECTION_MARKERS) {
    const match = marker.exec(text);
    if (!match) continue;

    const start = match.index + match[0].length;
    const rest = text.slice(start);
    const endMatch = FACULTY_SECTION_END.exec(rest);
    sections.push((endMatch ? rest.slice(0, endMatch.index) : rest).trim());
  }

  if (sections.length > 0) {
    return sections.sort((left, right) => right.length - left.length);
  }
  return [text];
}

function splitFacultyClauses(section: string): string[] {
  const verbPattern = FACULTY_VERBS.join('|');
  const normalized = section
    .replace(/\s+[A-Z]\)\s+/g, '\n')
    .replace(/\s+\d+[.)]\s+/g, '\n')
    .replace(new RegExp(`,\\s+(?=(?:y\\s+|e\\s+)?(?:${verbPattern})\\b)`, 'gi'), '\n')
    .replace(new RegExp(`;\\s+(?=(?:y\\s+|e\\s+)?(?:${verbPattern})\\b)`, 'gi'), '\n')
    .replace(new RegExp(`\\.\\s+(?=(?:[A-Z]\\)|\\d+[.)]|(?:${verbPattern})\\b))`, 'gi'), '\n');

  return normalized
    .split(/\n+/)
    .map(cleanFacultyClause)
    .filter(isFacultyClause);
}

function cleanFacultyClause(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  const verbPattern = new RegExp(`\\b(?:${FACULTY_VERBS.join('|')})\\b`, 'i');
  const verbIndex = compact.search(verbPattern);
  const sliced = verbIndex >= 0 ? compact.slice(verbIndex) : compact;

  return sliced
    .replace(/\s+(?:Actuando\s+conjuntamente|Con\s+l[ií]mite\s+de|No\s+podr[aá]|Queda\s+excluido|Asimismo)\b[\s\S]*$/i, '')
    .replace(/^[\-–—:\)\(\[\]"“”']+/, '')
    .replace(/^(?:y|e)\s+/i, '')
    .replace(/\s+(?:y|e)$/i, '')
    .replace(/[.;:,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFacultyClause(value: string): boolean {
  if (!value) return false;
  if (value.length < 12) return false;
  const lower = value.toLowerCase();
  if (!FACULTY_VERBS.some((verb) => lower.startsWith(verb))) return false;
  if (!/\s/.test(value)) return false;
  return !/^(?:facultades|se\s+acord[oó]|art[ií]culo|las\s+atribuciones)/i.test(lower);
}
