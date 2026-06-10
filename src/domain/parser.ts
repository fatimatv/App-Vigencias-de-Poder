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

const FACULTY_PHRASES = [
  'firmar contratos',
  'celebrar',
  'suscribir',
  'representar',
  'otorgar',
  'cobrar',
  'cobrar y endosar cheques',
  'abrir y cerrar cuentas',
  'comprar',
  'vender',
  'enajenar',
  'hipotecar',
  'transigir',
  'comprometer en arbitraje',
  'interponer recursos',
  'representar judicialmente',
  'delegar',
  'sustituir poderes'
];

export function parseCertificateText(text: string): ParsedCertificate {
  const normalized = normalizeWhitespace(text);
  const fecha = extractIssueDate(normalized);
  const partida = extractMatch(
    normalized,
    /(?:partida\s*(?:n\.?°?|electr[oó]nica|registral)?|partida\s+electr[oó]nica|partida\s+registral)\s*(?:n\.?°?)?\s*[:\-]?\s*(\d{6,12}(?:-\d+)?)/i
  );
  const oficina = extractMatch(normalized, /oficina\s+registral\s+(?:de\s+)?([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ\s]+?)(?:\.|,|;|\s+N[uú]mero|\s+Se\s)/i);
  const numeroPublicidad = extractMatch(normalized, /(?:n[uú]mero\s+de\s+publicidad|publicidad\s+n\.?°?)\s*[:\-]?\s*([A-Z0-9-]{5,})/i);
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
  return text.replace(/\s+/g, ' ').replace(/N\.°/gi, 'N.°').trim();
}

function extractMatch(text: string, pattern: RegExp): string | undefined {
  return text.match(pattern)?.[1]?.trim();
}

function extractIssueDate(text: string): string | undefined {
  const numeric = text.match(
    /(?:expedido\s+el|fecha\s+de\s+expedici[oó]n|emitido\s+el|con\s+fecha)\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i
  );
  if (numeric) return toIsoDate(numeric[3], numeric[2], numeric[1]);

  const written = text.match(
    /(?:expedido\s+el|fecha\s+de\s+expedici[oó]n|emitido\s+el|con\s+fecha)\s*(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i
  );
  if (!written) return undefined;
  const month = MONTHS[written[2].toLowerCase()];
  return month ? toIsoDate(written[3], month, written[1]) : undefined;
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
  const pattern =
    /(?:se\s+otorga\s+poder(?:\s+\w+)?\s+a|faculta\s+a|designa\s+como\s+apoderado\s+a|confiere\s+poder\s+a)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{8,}?)(?:,\s*(?:identificado\s+con\s+)?DNI\s*N\.?°?\s*(\d{8}))?(?=,?\s+para\s+|\.|;)/gi;
  const matches = [...text.matchAll(pattern)];

  return matches.map((match) => ({
    nombreApoderado: match[1].trim(),
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
  }));
}

function inferPowerType(text: string): string {
  if (/poder\s+especial/i.test(text)) return 'Poder Especial';
  if (/poder\s+con\s+representaci[oó]n/i.test(text)) return 'Poder con Representación';
  return 'Poder General';
}

function extractFacultades(text: string): string[] {
  const lower = text.toLowerCase();
  return FACULTY_PHRASES.filter((phrase) => lower.includes(phrase));
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
