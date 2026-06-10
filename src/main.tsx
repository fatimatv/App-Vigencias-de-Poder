import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  Download,
  Eye,
  FilePlus2,
  FileText,
  Pencil,
  Plus,
  Save,
  Search,
  Upload,
  UserRound,
  X
} from 'lucide-react';
import './styles.css';
import { calculateAlertState, daysSinceIssue } from './domain/alerts';
import { parseCertificateText } from './domain/parser';
import type { Apoderado, Empresa, EstadoAlerta, ParsedCertificate, VigenciaPoder } from './domain/types';
import { db } from './storage/db';
import { extractPdfText } from './storage/pdf';

type View =
  | { name: 'dashboard' }
  | { name: 'empresa'; empresaId: string }
  | { name: 'apoderado'; apoderadoId: string }
  | { name: 'subida'; empresaId: string };

interface AppState {
  empresas: Empresa[];
  vigencias: VigenciaPoder[];
  apoderados: Apoderado[];
}

const emptyState: AppState = { empresas: [], vigencias: [], apoderados: [] };

function App() {
  const [state, setState] = useState<AppState>(emptyState);
  const [view, setView] = useState<View>({ name: 'dashboard' });
  const [query, setQuery] = useState('');
  const [showEmpresaForm, setShowEmpresaForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    const [empresas, vigencias, apoderados] = await Promise.all([
      db.empresas.orderBy('nombreEmpresa').toArray(),
      db.vigencias.orderBy('fechaSubida').reverse().toArray(),
      db.apoderados.orderBy('nombreApoderado').toArray()
    ]);
    await Promise.all(
      vigencias.map((vigencia) => {
        const next = calculateAlertState(vigencia.fechaExpedicion);
        return next === vigencia.estadoAlerta ? undefined : db.vigencias.update(vigencia.id, { estadoAlerta: next });
      })
    );
    const refreshed = await db.vigencias.orderBy('fechaSubida').reverse().toArray();
    setState({ empresas, vigencias: refreshed, apoderados });
    setLoading(false);
  }

  const dashboard = useMemo(() => buildDashboard(state, query), [state, query]);

  return (
    <main className="brand-shell min-h-screen text-ialaw-ink">
      <header className="sticky top-0 z-20 bg-ialaw-blue text-white shadow-brand">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <button
            className="brand-lockup"
            onClick={() => setView({ name: 'dashboard' })}
            aria-label="Volver al dashboard"
          >
            <BrandMark />
            <span>
              <span className="block font-title text-xl font-black leading-none tracking-wide">IALAW</span>
              <span className="block font-subtitle text-sm uppercase tracking-[0.22em] text-white/85">Digital Lawyers</span>
            </span>
            <span className="hidden h-8 w-px bg-white/35 md:block" />
            <span className="hidden font-title text-lg font-black md:block">Vigencias de poder</span>
          </button>
          <button className="icon-button icon-button-inverse print:hidden" onClick={() => window.print()} title="Exportar ficha como PDF">
            <Download size={18} />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6">
        {loading ? (
          <StatusPanel text="Cargando repositorio local..." />
        ) : (
          <>
            {view.name === 'dashboard' && (
              <Dashboard
                dashboard={dashboard}
                state={state}
                query={query}
                setQuery={setQuery}
                onNewEmpresa={() => setShowEmpresaForm(true)}
                onOpenEmpresa={(empresaId) => setView({ name: 'empresa', empresaId })}
              />
            )}
            {view.name === 'empresa' && (
              <EmpresaView
                empresaId={view.empresaId}
                state={state}
                onBack={() => setView({ name: 'dashboard' })}
                onUpload={(empresaId) => setView({ name: 'subida', empresaId })}
                onOpenApoderado={(apoderadoId) => setView({ name: 'apoderado', apoderadoId })}
                onRefresh={refresh}
              />
            )}
            {view.name === 'apoderado' && (
              <ApoderadoView
                apoderadoId={view.apoderadoId}
                state={state}
                onBack={(empresaId) => setView({ name: 'empresa', empresaId })}
                onRefresh={refresh}
              />
            )}
            {view.name === 'subida' && (
              <UploadView
                empresaId={view.empresaId}
                state={state}
                onBack={() => setView({ name: 'empresa', empresaId: view.empresaId })}
                onSaved={async () => {
                  await refresh();
                  setView({ name: 'empresa', empresaId: view.empresaId });
                }}
              />
            )}
          </>
        )}
      </div>

      {showEmpresaForm && (
        <EmpresaModal
          onClose={() => setShowEmpresaForm(false)}
          onSaved={async () => {
            setShowEmpresaForm(false);
            await refresh();
          }}
        />
      )}
    </main>
  );
}

function formatPartidaRegistral(value?: string): string {
  return value?.trim() || 'Sin partida registral';
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span className="brand-mark-grid">
        <span />
        <span />
        <span />
        <span />
      </span>
    </span>
  );
}

function Dashboard({
  dashboard,
  state,
  query,
  setQuery,
  onNewEmpresa,
  onOpenEmpresa
}: {
  dashboard: ReturnType<typeof buildDashboard>;
  state: AppState;
  query: string;
  setQuery: (value: string) => void;
  onNewEmpresa: () => void;
  onOpenEmpresa: (empresaId: string) => void;
}) {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Empresas" value={state.empresas.length} icon={<Building2 size={20} />} />
        <Metric label="Apoderados activos" value={state.apoderados.length} icon={<UserRound size={20} />} />
        <Metric label="Próximas" value={dashboard.proximas} tone="warning" icon={<AlertTriangle size={20} />} />
        <Metric label="Vencidas" value={dashboard.vencidas} tone="danger" icon={<AlertTriangle size={20} />} />
      </div>

      <div className="flex flex-col gap-3 border-y border-slate-200 bg-white px-4 py-4 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="input pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por empresa, RUC o apoderado"
          />
        </label>
        <button className="primary-button" onClick={onNewEmpresa}>
          <Plus size={18} />
          Registrar nueva empresa
        </button>
      </div>

      <section className="grid gap-3">
        {dashboard.rows.map((row) => (
          <button key={row.empresa.id} className="company-row" onClick={() => onOpenEmpresa(row.empresa.id)}>
            <span className={`traffic traffic-${row.estado}`} />
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate font-semibold">{row.empresa.nombreEmpresa}</span>
              <span className="block text-sm text-slate-600">
                RUC {row.empresa.ruc} · {formatPartidaRegistral(row.empresa.partidaRegistral)} · {row.empresa.oficinaRegistral}
              </span>
            </span>
            <span className={`pill ${statusClass(row.estado)}`}>{statusLabel(row.estado)}</span>
          </button>
        ))}
        {dashboard.rows.length === 0 && <StatusPanel text="No hay empresas para mostrar. Registra la primera ficha del repositorio." />}
      </section>
    </section>
  );
}

function EmpresaView({
  empresaId,
  state,
  onBack,
  onUpload,
  onOpenApoderado,
  onRefresh
}: {
  empresaId: string;
  state: AppState;
  onBack: () => void;
  onUpload: (empresaId: string) => void;
  onOpenApoderado: (apoderadoId: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const empresa = state.empresas.find((item) => item.id === empresaId);
  const vigencias = state.vigencias.filter((item) => item.empresaId === empresaId);
  const apoderados = state.apoderados.filter((item) => item.empresaId === empresaId);
  const alertas = vigencias.filter((item) => item.estadoAlerta !== 'vigente');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notas, setNotas] = useState(empresa?.notas ?? '');

  if (!empresa) return <StatusPanel text="La empresa no existe en el repositorio local." />;

  async function saveNotes() {
    await db.empresas.update(empresa!.id, { notas });
    setEditingNotes(false);
    await onRefresh();
  }

  return (
    <section className="space-y-6">
      <Toolbar onBack={onBack} title={empresa.nombreEmpresa}>
        <button className="primary-button" onClick={() => onUpload(empresa.id)}>
          <FilePlus2 size={18} />
          Subir vigencia de poder
        </button>
      </Toolbar>

      <section className="grid gap-4 md:grid-cols-4">
        <Info label="RUC" value={empresa.ruc} />
        <Info label="Partida registral" value={empresa.partidaRegistral} />
        <Info label="Oficina registral" value={empresa.oficinaRegistral} />
        <Info label="Certificados" value={String(vigencias.length)} />
      </section>

      {alertas.length > 0 && (
        <div className="space-y-2 border-l-4 border-sunarp-red bg-red-50 p-4 text-red-950">
          <p className="font-semibold">Vigencias con atención requerida</p>
          {alertas.map((vigencia) => (
            <p key={vigencia.id} className="text-sm">
              {apoderados.filter((a) => a.vigenciaId === vigencia.id).map((a) => a.nombreApoderado).join(', ') || 'Apoderado por revisar'}:
              {' '}{statusLabel(vigencia.estadoAlerta).toLowerCase()} · {daysSinceIssue(vigencia.fechaExpedicion) ?? 'sin'} días desde expedición
            </p>
          ))}
        </div>
      )}

      <section className="section-band">
        <div className="section-heading">
          <h2>Vigencias de poder</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Fecha de expedición</th>
                <th>Estado</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {vigencias.map((vigencia) => (
                <tr key={vigencia.id}>
                  <td>{vigencia.archivoNombre}</td>
                  <td>{vigencia.fechaExpedicion || 'Revisión manual'}</td>
                  <td>
                    <span className={`pill ${statusClass(vigencia.estadoAlerta)}`}>{statusLabel(vigencia.estadoAlerta)}</span>
                  </td>
                  <td>
                    <button className="icon-button" onClick={() => openBlob(vigencia.archivoPDF)} title="Ver PDF">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {vigencias.length === 0 && (
                <tr>
                  <td colSpan={4}>No hay certificados subidos para esta empresa.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-band">
        <div className="section-heading">
          <h2>Apoderados</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Representación</th>
                <th>Facultades</th>
                <th>Vigencia</th>
              </tr>
            </thead>
            <tbody>
              {apoderados.map((apoderado) => {
                const vigencia = vigencias.find((item) => item.id === apoderado.vigenciaId);
                return (
                  <tr key={apoderado.id} className="clickable-row" onClick={() => onOpenApoderado(apoderado.id)}>
                    <td>{apoderado.nombreApoderado}</td>
                    <td>{apoderado.tipoRepresentacion}</td>
                    <td>{apoderado.facultades.slice(0, 3).join(', ') || 'Por revisar'}</td>
                    <td>{vigencia ? statusLabel(vigencia.estadoAlerta) : 'Sin certificado'}</td>
                  </tr>
                );
              })}
              {apoderados.length === 0 && (
                <tr>
                  <td colSpan={4}>No hay apoderados registrados todavía.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-band">
        <div className="section-heading">
          <h2>Notas de la empresa</h2>
          <button className="ghost-button" onClick={() => (editingNotes ? void saveNotes() : setEditingNotes(true))}>
            {editingNotes ? <Save size={16} /> : <Pencil size={16} />}
            {editingNotes ? 'Guardar' : 'Editar'}
          </button>
        </div>
        {editingNotes ? (
          <textarea className="input min-h-28" value={notas} onChange={(event) => setNotas(event.target.value)} />
        ) : (
          <p className="text-slate-700">{empresa.notas || 'Sin notas registradas.'}</p>
        )}
      </section>
    </section>
  );
}

function ApoderadoView({
  apoderadoId,
  state,
  onBack,
  onRefresh
}: {
  apoderadoId: string;
  state: AppState;
  onBack: (empresaId: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const apoderado = state.apoderados.find((item) => item.id === apoderadoId);
  const empresa = state.empresas.find((item) => item.id === apoderado?.empresaId);
  const vigencia = state.vigencias.find((item) => item.id === apoderado?.vigenciaId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Apoderado | undefined>(apoderado);

  if (!apoderado || !empresa || !vigencia || !draft) return <StatusPanel text="No se encontró la ficha del apoderado." />;

  async function saveApoderado() {
    await db.apoderados.put({
      ...draft!,
      editadoPorUsuario: Array.from(new Set([...(draft!.editadoPorUsuario ?? []), 'ficha']))
    });
    setEditing(false);
    await onRefresh();
  }

  return (
    <section className="space-y-6">
      <Toolbar onBack={() => onBack(empresa.id)} title={apoderado.nombreApoderado}>
        <button className="primary-button" onClick={() => (editing ? void saveApoderado() : setEditing(true))}>
          {editing ? <Save size={18} /> : <Pencil size={18} />}
          {editing ? 'Guardar cambios' : 'Editar ficha'}
        </button>
      </Toolbar>

      <section className="grid gap-4 md:grid-cols-4">
        <Info label="Empresa" value={empresa.nombreEmpresa} />
        <Info label="DNI" value={apoderado.dniApoderado || 'No detectado'} />
        <Info label="Representación" value={apoderado.tipoRepresentacion} />
        <Info label="Partida registral" value={empresa.partidaRegistral} />
      </section>

      <section className="section-band">
        <div className="section-heading">
          <h2>Respaldo registral</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Info label="Fecha de expedición" value={vigencia.fechaExpedicion || 'Revisión manual'} />
          <Info label="Estado" value={statusLabel(vigencia.estadoAlerta)} />
          <Info label="Publicidad SUNARP" value={vigencia.numeroPublicidad || 'No detectado'} />
        </div>
        {apoderado.tipoRepresentacion === 'mancomunada' && (
          <p className="mt-4 border-l-4 border-sunarp-yellow bg-yellow-50 p-3 text-sm text-yellow-950">
            Requiere actuación conjunta{apoderado.coApoderado ? ` con ${apoderado.coApoderado}` : ''}.
          </p>
        )}
      </section>

      <EditableApoderado draft={draft} setDraft={setDraft} editing={editing} />
    </section>
  );
}

function EditableApoderado({
  draft,
  setDraft,
  editing
}: {
  draft: Apoderado;
  setDraft: (value: Apoderado) => void;
  editing: boolean;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <ListEditor
        title="Facultades"
        items={draft.facultades}
        confidence={draft.confianza.facultades}
        editing={editing}
        onChange={(items) => setDraft({ ...draft, facultades: items })}
      />
      <ListEditor
        title="Limitaciones y condiciones"
        items={draft.limitaciones}
        confidence={draft.confianza.limitaciones}
        editing={editing}
        onChange={(items) => setDraft({ ...draft, limitaciones: items })}
      />
      <ListEditor
        title="Actos sin facultad"
        items={draft.actosSinFacultad ?? []}
        confidence="medio"
        editing={editing}
        onChange={(items) => setDraft({ ...draft, actosSinFacultad: items })}
      />
      <section className="section-band">
        <div className="section-heading">
          <h2>Observaciones</h2>
        </div>
        {editing ? (
          <textarea
            className="input min-h-40"
            value={draft.observaciones ?? ''}
            onChange={(event) => setDraft({ ...draft, observaciones: event.target.value })}
          />
        ) : (
          <p className="text-slate-700">{draft.observaciones || 'Sin observaciones.'}</p>
        )}
      </section>
    </section>
  );
}

function UploadView({
  empresaId,
  state,
  onBack,
  onSaved
}: {
  empresaId: string;
  state: AppState;
  onBack: () => void;
  onSaved: () => Promise<void>;
}) {
  const empresa = state.empresas.find((item) => item.id === empresaId);
  const [progress, setProgress] = useState('Esperando archivo PDF');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedCertificate | null>(null);
  const [saving, setSaving] = useState(false);

  if (!empresa) return <StatusPanel text="Empresa no encontrada para la carga." />;

  async function handleFile(nextFile: File) {
    setFile(nextFile);
    setText('');
    setParsed(null);
    setProgress('Preparando lectura del PDF...');

    try {
      const extracted = await extractPdfText(nextFile, setProgress);
      if (!extracted.trim()) {
        setProgress('El PDF cargó, pero no se detectó texto utilizable. Puede requerir OCR adicional o estar protegido.');
        return;
      }

      setText(extracted);
      setProgress('Aplicando reglas de extracción registral...');
      setParsed(parseCertificateText(extracted));
      setProgress('Extracción terminada. Revisa la información detectada.');
    } catch (error) {
      console.error(error);
      setProgress('No se pudo leer el PDF. Verifica que el archivo no esté dañado o protegido.');
    }
  }

  async function save() {
    if (!file || !parsed) return;
    setSaving(true);
    const vigenciaId = crypto.randomUUID();
    const vigencia: VigenciaPoder = {
      id: vigenciaId,
      empresaId,
      archivoNombre: file.name,
      archivoPDF: file,
      fechaExpedicion: parsed.fechaExpedicion,
      fechaSubida: Date.now(),
      numeroPublicidad: parsed.numeroPublicidad,
      alertaEnviada: false,
      estadoAlerta: calculateAlertState(parsed.fechaExpedicion),
      textoExtraido: text,
      requiereRevisionManual: parsed.requiereRevisionManual
    };

    await db.transaction('rw', db.vigencias, db.apoderados, async () => {
      await db.vigencias.add(vigencia);
      await db.apoderados.bulkAdd(
        parsed.apoderados.map((item) => ({
          id: crypto.randomUUID(),
          vigenciaId,
          empresaId,
          nombreApoderado: item.nombreApoderado,
          dniApoderado: item.dniApoderado,
          tipoPoder: item.tipoPoder,
          tipoRepresentacion: item.tipoRepresentacion,
          coApoderado: item.coApoderado,
          facultades: item.facultades,
          limitaciones: item.limitaciones,
          actosSinFacultad: item.actosSinFacultad,
          observaciones: '',
          confianza: item.confianza
        }))
      );
    });
    setSaving(false);
    await onSaved();
  }

  return (
    <section className="space-y-6">
      <Toolbar onBack={onBack} title={`Subir vigencia · ${empresa.nombreEmpresa}`} />
      <label className="upload-zone">
        <Upload size={28} />
        <span className="font-semibold">Seleccionar certificado PDF SUNARP</span>
        <span className="text-sm text-slate-600">{progress}</span>
        <input className="sr-only" type="file" accept="application/pdf" onChange={(event) => event.target.files?.[0] && void handleFile(event.target.files[0])} />
      </label>

      {parsed && (
        <section className="space-y-6">
          <section className="section-band">
            <div className="section-heading">
              <h2>Datos del certificado</h2>
              {parsed.requiereRevisionManual && <span className="pill warning">Revisión manual</span>}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <EditableField
                label="Fecha de expedición"
                value={parsed.fechaExpedicion ?? ''}
                confidence={parsed.confianza.fechaExpedicion}
                onChange={(value) => setParsed({ ...parsed, fechaExpedicion: value || undefined })}
              />
              <EditableField
                label="Número de publicidad"
                value={parsed.numeroPublicidad ?? ''}
                confidence={parsed.confianza.numeroPublicidad}
                onChange={(value) => setParsed({ ...parsed, numeroPublicidad: value || undefined })}
              />
              <EditableField
                label="Partida detectada"
                value={parsed.partidaRegistral ?? empresa.partidaRegistral ?? ''}
                confidence={parsed.confianza.partidaRegistral}
                onChange={() => undefined}
              />
            </div>
          </section>

          <section className="section-band">
            <div className="section-heading">
              <h2>Apoderados detectados</h2>
            </div>
            <div className="grid gap-4">
              {parsed.apoderados.map((apoderado, index) => (
                <div key={`${apoderado.nombreApoderado}-${index}`} className="review-block">
                  <EditableField
                    label="Nombre del apoderado"
                    value={apoderado.nombreApoderado}
                    confidence={apoderado.confianza.nombreApoderado}
                    onChange={(value) => updateParsedApoderado(parsed, setParsed, index, { nombreApoderado: value })}
                  />
                  <EditableField
                    label="DNI"
                    value={apoderado.dniApoderado ?? ''}
                    confidence={apoderado.confianza.dniApoderado}
                    onChange={(value) => updateParsedApoderado(parsed, setParsed, index, { dniApoderado: value })}
                  />
                  <ListEditor
                    title="Facultades"
                    items={apoderado.facultades}
                    confidence={apoderado.confianza.facultades}
                    editing
                    onChange={(facultades) => updateParsedApoderado(parsed, setParsed, index, { facultades })}
                  />
                </div>
              ))}
              {parsed.apoderados.length === 0 && <StatusPanel text="No se detectaron apoderados. Agrega la información manualmente después de guardar." />}
            </div>
          </section>

          <section className="section-band">
            <div className="section-heading">
              <h2>Texto extraído para auditoría</h2>
            </div>
            <textarea className="input min-h-48 font-mono text-xs" value={text} onChange={(event) => setText(event.target.value)} />
          </section>

          <button className="primary-button" disabled={saving} onClick={() => void save()}>
            <Check size={18} />
            {saving ? 'Guardando...' : 'Confirmar y guardar'}
          </button>
        </section>
      )}
    </section>
  );
}

function EmpresaModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    nombreEmpresa: '',
    ruc: '',
    partidaRegistral: '',
    oficinaRegistral: 'Lima',
    notas: ''
  });

  async function save() {
    if (!form.nombreEmpresa.trim() || !/^\d{11}$/.test(form.ruc)) return;
    await db.empresas.add({
      id: crypto.randomUUID(),
      nombreEmpresa: form.nombreEmpresa.trim(),
      ruc: form.ruc,
      oficinaRegistral: form.oficinaRegistral.trim() || 'Lima',
      ...(form.partidaRegistral.trim() ? { partidaRegistral: form.partidaRegistral.trim() } : {}),
      ...(form.notas.trim() ? { notas: form.notas.trim() } : {}),
      fechaCreacion: Date.now()
    });
    await onSaved();
  }

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <div className="section-heading">
          <h2>Registrar nueva empresa</h2>
          <button className="icon-button" onClick={onClose} title="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-3">
          <input className="input" placeholder="Nombre de empresa" value={form.nombreEmpresa} onChange={(event) => setForm({ ...form, nombreEmpresa: event.target.value })} />
          <input className="input" placeholder="RUC de 11 dígitos" value={form.ruc} onChange={(event) => setForm({ ...form, ruc: event.target.value.replace(/\D/g, '').slice(0, 11) })} />
          <input className="input" placeholder="Partida registral (opcional)" value={form.partidaRegistral} onChange={(event) => setForm({ ...form, partidaRegistral: event.target.value })} />
          <input className="input" placeholder="Oficina registral" value={form.oficinaRegistral} onChange={(event) => setForm({ ...form, oficinaRegistral: event.target.value })} />
          <textarea className="input min-h-24" placeholder="Notas" value={form.notas} onChange={(event) => setForm({ ...form, notas: event.target.value })} />
        </div>
        <button className="primary-button mt-4 w-full" onClick={() => void save()}>
          <Save size={18} />
          Guardar empresa
        </button>
      </section>
    </div>
  );
}

function ListEditor({
  title,
  items,
  confidence,
  editing,
  onChange
}: {
  title: string;
  items: string[];
  confidence: string;
  editing: boolean;
  onChange: (items: string[]) => void;
}) {
  const value = items.join('\n');
  return (
    <section className="section-band">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className={`confidence confidence-${confidence}`}>{confidence}</span>
      </div>
      {editing ? (
        <textarea className="input min-h-36" value={value} onChange={(event) => onChange(event.target.value.split('\n').filter(Boolean))} />
      ) : (
        <table>
          <tbody>
            {items.length ? items.map((item) => (
              <tr key={item}>
                <td>{item}</td>
              </tr>
            )) : (
              <tr>
                <td>Sin registros.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}

function EditableField({
  label,
  value,
  confidence,
  onChange
}: {
  label: string;
  value: string;
  confidence: string;
  onChange: (value: string) => void;
}) {
  const [edited, setEdited] = useState(false);
  return (
    <label className={`field ${confidence === 'bajo' ? 'field-warning' : ''}`}>
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className={`confidence confidence-${confidence}`}>{edited ? 'editado por usuario' : confidence}</span>
      </span>
      <input
        className="input"
        value={value}
        onChange={(event) => {
          setEdited(true);
          onChange(event.target.value);
        }}
      />
    </label>
  );
}

function Metric({ label, value, icon, tone = 'default' }: { label: string; value: number; icon: React.ReactNode; tone?: string }) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{icon}</span>
      <span>
        <span className="metric-number">{value}</span>
        <span className="text-sm text-slate-600">{label}</span>
      </span>
    </div>
  );
}

function Toolbar({ title, onBack, children }: { title: string; onBack: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <button className="icon-button print:hidden" onClick={onBack} title="Volver">
          <ArrowLeft size={18} />
        </button>
        <h1 className="truncate text-2xl font-bold">{title}</h1>
      </div>
      <div className="print:hidden">{children}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="info-block">
      <span>{label}</span>
      <strong>{value?.trim() || 'Sin registrar'}</strong>
    </div>
  );
}

function StatusPanel({ text }: { text: string }) {
  return (
    <div className="grid min-h-44 place-items-center border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
      <FileText className="mb-2 text-slate-400" size={28} />
      {text}
    </div>
  );
}

function buildDashboard(state: AppState, query: string) {
  const needle = query.trim().toLowerCase();
  const rows = state.empresas
    .map((empresa) => {
      const vigencias = state.vigencias.filter((vigencia) => vigencia.empresaId === empresa.id);
      const apoderados = state.apoderados.filter((apoderado) => apoderado.empresaId === empresa.id);
      const estado = rankWorst(vigencias.map((vigencia) => vigencia.estadoAlerta));
      return { empresa, vigencias, apoderados, estado };
    })
    .filter((row) => {
      if (!needle) return true;
      return [row.empresa.nombreEmpresa, row.empresa.ruc, ...row.apoderados.map((item) => item.nombreApoderado)]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });

  return {
    rows,
    proximas: state.vigencias.filter((item) => item.estadoAlerta === 'proxima').length,
    vencidas: state.vigencias.filter((item) => item.estadoAlerta === 'vencida').length
  };
}

function rankWorst(states: EstadoAlerta[]): EstadoAlerta {
  if (states.includes('vencida')) return 'vencida';
  if (states.includes('proxima')) return 'proxima';
  return 'vigente';
}

function statusClass(status: EstadoAlerta): string {
  return status === 'vencida' ? 'danger' : status === 'proxima' ? 'warning' : 'success';
}

function statusLabel(status: EstadoAlerta): string {
  return status === 'vencida' ? 'Vencida' : status === 'proxima' ? 'Próxima' : 'Vigente';
}

function openBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function updateParsedApoderado(
  parsed: ParsedCertificate,
  setParsed: (value: ParsedCertificate) => void,
  index: number,
  patch: Partial<ParsedCertificate['apoderados'][number]>
) {
  setParsed({
    ...parsed,
    apoderados: parsed.apoderados.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
  });
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
