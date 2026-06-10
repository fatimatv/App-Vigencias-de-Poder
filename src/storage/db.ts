import Dexie, { type Table } from 'dexie';
import type { Apoderado, Empresa, VigenciaPoder } from '../domain/types';

class VigenciasDb extends Dexie {
  empresas!: Table<Empresa, string>;
  vigencias!: Table<VigenciaPoder, string>;
  apoderados!: Table<Apoderado, string>;

  constructor() {
    super('ialaw-vigencias-poder');
    this.version(1).stores({
      empresas: 'id, nombreEmpresa, ruc, partidaRegistral, oficinaRegistral, fechaCreacion',
      vigencias: 'id, empresaId, fechaExpedicion, fechaSubida, estadoAlerta, alertaEnviada',
      apoderados: 'id, vigenciaId, empresaId, nombreApoderado, dniApoderado, tipoRepresentacion'
    });
  }
}

export const db = new VigenciasDb();
