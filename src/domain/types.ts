export type EstadoAlerta = 'vigente' | 'proxima' | 'vencida';
export type TipoRepresentacion = 'individual' | 'mancomunada' | 'indistinta';
export type Confianza = 'alto' | 'medio' | 'bajo';

export interface Empresa {
  id: string;
  nombreEmpresa: string;
  ruc: string;
  partidaRegistral: string;
  oficinaRegistral: string;
  notas?: string;
  fechaCreacion: number;
}

export interface VigenciaPoder {
  id: string;
  empresaId: string;
  archivoNombre: string;
  archivoPDF: Blob;
  fechaExpedicion?: string;
  fechaSubida: number;
  numeroPublicidad?: string;
  alertaEnviada: boolean;
  estadoAlerta: EstadoAlerta;
  textoExtraido: string;
  requiereRevisionManual?: boolean;
}

export interface Apoderado {
  id: string;
  vigenciaId: string;
  empresaId: string;
  nombreApoderado: string;
  dniApoderado?: string;
  tipoPoder: string;
  tipoRepresentacion: TipoRepresentacion;
  coApoderado?: string;
  facultades: string[];
  limitaciones: string[];
  actosSinFacultad?: string[];
  observaciones?: string;
  confianza: Record<string, Confianza>;
  editadoPorUsuario?: string[];
}

export interface ParsedCertificate {
  fechaExpedicion?: string;
  partidaRegistral?: string;
  oficinaRegistral?: string;
  numeroPublicidad?: string;
  apoderados: Array<{
    nombreApoderado: string;
    dniApoderado?: string;
    tipoPoder: string;
    tipoRepresentacion: TipoRepresentacion;
    coApoderado?: string;
    facultades: string[];
    limitaciones: string[];
    actosSinFacultad: string[];
    confianza: Record<string, Confianza>;
  }>;
  confianza: Record<string, Confianza>;
  requiereRevisionManual: boolean;
}
