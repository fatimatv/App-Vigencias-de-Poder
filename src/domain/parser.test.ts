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

  it('extracts data from alternative SUNARP phrasing with numeric date and feminine apoderada label', () => {
    const text = `
      CERTIFICADO DE VIGENCIA DE PODER de fecha: 21/05/2026.
      Partida electrónica N° 11023344 inscrita en la Oficina Registral de Arequipa.
      Publicidad N° A12345-2026.
      Se nombra como apoderada a Maria Fernanda Lopez Torres con DNI N° 87654321 para suscribir contratos y cobrar.
    `;

    const parsed = parseCertificateText(text);

    expect(parsed.fechaExpedicion).toBe('2026-05-21');
    expect(parsed.partidaRegistral).toBe('11023344');
    expect(parsed.numeroPublicidad).toBe('A12345-2026');
    expect(parsed.apoderados).toHaveLength(1);
    expect(parsed.apoderados[0].nombreApoderado).toBe('Maria Fernanda Lopez Torres');
    expect(parsed.apoderados[0].dniApoderado).toBe('87654321');
    expect(parsed.requiereRevisionManual).toBe(false);
  });

  it('extracts apoderado from labeled field format', () => {
    const text = `
      Certificado de vigencia de poder emitido con fecha 7 de junio de 2026.
      Partida registral 44556677 en la Oficina Registral de Cusco.
      Apoderado: JOSE LUIS PEREZ GOMEZ, DNI N° 11223344.
      Cuenta con facultades para representar judicialmente y abrir y cerrar cuentas.
    `;

    const parsed = parseCertificateText(text);

    expect(parsed.fechaExpedicion).toBe('2026-06-07');
    expect(parsed.apoderados).toHaveLength(1);
    expect(parsed.apoderados[0].nombreApoderado).toBe('JOSE LUIS PEREZ GOMEZ');
    expect(parsed.apoderados[0].dniApoderado).toBe('11223344');
    expect(parsed.apoderados[0].facultades).toEqual(
      expect.arrayContaining(['representar judicialmente', 'abrir y cerrar cuentas'])
    );
  });
});
