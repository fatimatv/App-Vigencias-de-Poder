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
      expect.arrayContaining([
        'firmar contratos',
        'representar judicialmente y abrir y cerrar cuentas'
      ])
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
      expect.arrayContaining(['representar judicialmente y abrir y cerrar cuentas'])
    );
  });

  it('extracts facultades as complete clauses instead of isolated verbs', () => {
    const text = `
      Certificado de vigencia de poder emitido con fecha 9 de junio de 2026.
      Partida registral 99887766 inscrita en la Oficina Registral de Lima.
      Se nombra como apoderada a ANA MARIA VEGA TORRES con DNI N° 12345678.
      Facultades: REPRESENTAR Y SOMETER A LA SOCIEDAD EN CASO DE CONTROVERSIAS LABORALES A ARBITRAJE,
      INTERPONER Y CONTESTAR TODA CLASE DE DEMANDAS, SUSCRIBIR CONTRATOS DE PRESTACION DE SERVICIOS.
    `;

    const parsed = parseCertificateText(text);

    expect(parsed.apoderados).toHaveLength(1);
    expect(parsed.apoderados[0].facultades).toEqual(
      expect.arrayContaining([
        'REPRESENTAR Y SOMETER A LA SOCIEDAD EN CASO DE CONTROVERSIAS LABORALES A ARBITRAJE',
        'INTERPONER Y CONTESTAR TODA CLASE DE DEMANDAS',
        'SUSCRIBIR CONTRATOS DE PRESTACION DE SERVICIOS'
      ])
    );
  });

  it('extracts data from OCR output of a real SUNARP vigencia certificate', () => {
    const text = `
      ZONA REGISTRAL N° IX Código de Verificación:
      Oficina Registral de LIMA 32839301
      Publicidad N* 2025 - 3908008
      16/06/2025 14:59:00
      REGISTRO DE PERSONAS JURIDICAS
      LIBRO DE SOCIEDADES ANONIMAS
      CERTIFICADO DE VIGENCIA
      El servidor que suscribe, CERTIFICA:
      Que, en la partida electrónica N° 13273320 del Registro de Personas Jurídicas de la Oficina Registral de LIMA,
      consta registrado y vigente el nombramiento a favor de TOCHE VEGA, FATIMA LUCIA, identificado con DNI. N* 40945848,
      cuyos datos se precisan a continuación:
      DENOMINACIÓN O RAZÓN SOCIAL: EBANX PERU SOCIEDAD ANONIMA CERRADA
      CARGO: GERENTE GENERAL
      NOMBRAR COMO NUEVO GERENTE GENERAL DE LA SOCIEDAD A LA SRTA. FATIMA LUCIA TOCHE VEGA,
      IDENTIFICADA CON D.N.I. N°40945848, QUIEN A PARTIR DEL 22 DE JULIO DE 2018 GOZARÁ DE
      TODAS LAS FACULTADES CORRESPONDIENTES AL GERENTE GENERAL.
      LAS ATRIBUCIONES DEL GERENTE GENERAL DE LA SOCIEDAD SERÁN LAS SIGUIENTES, LAS CUALES LAS EJERCERÁ DE MANERA INDIVIDUAL Y A SOLA FIRMA:
      1. REPRESENTAR A LA SOCIEDAD ANTE TODO TIPO DE AUTORIDADES ADMINISTRATIVAS, JUDICIALES, LABORALES MUNICIPALES.
    `;

    const parsed = parseCertificateText(text);

    expect(parsed.fechaExpedicion).toBe('2025-06-16');
    expect(parsed.partidaRegistral).toBe('13273320');
    expect(parsed.numeroPublicidad).toBe('2025-3908008');
    expect(parsed.apoderados).toHaveLength(1);
    expect(parsed.apoderados[0].nombreApoderado).toBe('FATIMA LUCIA TOCHE VEGA');
    expect(parsed.apoderados[0].dniApoderado).toBe('40945848');
    expect(
      parsed.apoderados[0].facultades.some((item) =>
        item.startsWith('REPRESENTAR A LA SOCIEDAD ANTE TODO TIPO DE AUTORIDADES ADMINISTRATIVAS')
      )
    ).toBe(true);
    expect(parsed.requiereRevisionManual).toBe(false);
  });
});
