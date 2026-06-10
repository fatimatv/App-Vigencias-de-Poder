import { describe, expect, it } from 'vitest';
import { parseCertificateText } from './parser';

describe('parseCertificateText', () => {
  it('extracts registral data, issue date, apoderados, faculties and limitations', () => {
    const text = `
      Certificado de Vigencia de Poder emitido el 15 de abril de 2026.
      Partida registral N.° 12345678 inscrita en la Oficina Registral de Lima.
      Número de publicidad 2026-009912.
      Se otorga poder general a JUAN CARLOS PEREZ RAMOS, identificado con DNI N.° 12345678,
      para firmar contratos, representar judicialmente y abrir y cerrar cuentas.
      Actuando conjuntamente junto con MARIA LOPEZ GARCIA.
      Con límite de USD 50,000 y previa aprobación del directorio. No podrá vender inmuebles.
    `;

    const parsed = parseCertificateText(text);

    expect(parsed.fechaExpedicion).toBe('2026-04-15');
    expect(parsed.partidaRegistral).toBe('12345678');
    expect(parsed.oficinaRegistral).toBe('Lima');
    expect(parsed.numeroPublicidad).toBe('2026-009912');
    expect(parsed.apoderados).toHaveLength(1);
    expect(parsed.apoderados[0].nombreApoderado).toBe('JUAN CARLOS PEREZ RAMOS');
    expect(parsed.apoderados[0].dniApoderado).toBe('12345678');
    expect(parsed.apoderados[0].tipoRepresentacion).toBe('mancomunada');
    expect(parsed.apoderados[0].coApoderado).toBe('MARIA LOPEZ GARCIA');
    expect(parsed.apoderados[0].facultades).toEqual(
      expect.arrayContaining(['firmar contratos', 'representar judicialmente', 'abrir y cerrar cuentas'])
    );
    expect(parsed.apoderados[0].limitaciones).toEqual(
      expect.arrayContaining(['Con límite de USD 50,000 y previa aprobación del directorio'])
    );
    expect(parsed.apoderados[0].actosSinFacultad).toContain('No podrá vender inmuebles');
    expect(parsed.requiereRevisionManual).toBe(false);
  });

  it('flags manual review when issue date or apoderados are not detected', () => {
    const parsed = parseCertificateText('Documento sin patrones claros de fecha o representantes.');

    expect(parsed.fechaExpedicion).toBeUndefined();
    expect(parsed.apoderados).toHaveLength(0);
    expect(parsed.confianza.fechaExpedicion).toBe('bajo');
    expect(parsed.requiereRevisionManual).toBe(true);
  });
});
