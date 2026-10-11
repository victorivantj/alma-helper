// ==UserScript==
// @name         ALMA Helper (TrakCare)
// @namespace    https://github.com/victorivantj/alma-helper
// @version      0.17.2
// @description  [BETA, en desarrollo] Atajos y mejoras para ALMA/TrakCare: evolucionar, notas por profesión, indicaciones frecuentes y medicamentos resaltados.
// @author       Victor Tapia
// @homepageURL  https://victorivantj.github.io/alma-helper/
// @updateURL    https://victorivantj.github.io/alma-helper/alma-helper.user.js
// @downloadURL  https://victorivantj.github.io/alma-helper/alma-helper.user.js
// @match        https://alma.trakcare.cl/sscq/*
// @match        https://almatrain.trakcare.cl/sscqtrain/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const VERSION = '0.17.2';
  const PAGINA_WEB = 'https://victorivantj.github.io/alma-helper/';

  // ---------------------------------------------------------------------------
  // Configuración
  // ---------------------------------------------------------------------------
  const CONFIG = {
    // Filtros de notas por profesión (Registro Clínico → Búsqueda → Tipo de Profesional).
    //   texto: lo que se escribe en el lookup; tipos: nombres exactos a seleccionar.
    notas: {
      medicas: { titulo: 'Notas médicas', texto: 'Médico', tipos: ['Médico', 'Médico Cirujano', 'Médico Becado'] },
      enfermeria: { titulo: 'Notas de enfermería', texto: 'Enfermera', tipos: ['Enfermera (o)'] },
      kinesiologia: { titulo: 'Notas de kinesiología', texto: 'Kinesi', tipos: ['Kinesiólogo (a)'] },
      tens: { titulo: 'Notas TENS', texto: 'Técnico', tipos: ['Técnico Nivel Superior', 'Técnico Paramédico'] },
    },
    // Perfil según el "Grupo de Seguridad" del usuario (menú de su nombre, arriba a la
    // derecha). Si contiene "Médico" se muestran las funciones médicas (evolucionar,
    // barra de indicaciones…); si no, las de notas por profesión.
    perfilMedico: /m[e\u00e9]dico/i,
    // Resultados de "Búsqueda de Indicaciones" que se ocultan. Se compara sin tildes
    // ni mayúsculas contra el nombre del ítem (expresiones regulares).
    // Cuidado con raíces muy cortas: p. ej. "pedia" también calza con "ortopedia".
    ocultarEnBusquedaIndicaciones: [
      // Ambulatorio / no hospitalizado
      /^consulta/,             // consultas de especialidad / abreviadas
      /teleconsulta/,
      /telerehabilitaci/,
      /ambulatori/,
      /domicili/,              // atenciones y visitas domiciliarias
      /hodom/,                 // hospitalización domiciliaria
      /^dia cama/,             // ítems administrativos de día cama
      // Rehabilitación / educación no indicada por el médico de UPC
      /ortesis/,               // órtesis y su confección/prueba/moldes
      /^educacion/,
      /^ejercicios/,
      /^evaluacion kinesiologica:/,
      /grupal|de grupo/,       // sesiones/educación/psicoterapia grupal
      /masoterapia|yogaterapia|acupuntura/,
      /audifono/,
      /ciclo vital/,
      /psicoterapia|psicodiagnostico/,
      /medicina integrativa/,
      /controles? de salud/,   // controles de salud ciclo vital, control de salud niño
      /evaluacion (de la voz|del habla|del lenguaje)|rehabilitacion del habla|organo fono ?articulatorio/,
      /protesis (mamaria|ocular)|sosten para protesis/,
      /fototerapia|fotodinamica|laserterapia|ondas mecanicas/,
      /ovulacion|fisurado|proetz|psicomotri/,
      /programa de rehabilitacion|\bgrupo\b/,          // programas grupales mensuales
      /invalidez|medico-legal|identidad (de )?genero/, // trámites médico-legales/administrativos
      /rehabilitacion educacional|actividades recreativas/,
      /sala de estimulacion|test del sudor|amniotico/, // pediatría/obstetricia
      /vacuna bcg|\bbcg\b|papiloma/,                   // vacunas de otra edad
      /dermatoscopia|lente optico|reconstruccion mamaria/,
      // Obstetricia / ginecología
      /gine/,                  // ginecología, gineco-obstetricia
      /obstetric/,
      /\(matrona\)/,
      /\bfetal/,               // materno fetal, RM fetal, monitoreo fetal
      /\bparto\b/,             // trabajo de parto, sala de parto
      /lactan/,                // lactancia materna, régimen lactante
      // Pediatría / neonatología
      /pediatr/,               // pediatría, pediátrico (no usar "pedia": ortopedia)
      /odontopediatr|odontolog/,
      /neonat/,
      /infantil/,
      /adolescen/,
      /\bninos?\b/,            // niño(s)
      /sala cuna|incubadora/,
      /escolar/,               // régimen escolar
      /para padres/,
    ],
    // Evolucionar: tipo de entrada a crear (columna "Nuevo") y tipo de entrada
    // previa desde la que se copia el texto (la más reciente de un día anterior).
    // Sirve para cualquier unidad: "2. Evolución Cuidados Críticos Adultos", "2. Evolución
    // Medicina Interna", "Evolución Médica"… (el número inicial es opcional)
    tipoEntradaEvolucion: /^(\d+\.\s*)?evoluci/i,
    tipoEvolucionACopiar: /evoluci|ingreso/i,  // "Evolución Medicina Interna", "Ingreso Cuidados Críticos…"
    profesionalACopiar: /\(M\u00e9dico/,       // "(Médico Cirujano)", "(Médico Becado)", "(Médico)"
    // Si hay varias notas (p. ej. nota nocturna y evolución, en la misma entrada o en
    // entradas distintas), se pregunta cuál copiar entre las más recientes de otros médicos
    evolucionesAOfrecer: 4,
    // Acción que abre el editor: "Notas de Evolución" (o variantes como "Notas de Evolución
    // Médica"); si no existe, cualquier acción que mencione "Evolución"
    accionNotasEvolucion: /^notas de evoluci/i,
    accionNotasEvolucionRespaldo: /evoluci/i,
    // Indicaciones frecuentes: un menú desplegable por grupo (nombres exactos de ALMA).
    // Se busca por el nombre completo; un clic solo AGREGA a la lista de pendientes.
    indicacionesRapidas: [
      { titulo: 'Reposo', opciones: ['REPOSO ABSOLUTO', 'REPOSO RELATIVO'] },
      // Régimen: en ALMA cada combinación es un ítem distinto; se agrupan en el menú.
      { titulo: 'Régimen', grupos: [
        { grupo: 'Normal', opciones: [
          'REGIMEN CERO', 'REGIMEN HIDRICO', 'REGIMEN LIQUIDO', 'REGIMEN PAPILLA', 'REGIMEN BLANDO',
          'REGIMEN BLANDO LIVIANO', 'REGIMEN LIVIANO', 'REGIMEN COMUN',
        ] },
        { grupo: 'Hiposódico', opciones: [
          'REGIMEN HIPOSODICO', 'REGIMEN LIVIANO HIPOSODICO', 'REGIMEN BLANDO LIVIANO HIPOSODICO',
          'REGIMEN PAPILLA HIPOSODICA', 'REGIMEN HIPOCALORICO HIPOSODICO', 'REGIMEN SIN SAL',
          'REGIMEN BLANDO LIVIANO SIN SAL + 2G SAL',
        ] },
        { grupo: 'Diabético', opciones: [
          'REGIMEN DIABETICO', 'REGIMEN DIABETICO LIVIANO', 'REGIMEN PAPILLA DIABETICO',
          'REGIMEN DIABETICO HIPERPROTEICO', 'REGIMEN DIABETICO HIPOPROTEICO',
        ] },
        { grupo: 'Hiposódico + diabético', opciones: ['REGIMEN HIPOGLUCIDICO S/SAL'] },
        { grupo: 'Otros', opciones: [
          'REGIMEN HIPERCALORICO- HIPERPROTEICO', 'REGIMEN HIPOPROTEICO', 'REGIMEN RENAL',
          'REGIMEN BLANDO LIVIANO BAJO EN FOSFORO Y BAJO EN POTASIO',
        ] },
      ] },
    ],
    // Exámenes frecuentes (barra en la página de Indicaciones). Cada ítem:
    //   buscar: texto que se escribe en "Búsqueda de Indicaciones" (¡distingue tildes!)
    //   nombre: inicio exacto del nombre en los resultados (sin importar mayúsculas)
    // Un clic solo AGREGA a la lista de pendientes; nunca guarda.
    examenes: [
      { titulo: '🧪 Lab diario', items: [
        { buscar: 'hemograma', nombre: 'Hemograma' },
        { buscar: 'Proteina C Reactiva', nombre: 'Proteina C Reactiva' },
        { buscar: 'electrolitos', nombre: 'Electrolitos plasmáticos' },
        { buscar: 'creatinin', nombre: 'Creatinina, en sangre' },
        { buscar: 'urea', nombre: '(UREA) Nitrógeno ureico' },
      ] },
      { titulo: '🫀 Coronario', items: [
        { buscar: 'troponina', nombre: 'Troponina' },
        { buscar: 'creatinquinasa', nombre: 'Creatinquinasa CK - total' },
        { buscar: 'creatinquinasa', nombre: 'Creatinquinasa CK - MB' },
      ] },
    ],
    // Botón "⏰ 6 AM": hora a la que se programan los exámenes (si ya pasó hoy, mañana)
    horaExamenes: 6,
    // Resto de exámenes: menú "Otros exámenes ▾" agrupado
    otrosExamenes: [
      { grupo: 'Hematología', items: [
        { titulo: 'Hemograma', buscar: 'hemograma', nombre: 'Hemograma' },
        { titulo: 'TP/INR', buscar: 'protrombina', nombre: 'Tiempo de protrombina' },
        { titulo: 'TTPA', buscar: 'tromboplastina', nombre: 'Tromboplastina, tiempo parcial' },
      ] },
      { grupo: 'Bioquímica', items: [
        { titulo: 'PCR', buscar: 'Proteina C Reactiva', nombre: 'Proteina C Reactiva' },
        { titulo: 'Perfil bioquímico', buscar: 'perfil bioq', nombre: 'Perfil Bioquímico' },
        { titulo: 'Perfil renal', buscar: 'perfil renal', nombre: 'PERFIL RENAL' },
        { titulo: 'Perfil hepático', buscar: 'perfil hepático', nombre: 'Perfil Hepático' },
        { titulo: 'Perfil lipídico', buscar: 'colesterol', nombre: 'Perfil lipídico' },
      ] },
      { grupo: 'Endocrino', items: [
        { titulo: 'HbA1c', buscar: 'hemoglobina glic', nombre: 'Hemoglobina glicada A1c' },
        { titulo: 'TSH', buscar: 'tsh', nombre: 'Tiroestimulante (TSH)' },
      ] },
      { grupo: 'Gases', items: [
        { titulo: 'Gases arteriales (incluye lactato)', buscar: 'gases', nombre: 'Gases arteriales' },
      ] },
    ],
    // Fármacos: menú "Fármacos ▾" agrupado. `producto` es la presentación exacta en ALMA
    // (columna 2 del buscador). Se agregan con los valores por defecto de ALMA (1 unidad,
    // UNA VEZ, por 1 día): ajustar dosis/frecuencia en la lista antes de guardar.
    farmacos: [
      { grupo: 'Antiagregantes', items: [
        { titulo: 'AAS 100 mg', buscar: 'acido acetil', producto: 'ACIDO ACETILSALICILICO COMPRIMIDO 100 MG' },
        { titulo: 'Clopidogrel 75 mg', buscar: 'clopidogrel', producto: 'CLOPIDOGREL COMPRIMIDO RECUBIERTO 75 MG' },
      ] },
      { grupo: 'Estatinas', items: [
        { titulo: 'Atorvastatina 20 mg', buscar: 'atorvastatina', producto: 'ATORVASTATINA COMPRIMIDO 20 MG' },
      ] },
      { grupo: 'Betabloqueadores', items: [
        { titulo: 'Bisoprolol 2,5 mg', buscar: 'bisoprolol', producto: 'BISOPROLOL FUMARATO CM RECUBIERTOS 2,5 MG' },
        { titulo: 'Carvedilol 6,25 mg', buscar: 'carvedilol', producto: 'CARVEDILOL 6.25 MG X COMP' },
      ] },
      { grupo: 'Anticoagulación', items: [
        { titulo: 'Enoxaparina 40 mg', buscar: 'enoxaparina', producto: 'ENOXAPARINA JERINGE PRE-LLENADA 40 MG/0.4 ML' },
        { titulo: 'Enoxaparina 60 mg', buscar: 'enoxaparina', producto: 'ENOXAPARINA JERINGA PRE-LLENADA 60 MG/0.6 ML' },
        { titulo: 'Enoxaparina 80 mg', buscar: 'enoxaparina', producto: 'ENOXAPARINA JERINGA PRE-LLENADA 80 MG/0.8 ML' },
        // `via`: para ítems sin "+" directo, la vía a elegir en el submenú (texto exacto)
        { titulo: 'Heparina 25.000 UI + SF 250 (BIC)', buscar: 'heparina',
          nombre: 'HEPARINA 25.000 UI + S. FISIOLOGICA 0,9% VT 250 ML - BSFP', via: 'INTRAVENOSA - Infusi\u00f3n Continua' },
      ] },
      { grupo: 'Analgesia', items: [
        { titulo: 'Paracetamol 500 mg', buscar: 'paracetamol', producto: 'PARACETAMOL COMPRIMIDO 500 MG' },
      ] },
    ],
    atajos: {
      notasMedicas: { alt: true, key: 'n' },
      notasEnfermeria: { alt: true, key: '1' },
      notasKinesiologia: { alt: true, key: '2' },
      notasTens: { alt: true, key: '3' },
      evolucion: { alt: true, key: 'e' },
      cerrarEvolucion: { alt: true, key: 'b' },
      indicaciones: { alt: true, key: 'i' },
      medicamentos: { alt: true, key: 'm' },
      ocultarTerminados: { alt: true, key: 't' },
      togglePanel: { alt: true, key: 'a' },
    },
  };

  // ---------------------------------------------------------------------------
  // IDs / selectores de ALMA (TrakCare)
  // ---------------------------------------------------------------------------
  const SEL = {
    bed: 'div.floorplanBed',
    bedActionBtn: (bedId) => `#${bedId}-patient-header-actionButton`,
    bannerActionBtn: '#PAPerson_Banner-row-0-misc-actionButton',
    panelBusqueda: '#epr_UPR_Composite_0-item-FunctionsPanel-menu-system-find',
    findButton: '#MREncEntry_FindList_0-button-find1',
    tipoProfInput: '#MREncEntry_FindList_0-item-CareProviderTypeListbox',
    tipoProfPrefix: 'MREncEntry_FindList_0-item-CareProviderTypeListbox',
    opcionesBusquedaToggle: '#MREncEntry_FindList_0-section-0-toggle',
    panelRCE: '#epr_UPR_Composite_0-item-FunctionsPanel-menu-upr-chartbook',
    panelNuevo: '#epr_UPR_Composite_0-item-FunctionsPanel-menu-upr-entry-add',
    panelActual: '#epr_UPR_Composite_0-item-FunctionsPanel-menu-upr-entry-current',
    usuarioActual: '#tc_NavBar-misc-profileToggle', // nombre del usuario (respaldo)
    grupoSeguridad: '#tc_NavBar-profilePanel-securityGroup', // p. ej. "CLXX.IP.Médico Cuidados Críticos"
    episodioPaciente: '[id$="-item-BANNERPAADMADMNo"]', // N° de episodio del banner
    limpiarBusqueda: '#MREncEntry_FindList_0-button-ClearAllFields',
    fechaDesde: '#MREncEntry_FindList_0-item-DateFrom',
    fechaHasta: '#MREncEntry_FindList_0-item-DateTo',
    palabraClave: '#MREncEntry_FindList_0-item-EntrySearch',
    entradaExpandir: '[id$="-item-EntryComponent"]', // aria-expanded="true|false"
    entradaItems: 'tr[id^="MREncEntryItem_ListEncounter_"]',
    // Lista de entradas (Búsqueda) y su contenido expandido
    entradaRow: 'tr[id^="MREncEntry_ListEncounter_0-row-"]',
    entradaTexto: '[id$="-item-TextRepresentation"]',
    entradaToggle: '[ng-click*="toggleNestedComponent"]',
    entradaCandado: '[id$="-item-lockUnlock-image"]', // md-svg-icon: system-unlock / system-lock
    notaHtml: '[id$="-item-HTMLTextRep-customItem"] > div.clsMREncEntryItemText > div.cssReset',
    // Columna "Nuevo": tipos de entrada y acciones
    tipoEntradaRow: 'tr[id^="MREncEntryType_List_0-row-"]',
    tipoEntradaNuevo: '[id$="-item-newEntry-link"]',
    accionLink: '[id^="MREncEntryActions_List_0-row-"][id$="-item-Desc-link"]',
    editorNotas: 'NOTNotesHTMLRichText', // instancia CKEditor
    chartMenuCaption: '[id^="tc_Chart-menu-"][id$="-caption"]',
    chartMenuSeleccionado: '.chartMenuItem.chartMenuSelected',
    // Filas de las listas de indicaciones (Medicamentos - Atención Actual / Todas las Atenciones)
    ordenRow: 'tr[id^="OEOrdItem_ListEMR_"]',
    ordenTexto: '[id$="-item-TextRepresentation"]',
    ordenNombre: '[id$="-item-OrderName-link"]',
    ordenFecha: '[id$="-item-DateOrdered"]', // fecha y hora de solicitud
    ordenHora: '[id$="-item-TimeOrdered"]',
    ordenLinea: '[id$="-item-OrderLine-customItem"]', // dosis, vía y frecuencia
    ordenActualRow: 'tr[id^="OEOrdItem_ListEMR_0-row-"]', // primera tabla: Atención Actual
    ordenFarmacia: '[id$="-item-PharmacyStatus"]',
    // Resultados de "Búsqueda de Indicaciones"
    indicResultados: 'table[id^="tOEOrder_EntryPortal_ListLookup_"]',
    indicRow: 'tr[id^="OEOrder_EntryPortal_ListLookup_"][id*="-row-"]',
    indicNombre: '[id$="-item-desc1-customItem"]',
    indicBuscar: '#OEOrder_EntryPortal_Find_0-item-ItemSearch',
    indicAgregar: '[id$="-item-addItem-link"]',
    indicProducto: '[id$="-item-desc2-customItem"]', // fármacos: presentación exacta
    indicVias: '[id$="-item-drillSequential-link"]', // flecha › (elegir vía)
    pendienteRow: 'tr[id^="OEOrder_Entry_List_0-row-"]', // lista de indicaciones por guardar
    inicioFecha: '#OEOrder_Entry_0-item-OEORISttDat', // "Fecha de Inicio" para lo que se agregue
    inicioHora: '#OEOrder_Entry_0-item-OEORISttTim',
    bannerNombre: '#PAPerson_Banner-row-0-item-BANNERName2',
  };

  // Opciones del menú ••• del paciente (id = sufijo de tc_ActionMenu-menu-<id>)
  const MENU = {
    registroClinico: { id: 'CLXX.CF.EncRec', texto: 'Registro Clínico' },
    indicaciones: { id: 'CHILE.FDT.Order', texto: 'Indicaciones' },
  };

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function isVisible(el) {
    return !!el && el.getClientRects().length > 0;
  }

  async function waitFor(fn, { timeout = 8000, interval = 150 } = {}) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const v = typeof fn === 'string' ? document.querySelector(fn) : fn();
      if (v) return v;
      await sleep(interval);
    }
    return null;
  }

  function findByText(selector, text) {
    return [...document.querySelectorAll(selector)].find(
      (e) => isVisible(e) && e.textContent.trim() === text
    );
  }

  let toastTimer;
  function toast(msg, isError = false, ms = 3000) {
    let t = document.getElementById('almah-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'almah-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.toggle('almah-error', isError);
    t.classList.add('almah-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('almah-show'), ms);
  }

  // Evita ejecutar dos flujos a la vez (doble clic, atajo repetido)
  let busy = false;
  const TIEMPO_MAXIMO = 150000; // ms: si una acción se cuelga, se libera el script
  async function run(name, fn) {
    if (busy) return;
    busy = true;
    let reloj;
    try {
      await Promise.race([
        fn(),
        new Promise((_, rechazar) => {
          reloj = setTimeout(() => rechazar(new Error('se agotó el tiempo de espera; intente de nuevo')), TIEMPO_MAXIMO);
        }),
      ]);
    } catch (e) {
      console.error('[ALMA Helper]', name, e);
      toast(`${name}: ${e.message}`, true);
    } finally {
      clearTimeout(reloj);
      busy = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Flujos
  // ---------------------------------------------------------------------------

  // Abre el menú ••• (de una cama del mapa, o del banner del paciente) y elige una opción
  async function abrirMenuPaciente(actionBtn, opcion) {
    actionBtn = actionBtn || document.querySelector(SEL.bannerActionBtn);
    if (!actionBtn) throw new Error('abra primero un paciente');
    actionBtn.click();
    const item = await waitFor(
      () =>
        document.querySelector(`[id="tc_ActionMenu-menu-${opcion.id}"]`) ||
        findByText('[id^="tc_ActionMenu-menu-"][id$="-label"]', opcion.texto)
    );
    if (!item) throw new Error(`no apareció "${opcion.texto}" en el menú`);
    item.click();
  }

  async function abrirRegistroClinico(actionBtn) {
    if (document.querySelector(SEL.panelBusqueda)) return; // ya estamos en Registro Clínico
    await abrirMenuPaciente(actionBtn, MENU.registroClinico);
    if (!(await waitFor(SEL.panelBusqueda, { timeout: 15000 })))
      throw new Error('no cargó Registro Clínico');
  }

  // Pantalla de Indicaciones (fármacos, reposo, régimen, evaluaciones, IC, exámenes)
  async function indicaciones(actionBtn) {
    if (location.hash.includes('OEOrder.EntryPortal')) return;
    await abrirMenuPaciente(actionBtn, MENU.indicaciones);
    if (!(await waitFor(() => location.hash.includes('OEOrder.EntryPortal'), { timeout: 15000 })))
      throw new Error('no cargó Indicaciones');
  }

  async function abrirBusqueda() {
    if (document.querySelector(SEL.findButton)) return;
    document.querySelector(SEL.panelBusqueda).click();
    if (!(await waitFor(SEL.findButton, { timeout: 10000 })))
      throw new Error('no cargó el panel Búsqueda');
  }

  function chipsTipoProf() {
    return [...document.querySelectorAll(`#${SEL.tipoProfPrefix}-chips md-chip`)].map((c) =>
      c.textContent.replace(/\s+/g, ' ').trim()
    );
  }

  // El lookup no busca mientras "Opciones de Búsqueda" está colapsado
  async function expandirOpcionesBusqueda() {
    const inp = document.querySelector(SEL.tipoProfInput);
    if (isVisible(inp)) return;
    document.querySelector(SEL.opcionesBusquedaToggle).click();
    if (!(await waitFor(() => isVisible(inp), { timeout: 3000 })))
      throw new Error('no se pudo abrir "Opciones de Búsqueda"');
  }

  // Quita chips de Tipo de Profesional que no son del filtro (p. ej. "M" autoseleccionado)
  async function quitarChipsAjenos(filtro) {
    for (let i = 0; i < 10; i++) {
      const chip = [...document.querySelectorAll(`#${SEL.tipoProfPrefix}-chips md-chip`)].find(
        (c) => !filtro.tipos.includes(c.textContent.replace(/\s+/g, ' ').trim())
      );
      if (!chip) return;
      const remove = chip.querySelector('button[id$="-remove"]');
      if (!remove) break;
      remove.click();
      await sleep(200);
    }
    throw new Error('no se pudieron quitar los filtros de Tipo de Profesional');
  }

  // Deja la Búsqueda sin filtros (tipos de profesional, fechas, palabra clave) y
  // vuelve a buscar, para revisar la lista completa del paciente.
  async function limpiarFiltrosBusqueda() {
    const valor = (sel) => document.querySelector(sel)?.value?.trim();
    if (!chipsTipoProf().length && !valor(SEL.fechaDesde) && !valor(SEL.fechaHasta) && !valor(SEL.palabraClave)) return;
    toast('Quitando filtros de la Búsqueda…');
    document.querySelector(SEL.limpiarBusqueda)?.click();
    await waitFor(() => !chipsTipoProf().length, { timeout: 5000 });
    const primera = filasEntradas()[0];
    document.querySelector(SEL.findButton).click();
    await waitFor(() => filasEntradas()[0] !== primera, { timeout: 10000 });
    await sleep(800);
    if (!(await waitFor(() => filasEntradas().length, { timeout: 15000 })))
      throw new Error('no cargó la lista de registros');
  }

  // Escribe en el lookup y elige la fila "nombre". El lookup a veces ignora una
  // búsqueda hecha justo después de otra selección, así que se reintenta.
  async function agregarTipoProf(nombre, texto) {
    const inp = document.querySelector(SEL.tipoProfInput);
    for (let intento = 0; intento < 3; intento++) {
      inp.value = '';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(300);
      inp.focus();
      inp.value = texto;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      const row = await waitFor(
        () =>
          [...document.querySelectorAll(`[id^="${SEL.tipoProfPrefix}-lookupRow-"][id$="-value-Description"]`)]
            .find((s) => s.textContent.trim() === nombre)
            ?.closest('[role=option], tr'),
        { timeout: 2500 }
      );
      if (!row) continue;
      row.click();
      if (await waitFor(() => chipsTipoProf().includes(nombre), { timeout: 3000 })) {
        await sleep(400);
        return;
      }
    }
    throw new Error(`no se pudo seleccionar el tipo "${nombre}"`);
  }

  async function aplicarFiltroProfesional(filtro) {
    await expandirOpcionesBusqueda();
    await quitarChipsAjenos(filtro);
    for (const tipo of filtro.tipos) {
      if (!chipsTipoProf().includes(tipo)) await agregarTipoProf(tipo, filtro.texto);
    }
    document.querySelector(SEL.findButton).click();
  }
  const aplicarFiltroMedico = () => aplicarFiltroProfesional(CONFIG.notas.medicas);

  // Registro Clínico → Búsqueda filtrada por profesión (CONFIG.notas.*)
  async function notasDe(clave, actionBtn) {
    const filtro = CONFIG.notas[clave];
    toast(`Abriendo ${filtro.titulo.toLowerCase()}…`);
    await abrirRegistroClinico(actionBtn);
    await abrirBusqueda();
    await aplicarFiltroProfesional(filtro);
    toast(`${filtro.titulo} filtradas ✔`);
  }
  const notasMedicas = (actionBtn) => notasDe('medicas', actionBtn);

  // ---------------------------------------------------------------------------
  // Perfil del usuario (Grupo de Seguridad): médico u otro profesional
  // ---------------------------------------------------------------------------
  // Se lee primero el grupo que muestra el menú de perfil (lo que ve el usuario); los datos
  // de la sesión pueden quedar con el grupo de quien usó antes la pestaña. Sin dato
  // (p. ej. pantalla de login) se asume médico, el comportamiento original.
  const grupoSeguridad = () =>
    document.querySelector(SEL.grupoSeguridad)?.textContent.trim() || window.sessionData?.logonData?.groupDesc || '';
  function perfilActual() {
    const grupo = grupoSeguridad();
    return !grupo || CONFIG.perfilMedico.test(grupo) ? 'medico' : 'otro';
  }
  const esMedico = () => perfilActual() === 'medico';

  // Nombre del usuario conectado (en mayúsculas); error si no se puede leer
  function usuarioConectado() {
    const nombre = window.sessionData?.logonData?.userName || document.querySelector(SEL.usuarioActual)?.textContent;
    if (!nombre?.trim()) throw new Error('no se pudo identificar al usuario conectado');
    return nombre.trim().toUpperCase();
  }

  // N° de episodio del paciente abierto (null si no hay banner, p. ej. en el mapa)
  const episodioActual = () => document.querySelector(SEL.episodioPaciente)?.textContent.trim() || null;

  // Registro Clínico → RCE → Medicamentos
  async function medicamentos(actionBtn) {
    const capMedicamentos = () =>
      [...document.querySelectorAll(SEL.chartMenuCaption)].find((c) => c.textContent.trim() === 'Medicamentos');
    if (!capMedicamentos()) {
      await abrirRegistroClinico(actionBtn);
      document.querySelector(SEL.panelRCE).click();
    }
    const cap = await waitFor(capMedicamentos, { timeout: 15000 });
    if (!cap) throw new Error('no apareció "Medicamentos" en el RCE');
    cap.parentElement.click();
  }

  // ---------------------------------------------------------------------------
  // Evolucionar: copia la evolución más reciente de otro médico
  // ---------------------------------------------------------------------------
  const filasEntradas = () =>
    [...document.querySelectorAll(SEL.entradaRow)].filter((r) => /-row-\d+$/.test(r.id));

  // En la lista, las entradas de hoy muestran la hora ("17:52 …") y las de días
  // anteriores la fecha ("09/10/2026 …").
  // Primero busca en la lista tal como se abre (rápido). Si en esa página no hay una
  // evolución médica anterior, aplica el filtro de médicos y vuelve a buscar.
  // Devuelve { propiaHoy } si el usuario ya guardó su evolución de hoy (no hay que
  // copiar nada), o { previa } con la evolución médica a copiar.
  async function buscarEvolucionAnterior() {
    await abrirRegistroClinico();
    await abrirBusqueda();
    if (!(await waitFor(() => filasEntradas().length, { timeout: 15000 })))
      throw new Error('no cargó la lista de registros');
    await limpiarFiltrosBusqueda();
    const res = await analizarListaEvoluciones();
    if (res.propiaHoy || res.candidatas.length) return res;

    toast('No está en la primera página: filtrando por médicos…');
    await aplicarFiltroMedico();
    await sleep(1500);
    await waitFor(() => filasEntradas().length, { timeout: 15000 });
    const filtrada = await analizarListaEvoluciones();
    if (filtrada.propiaHoy || filtrada.candidatas.length) return filtrada;
    throw new Error('no se encontró una evolución médica anterior');
  }

  // Expande la fila (si hace falta) y devuelve el bloque con el texto de la nota
  // Si la entrada ya está expandida no se vuelve a hacer clic (la contraería). Si al
  // cargar solo trae ítems sin nota (p. ej. indicaciones), se devuelve null de inmediato.
  // Una entrada puede tener varias notas (evolución + notas agregadas): ver notasDeFila.
  async function notaDeFila(row) {
    const anidada = row.nextElementSibling;
    const expandida = row.querySelector(SEL.entradaExpandir)?.getAttribute('aria-expanded') === 'true';
    if (!expandida && !anidada?.querySelector(SEL.notaHtml)) row.querySelector(SEL.entradaToggle)?.click();
    const r = await waitFor(
      () => anidada?.querySelector(SEL.notaHtml) || (anidada?.querySelector(SEL.entradaItems) ? 'sin-nota' : null),
      { timeout: 8000 }
    );
    if (r === 'sin-nota') {
      await sleep(300); // por si la nota se dibuja justo después de las indicaciones
      const nota = anidada.querySelector(SEL.notaHtml);
      return nota && nota.textContent.trim() ? nota : null;
    }
    return r && r.textContent.trim() ? r : null;
  }

  // Todas las notas con texto de la entrada, en el orden en que ALMA las muestra
  async function notasDeFila(row) {
    if (!(await notaDeFila(row))) return [];
    return [...row.nextElementSibling.querySelectorAll(SEL.notaHtml)].filter((n) => n.textContent.trim());
  }

  // Devuelve { propiaHoy } si ya guardaste tu evolución de hoy, o { candidatas }: las
  // notas más recientes de otros médicos (la primera es la más nueva). También
  // `tipoHoy`: el tipo de tu entrada más reciente de hoy (de cualquier tipo), para saber
  // qué hay en el panel "Actual".
  async function analizarListaEvoluciones() {
    const yo = usuarioConectado();
    let tipoHoy = null;
    const candidatas = [];
    for (const row of filasEntradas()) {
      if (candidatas.length >= CONFIG.evolucionesAOfrecer) break; // se completa la entrada en curso
      const texto = row.querySelector(SEL.entradaTexto)?.textContent.replace(/\s+/g, ' ').trim() || '';
      const tipo = texto.split(') -').pop().trim();
      if (!tipoHoy && /^\d{2}:\d{2}\b/.test(texto) && texto.toUpperCase().includes(yo)) tipoHoy = tipo;
      if (!CONFIG.profesionalACopiar.test(texto) || !CONFIG.tipoEvolucionACopiar.test(tipo)) continue;
      const hora = texto.match(/^(\d{2}:\d{2})\b/)?.[1];
      const fecha = texto.match(/^(\d{2}\/\d{2}\/\d{4})/)?.[1];
      if (!hora && !fecha) continue;
      const propia = !!hora && texto.toUpperCase().includes(yo);
      const nota = await notaDeFila(row);
      if (propia) {
        // Evolución propia de hoy: si ya tiene nota guardada no se copia nada;
        // si está vacía se sigue buscando la de otro médico.
        if (nota) return { propiaHoy: { hora, nota }, tipoHoy, candidatas };
        continue;
      }
      // De otro médico, aunque sea de hoy (p. ej. turno de noche). Cada nota de la
      // entrada es una opción: la evolución y las notas agregadas (evento, nocturna).
      if (nota) {
        const notas = await notasDeFila(row);
        notas.forEach((n, i) => candidatas.push({
          html: n.innerHTML,
          fecha: hora ? `hoy ${hora}` : fecha,
          autor: texto.replace(hora || fecha, '').split('(')[0].trim(),
          extracto: n.textContent.replace(/\s+/g, ' ').trim().slice(0, 80),
          largo: n.textContent.trim().length,
          posicion: notas.length > 1 ? `nota ${i + 1} de ${notas.length}` : '',
        }));
      }
    }
    return { tipoHoy, candidatas };
  }

  const escaparHtml = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // Con una sola candidata la usa; con varias pregunta cuál copiar (null = cancelado)
  async function elegirEvolucion(candidatas) {
    if (candidatas.length === 1) return candidatas[0];
    const valor = await preguntar('Hay varias notas médicas recientes (la hora es la de la entrada). ¿Cuál copiar?',
      candidatas.map((c, i) => ({
        valor: i,
        texto: `<b>${escaparHtml(c.fecha)}</b> · ${escaparHtml(c.autor)}` +
          `${c.posicion ? ` · ${c.posicion}` : ''} · ${c.largo.toLocaleString('es-CL')} caracteres` +
          `<br><small>${escaparHtml(c.extracto)}…</small>`,
        tecla: String(i + 1),
      })));
    return valor == null ? null : candidatas[valor];
  }

  // Si ya existe la entrada de hoy, el panel "Actual" está habilitado y muestra sus
  // acciones; si no, "Actual" está deshabilitado y hay que crearla desde "Nuevo".
  const hayEntradaActual = () =>
    document.querySelector(SEL.panelActual)?.getAttribute('aria-disabled') === 'false';

  async function abrirNotaEvolucion({ nueva = false } = {}) {
    if (hayEntradaActual() && !nueva) {
      toast('Abriendo la evolución de hoy…', false, 30000);
      document.querySelector(SEL.panelActual).click();
    } else {
      toast('Creando la evolución nueva (puede tardar ~25 s)…', false, 30000);
      document.querySelector(SEL.panelNuevo).click();
      const fila = await waitFor(
        () =>
          [...document.querySelectorAll(SEL.tipoEntradaRow)].find(
            (r) => /-row-\d+$/.test(r.id) && CONFIG.tipoEntradaEvolucion.test(r.textContent.trim())
          ),
        { timeout: 10000 }
      );
      if (!fila) throw new Error('no apareció el tipo de entrada "Evolución" en Nuevo');
      fila.querySelector(SEL.tipoEntradaNuevo).click();
    }
    const accion = await waitFor(
      () => {
        const acciones = [...document.querySelectorAll(SEL.accionLink)].filter(isVisible);
        const texto = (a) => a.textContent.trim();
        return acciones.find((a) => CONFIG.accionNotasEvolucion.test(texto(a))) ||
          acciones.find((a) => CONFIG.accionNotasEvolucionRespaldo.test(texto(a)));
      },
      { timeout: 45000 } // crear la entrada tarda ~10 s
    );
    if (!accion) throw new Error('no apareció la acción "Notas de Evolución"');
    const anterior = editorNotasVisible(); // puede quedar uno de una pantalla previa
    accion.click();
    const editor = await waitFor(() => {
      const e = editorNotasVisible();
      return e && e !== anterior ? e : null;
    }, { timeout: 45000 }); // el editor puede tardar ~15 s más
    if (!editor) throw new Error('no se abrió el editor de la nota');
    await sleep(1500); // ALMA carga su valor inicial en el editor (setEditorDataOnLoad)
    return editorNotasVisible() || editor;
  }

  // Instancia CKEditor de "Notas" lista y visible en pantalla
  function editorNotasVisible() {
    const insts = Object.values(window.CKEDITOR?.instances || {});
    return insts
      .filter((e) => e.status === 'ready' && isVisible(e.container?.$))
      .sort((a, b) => (a.name === SEL.editorNotas ? -1 : 0) - (b.name === SEL.editorNotas ? -1 : 0))[0] || null;
  }

  // El editor "vacío" de ALMA contiene '&#160;': se ignoran etiquetas y entidades.
  const textoEditor = (e) => e.getData().replace(/<[^>]*>|&[#a-z0-9]+;/gi, '').trim();

  // setData es asíncrono; además se avisa a ALMA del cambio ('change' + updateElement)
  // para que el texto quede en el modelo y se guarde.
  async function escribirEnEditor(html) {
    for (let intento = 0; intento < 3; intento++) {
      const editor = editorNotasVisible();
      if (!editor) throw new Error('el editor de la nota no está visible');
      await new Promise((resolve) => editor.setData(html, { callback: resolve }));
      editor.fire('change');
      editor.updateElement();
      editor.element?.$?.dispatchEvent(new Event('input', { bubbles: true }));
      editor.element?.$?.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(1200);
      const actual = editorNotasVisible();
      if (actual && textoEditor(actual).length > 20) {
        actual.focus();
        return;
      }
    }
    throw new Error('no se pudo pegar el texto en el editor');
  }

  // En Búsqueda, un clic sobre el texto de una nota guardada la abre para editar
  async function editarEvolucionGuardada(nota) {
    const anterior = editorNotasVisible();
    toast('Abriendo tu evolución de hoy para editar…', false, 30000);
    nota.click();
    const editor = await waitFor(() => {
      const e = editorNotasVisible();
      return e && e !== anterior && textoEditor(e) ? e : null;
    }, { timeout: 45000 });
    if (!editor) throw new Error('no se abrió la evolución para editar');
    editor.focus();
    toast('Evolución de hoy abierta para editar.', false, 4000);
  }

  // Cuadro de elección sobre la página. Devuelve el `valor` elegido, o null (Esc/Cancelar).
  function preguntar(mensaje, opciones) {
    return new Promise((resolve) => {
      const fondo = document.createElement('div');
      fondo.id = 'almah-dialogo';
      const caja = document.createElement('div');
      caja.className = 'almah-dialogo-caja';
      const p = document.createElement('p');
      p.textContent = mensaje;
      caja.appendChild(p);
      const cerrar = (valor) => {
        document.removeEventListener('keydown', teclas, true);
        fondo.remove();
        resolve(valor);
      };
      opciones.forEach((o) => {
        const b = mkBtn('', '', () => cerrar(o.valor));
        b.innerHTML = `<span>${o.texto}</span><kbd>${o.tecla.toUpperCase()}</kbd>`;
        caja.appendChild(b);
      });
      const cancelar = mkBtn('Cancelar', '', () => cerrar(null));
      cancelar.classList.add('almah-cancelar');
      caja.appendChild(cancelar);
      const teclas = (e) => {
        const o = opciones.find((x) => e.key.toLowerCase() === x.tecla && !e.altKey && !e.ctrlKey);
        if (e.key === 'Escape' || o) {
          e.preventDefault();
          e.stopPropagation();
          cerrar(o ? o.valor : null);
        }
      };
      document.addEventListener('keydown', teclas, true);
      fondo.addEventListener('click', (e) => e.target === fondo && cerrar(null));
      fondo.appendChild(caja);
      document.body.appendChild(fondo);
      caja.querySelector('button')?.focus();
    });
  }

  // Busca la evolución anterior, abre la evolución de hoy (o la crea) y pega el texto.
  // Nunca guarda: el médico revisa, actualiza y guarda.
  async function evolucionDelDia(actionBtn) {
    if (actionBtn) await abrirRegistroClinico(actionBtn);
    toast('Buscando la evolución anterior…');
    const { propiaHoy, candidatas, tipoHoy } = await buscarEvolucionAnterior();
    if (propiaHoy) {
      const opcion = await preguntar(`Ya guardaste tu evolución de hoy (${propiaHoy.hora}). ¿Qué quieres hacer?`, [
        { valor: 'editar', texto: `✏️ Editar mi evolución de las ${propiaHoy.hora}`, tecla: 'e' },
        { valor: 'agregar', texto: '➕ Agregar una nota (evento / nota nocturna)', tecla: 'a' },
      ]);
      if (opcion === 'editar') await editarEvolucionGuardada(propiaHoy.nota);
      else if (opcion === 'agregar') (await abrirNotaEvolucion()).focus();
      return;
    }
    const previa = await elegirEvolucion(candidatas);
    if (!previa) return;
    // "Actual" es tu entrada de hoy: si no es una Evolución (Ingreso, Evaluación,
    // Acciones adicionales…) se pregunta antes de pegar ahí.
    let nueva = false;
    if (hayEntradaActual() && tipoHoy && !CONFIG.tipoEntradaEvolucion.test(tipoHoy)) {
      const opcion = await preguntar(`Tu entrada de hoy es "${tipoHoy}". ¿Dónde pego la evolución?`, [
        { valor: 'nueva', texto: '🩺 Crear una Evolución nueva', tecla: 'n' },
        { valor: 'actual', texto: `📄 En "${tipoHoy}"`, tecla: 'a' },
      ]);
      if (!opcion) return;
      nueva = opcion === 'nueva';
    }
    const editor = await abrirNotaEvolucion({ nueva });
    if (textoEditor(editor)) {
      toast('La evolución de hoy ya tiene texto: se abrió sin reemplazarlo', false, 6000);
      return;
    }
    await escribirEnEditor(previa.html);
    toast(`Copiada la evolución del ${previa.fecha} (${previa.autor}). Revísala y actualízala antes de guardar.`, false, 8000);
  }

  // Bloquea (candado de Búsqueda) las evoluciones propias de hoy que siguen abiertas.
  // Pide confirmación antes; solo toca entradas del usuario conectado.
  const candadoAbierto = (row) =>
    row.querySelector(SEL.entradaCandado)?.getAttribute('md-svg-icon') === 'system-unlock';

  // Evoluciones propias de hoy y de ayer. En la lista, las de hoy empiezan con la hora
  // ("17:52 …") y las de días anteriores con la fecha ("09/10/2026 …").
  function evolucionesPropias() {
    const yo = usuarioConectado();
    const ayer = new Date();
    ayer.setHours(0, 0, 0, 0);
    ayer.setDate(ayer.getDate() - 1);
    return filasEntradas()
      .map((row) => {
        const texto = row.querySelector(SEL.entradaTexto)?.textContent.replace(/\s+/g, ' ').trim() || '';
        if (!texto.toUpperCase().includes(yo) || !CONFIG.profesionalACopiar.test(texto) ||
          !CONFIG.tipoEvolucionACopiar.test(texto.split(') -').pop())) return null;
        const hora = texto.match(/^(\d{2}:\d{2})\b/)?.[1];
        if (hora) return { row, id: row.id, dia: 'hoy', etiqueta: hora };
        const fecha = texto.match(/^(\d{2}\/\d{2})\/\d{4}/);
        if (fecha && parseFecha(texto)?.getTime() === ayer.getTime()) return { row, id: row.id, dia: 'ayer', etiqueta: fecha[1] };
        return null;
      })
      .filter(Boolean);
  }

  async function cerrarEvolucion(actionBtn) {
    await abrirRegistroClinico(actionBtn);
    await abrirBusqueda();
    if (!(await waitFor(() => filasEntradas().length, { timeout: 15000 })))
      throw new Error('no cargó la lista de registros');
    await limpiarFiltrosBusqueda();
    const propias = evolucionesPropias();
    const abiertas = propias.filter((e) => candadoAbierto(e.row));
    if (!abiertas.length) {
      toast(propias.length ? 'Tus evoluciones de hoy y de ayer ya están bloqueadas 🔒' : 'No hay evoluciones tuyas de hoy ni de ayer', false, 5000);
      return;
    }
    const describir = (lista) => ['hoy', 'ayer']
      .map((dia) => {
        const del = lista.filter((e) => e.dia === dia);
        return del.length ? `${dia} (${del.map((e) => e.etiqueta).join(', ')})` : null;
      })
      .filter(Boolean)
      .join(' y ');
    const hoy = abiertas.filter((e) => e.dia === 'hoy');
    const ayer = abiertas.filter((e) => e.dia === 'ayer');
    const opciones = [{ valor: 'todas', texto: `🔒 Bloquear ${describir(abiertas)}`, tecla: 'b' }];
    if (hoy.length && ayer.length) {
      opciones.push({ valor: 'hoy', texto: `Solo hoy (${hoy.map((e) => e.etiqueta).join(', ')})`, tecla: 'h' });
      opciones.push({ valor: 'ayer', texto: `Solo ayer (${ayer[0].etiqueta})`, tecla: 'a' });
    }
    const resp = await preguntar(
      abiertas.length > 1
        ? `¿Bloquear tus evoluciones de ${describir(abiertas)}? Después no podrás editarlas.`
        : `¿Bloquear tu evolución de ${describir(abiertas)}? Después no podrás editarla.`,
      opciones
    );
    if (!resp) return;
    const elegidas = resp === 'todas' ? abiertas : abiertas.filter((e) => e.dia === resp);
    for (const e of elegidas) {
      document.getElementById(e.id)?.querySelector(SEL.entradaCandado)?.click();
      const cerrado = await waitFor(() => {
        const row = document.getElementById(e.id);
        return row && !candadoAbierto(row);
      }, { timeout: 20000 });
      if (!cerrado) {
        toast(`No se confirmó el bloqueo de ${e.dia} (${e.etiqueta}): revisa si ALMA pide confirmación`, true, 8000);
        return;
      }
    }
    toast(`${elegidas.length > 1 ? 'Evoluciones bloqueadas' : 'Evolución bloqueada'} 🔒 (${describir(elegidas)})`, false, 5000);
  }

  // ---------------------------------------------------------------------------
  // Resaltado de indicaciones según el turno en que se solicitaron
  // ---------------------------------------------------------------------------
  const ESTADOS_MED = {
    vigente: 'Vigente',
    renovar: 'Por renovar',
    terminado: 'Terminado',
    suspendido: 'Suspendido',
  };

  function parseFecha(s) {
    const m = s && s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  }

  // Los turnos cambian a las 8:00 de lunes a viernes y a las 9:00 sábado y domingo
  // (sin feriados). Devuelve el inicio del turno que contiene `d`.
  function inicioTurno(d) {
    const cambio = (dia) => (dia.getDay() === 0 || dia.getDay() === 6 ? 9 : 8);
    const t = new Date(d);
    t.setHours(cambio(t), 0, 0, 0);
    if (t > d) {
      t.setDate(t.getDate() - 1);
      t.setHours(cambio(t), 0, 0, 0);
    }
    return t;
  }

  function fechaSolicitud(row) {
    const fecha = parseFecha(row.querySelector(SEL.ordenFecha)?.textContent);
    const hora = row.querySelector(SEL.ordenHora)?.textContent.match(/(\d{1,2}):(\d{2})/);
    if (fecha && hora) fecha.setHours(+hora[1], +hora[2]);
    return fecha;
  }

  const nombreOrden = (row) => row.querySelector(SEL.ordenNombre)?.textContent.replace(/\s+/g, ' ').trim() || '';

  // Aunque ALMA las deje 24 h, la receta se renueva cada mañana y lo agregado en el
  // turno es para ese turno:
  //  vigente     solicitada en el turno actual
  //  renovar     del turno anterior y aún sin una indicación más nueva del mismo fármaco
  //  terminado   reemplazada por una más nueva, "UNA VEZ" de un turno pasado, o más antigua
  // `ultimas`: nombre → fecha de solicitud más reciente en la misma tabla.
  function clasificarOrden(row, ultimas) {
    const texto = row.querySelector(SEL.ordenTexto)?.textContent || '';
    if (/Estado:\s*(Suspendido|Descontinuado|Anulado|Cancelado)|Descontinuado el:\s*\d/i.test(texto))
      return 'suspendido';
    const fecha = fechaSolicitud(row);
    if (!fecha) return null;
    const actual = inicioTurno(new Date());
    if (fecha >= actual) return 'vigente';
    const anterior = inicioTurno(new Date(actual.getTime() - 1));
    if (fecha < anterior || /\bUNA VEZ\b/i.test(row.querySelector(SEL.ordenLinea)?.textContent || '')) return 'terminado';
    return ultimas?.get(nombreOrden(row)) > fecha ? 'terminado' : 'renovar';
  }

  let ocultarTerminados = false;
  try { ocultarTerminados = localStorage.getItem('almah-ocultar-terminados') === '1'; } catch (e) { /* sin storage */ }

  function resaltarMedicamentos() {
    const filas = [...document.querySelectorAll(SEL.ordenRow)].filter((row) => /-row-\d+$/.test(row.id));
    const ultimasPorTabla = new Map(); // id de la tabla → (nombre → fecha más reciente)
    const tablaDe = (row) => row.id.replace(/-row-\d+$/, '');
    filas.forEach((row) => {
      const fecha = fechaSolicitud(row);
      if (!fecha) return;
      if (!ultimasPorTabla.has(tablaDe(row))) ultimasPorTabla.set(tablaDe(row), new Map());
      const ultimas = ultimasPorTabla.get(tablaDe(row));
      const nombre = nombreOrden(row);
      if (!(ultimas.get(nombre) >= fecha)) ultimas.set(nombre, fecha);
    });
    filas.forEach((row) => {
      const estado = clasificarOrden(row, ultimasPorTabla.get(tablaDe(row)));
      if (row.dataset.almahMed !== (estado || '')) {
        row.dataset.almahMed = estado || '';
        row.querySelector('.almah-badge')?.remove();
        if (estado) {
          const badge = document.createElement('span');
          badge.className = `almah-badge almah-badge-${estado}`;
          badge.textContent = ESTADOS_MED[estado];
          row.querySelector(SEL.ordenNombre)?.before(badge);
        }
      }
      row.classList.toggle(
        'almah-oculto',
        ocultarTerminados && (estado === 'terminado' || estado === 'suspendido')
      );
    });
  }

  function toggleTerminados() {
    ocultarTerminados = !ocultarTerminados;
    try { localStorage.setItem('almah-ocultar-terminados', ocultarTerminados ? '1' : '0'); } catch (e) { /* sin storage */ }
    resaltarMedicamentos();
    actualizarPanelContextual();
    toast(ocultarTerminados ? 'Ocultando terminados y suspendidos' : 'Mostrando todas las indicaciones');
  }

  // ---------------------------------------------------------------------------
  // Filtro de resultados en "Búsqueda de Indicaciones"
  // ---------------------------------------------------------------------------
  const sinTildes = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  let mostrarIndicOcultas = false;

  function filtrarBusquedaIndicaciones() {
    document.querySelectorAll(SEL.indicResultados).forEach(filtrarTablaIndicaciones);
  }

  function filtrarTablaIndicaciones(tabla) {
    const cont = tabla.parentElement;
    if (!cont) return;
    let ocultas = 0;
    tabla.querySelectorAll(SEL.indicRow).forEach((row) => {
      if (!/-row-\d+$/.test(row.id)) return;
      const nombre = sinTildes(row.querySelector(SEL.indicNombre)?.textContent || '');
      const ocultar = CONFIG.ocultarEnBusquedaIndicaciones.some((re) => re.test(nombre));
      if (ocultar) ocultas++;
      row.classList.toggle('almah-oculto', ocultar && !mostrarIndicOcultas);
      row.classList.toggle('almah-filtrada', ocultar && mostrarIndicOcultas);
    });

    let aviso = cont.querySelector(':scope > .almah-aviso');
    if (!ocultas) {
      aviso?.remove();
      return;
    }
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.className = 'almah-aviso';
      aviso.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        mostrarIndicOcultas = !mostrarIndicOcultas;
        filtrarBusquedaIndicaciones();
      });
      tabla.before(aviso);
    }
    const txt = mostrarIndicOcultas
      ? `Mostrando ${ocultas} resultado(s) filtrado(s) · clic para ocultarlos`
      : `${ocultas} resultado(s) oculto(s) por filtro · clic para mostrarlos`;
    if (aviso.textContent !== txt) aviso.textContent = txt;
  }

  // ---------------------------------------------------------------------------
  // Exámenes frecuentes: barra bajo "Búsqueda de Indicaciones"
  // ---------------------------------------------------------------------------
  const normalizar = (s) => sinTildes(s).replace(/\s+/g, ' ');
  // En la lista de pendientes ALMA omite prefijos como "(UREA) " o "(CKMB) "
  const clave = (s) => normalizar(s).replace(/^\([^)]*\)\s*/, '');
  const pendientes = () =>
    [...document.querySelectorAll(SEL.pendienteRow)].filter((r) => /-row-\d+$/.test(r.id) && isVisible(r));

  // Menú desplegable agrupado. Cada opción es un ítem { titulo, buscar, nombre|producto, via? }
  function crearMenu(titulo, grupos, { examenes = false } = {}) {
    const sel = document.createElement('select');
    sel.className = 'almah-select';
    sel.title = `Agregar a la lista: ${titulo.toLowerCase()}`;
    sel.appendChild(new Option(`${titulo} ▾`, ''));
    const items = [];
    grupos.forEach((g) => {
      const destino = g.grupo ? document.createElement('optgroup') : sel;
      if (g.grupo) destino.label = g.grupo;
      g.items.forEach((it) => {
        items.push(it);
        destino.appendChild(new Option(it.titulo, String(items.length - 1)));
      });
      if (g.grupo) sel.appendChild(destino);
    });
    sel.addEventListener('click', (e) => e.stopPropagation());
    sel.addEventListener('change', () => {
      const it = items[+sel.value];
      sel.value = '';
      if (!it) return;
      const { titulo: t, ...item } = it;
      const set = { titulo: t, items: [item] };
      run(t, () => (examenes ? agregarExamenesProgramados(set) : agregarExamenes(set)));
    });
    return sel;
  }

  // Reposo/Régimen: opciones con el nombre exacto de ALMA ("REGIMEN CERO" → "CERO")
  const gruposDeNombres = (grupo) =>
    (grupo.grupos || [{ opciones: grupo.opciones }]).map((g) => ({
      grupo: g.grupo,
      items: g.opciones.map((o) => ({ titulo: o.replace(/^(REGIMEN|REPOSO) /, ''), buscar: o, nombre: o })),
    }));

  function filaBarra(etiqueta, ...controles) {
    const fila = document.createElement('div');
    fila.className = 'almah-fila';
    fila.appendChild(Object.assign(document.createElement('span'), {
      className: 'almah-examenes-titulo', textContent: etiqueta,
    }));
    fila.append(...controles);
    return fila;
  }

  function decorarIndicaciones() {
    if (!esMedico()) return;
    const inp = document.querySelector(SEL.indicBuscar);
    const fila = inp?.closest('.componentRow');
    if (!fila || fila.parentElement.querySelector('.almah-examenes')) return;
    const bar = document.createElement('div');
    bar.className = 'almah-examenes';
    bar.append(
      filaBarra('Indicaciones:',
        ...CONFIG.indicacionesRapidas.map((g) => crearMenu(g.titulo, gruposDeNombres(g))),
        crearMenu('Fármacos', CONFIG.farmacos)),
      filaBarra('Exámenes:',
        ...CONFIG.examenes.map((set) => {
          const b = mkBtn(set.titulo, `Agregar a la lista: ${set.items.map((i) => i.nombre).join(', ')}`, () =>
            run(set.titulo, () => agregarExamenesProgramados(set)));
          b.classList.add('almah-set');
          return b;
        }),
        crearMenu('Otros exámenes', CONFIG.otrosExamenes, { examenes: true }),
        (() => {
          const b = mkBtn('', '', () => {
            revisarPaciente6am();
            modo6am = !modo6am;
            episodio6am = modo6am ? episodioActual() : null;
            guardar6am();
            actualizarBoton6am(b);
            const { fecha, hora } = proximaHoraExamenes();
            toast(modo6am ? `⏰ Exámenes se programarán para el ${fecha} a las ${hora}` : '⏰ Exámenes con la hora actual');
          });
          b.classList.add('almah-6am');
          actualizarBoton6am(b);
          return b;
        })()),
    );
    fila.after(bar);
  }

  // ---- Programar exámenes a las 6 AM ----
  // Los campos "Fecha de Inicio"/"Hora Inicio" de la cabecera se aplican a lo que se
  // agregue DESPUÉS (no cambian lo que ya está en la lista).
  // Se mantiene activo mientras sigas en el mismo paciente (N° de episodio); al abrir
  // otro paciente se apaga solo. En el mapa (sin banner) conserva el estado.
  let modo6am = false;
  let episodio6am = null;
  try {
    const g = JSON.parse(sessionStorage.getItem('almah-6am') || 'null');
    if (g) ({ activo: modo6am, episodio: episodio6am } = g);
  } catch (e) { /* sin storage */ }

  function guardar6am() {
    try { sessionStorage.setItem('almah-6am', JSON.stringify({ activo: modo6am, episodio: episodio6am })); } catch (e) { /* sin storage */ }
  }

  // Apaga 6 AM si cambió el paciente; devuelve true si se apagó
  function revisarPaciente6am() {
    const ep = episodioActual();
    if (!modo6am || !ep || ep === episodio6am) return false;
    modo6am = false;
    episodio6am = null;
    guardar6am();
    document.querySelectorAll('.almah-6am').forEach(actualizarBoton6am);
    toast('⏰ 6 AM desactivado: cambiaste de paciente');
    return true;
  }

  // Próximas 06:00: antes de medianoche → mañana; entre 00:00 y 06:00 → hoy
  function proximaHoraExamenes() {
    const d = new Date();
    if (d.getHours() >= CONFIG.horaExamenes) d.setDate(d.getDate() + 1);
    const p = (n) => String(n).padStart(2, '0');
    return { fecha: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`, hora: `${p(CONFIG.horaExamenes)}:00` };
  }

  function fijarCampo(el, valor) {
    el.focus();
    el.value = valor;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
  }

  // Ejecuta fn con la cabecera en la próxima 06:00 y luego restaura los valores previos
  async function conInicioProgramado(fn) {
    const fd = document.querySelector(SEL.inicioFecha);
    const ft = document.querySelector(SEL.inicioHora);
    if (!fd || !ft) throw new Error('no se encontraron los campos de Fecha/Hora de inicio');
    const previo = { fecha: fd.value, hora: ft.value };
    const objetivo = proximaHoraExamenes();
    fijarCampo(fd, objetivo.fecha);
    await sleep(300);
    fijarCampo(ft, objetivo.hora);
    await sleep(500);
    try {
      return await fn(objetivo);
    } finally {
      fijarCampo(fd, previo.fecha);
      await sleep(300);
      fijarCampo(ft, previo.hora);
    }
  }

  // Agrega exámenes respetando el modo 6 AM
  function agregarExamenesProgramados(set) {
    revisarPaciente6am();
    if (!modo6am) return agregarExamenes(set);
    return conInicioProgramado((obj) => agregarExamenes(set, `programados para ${obj.fecha} ${obj.hora}`));
  }

  function actualizarBoton6am(b) {
    const { fecha, hora } = proximaHoraExamenes();
    b.classList.toggle('almah-activo', modo6am);
    b.setAttribute('aria-pressed', String(modo6am));
    b.textContent = modo6am ? `⏰ 6 AM ✓ (${fecha})` : '⏰ 6 AM';
    b.title = modo6am
      ? `Activo (solo para este paciente): los exámenes que agregues desde aquí quedan para el ${fecha} a las ${hora}. Clic para desactivar.`
      : `Clic para programar los exámenes que agregues desde aquí para las ${hora} (${fecha}).`;
  }

  // Busca cada ítem (examen, indicación o fármaco) y presiona su "+" (ver agregarExamenes).
  // Nombre "específico" de un resultado: el producto (desc2, p. ej. "ENOXAPARINA JERINGA
  // PRE-LLENADA 40 MG/0.4 ML") si existe; si no, el nombre (desc1, p. ej. "Hemograma (…)").
  const nombresResultado = (r) => {
    const d1 = r.querySelector(SEL.indicNombre)?.textContent || '';
    const d2 = r.querySelector(SEL.indicProducto)?.textContent || '';
    return { d1: normalizar(d1), d2: normalizar(d2), especifico: d2.trim() ? d2 : d1 };
  };

  // Busca cada ítem (examen, indicación o fármaco) y presiona su "+": solo lo agrega a
  // la lista de pendientes. Ítem: { buscar, nombre } o, para fármacos, { buscar, producto }.
  async function agregarExamenes(set, nota = '') {
    const inp = document.querySelector(SEL.indicBuscar);
    if (!inp) throw new Error('abra la página de Indicaciones');
    // Cada pendiente es "A — B — C…" (p. ej. "REPOSO ABSOLUTO — UNA VEZ" o
    // "ACIDO ACETILSALICILICO — ACIDO ACETILSALICILICO COMPRIMIDO 100 MG — …")
    const segmentos = () => pendientes().flatMap((r) => r.textContent.split('\u2014').slice(0, 2).map(clave));
    const agregados = [];
    const omitidos = [];
    const fallidos = [];
    for (const [i, item] of set.items.entries()) {
      const etiqueta = item.nombre || item.producto;
      const objetivo = normalizar(etiqueta);
      // Mezclas (con `via`): en pendientes el nombre lleva un sufijo ("… Solución Inyectable")
      const yaEsta = (nombre) => segmentos().some((g) => g === clave(nombre) || (item.via && g.startsWith(clave(nombre))));
      if (yaEsta(etiqueta)) { omitidos.push(etiqueta); continue; }
      toast(`${set.titulo}: agregando ${etiqueta} (${i + 1}/${set.items.length})…`, false, 20000);
      inp.focus();
      inp.value = item.buscar;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      ['keydown', 'keypress', 'keyup'].forEach((t) =>
        inp.dispatchEvent(new KeyboardEvent(t, { key: 'Enter', keyCode: 13, which: 13, bubbles: true }))
      );
      // Preferir coincidencia exacta ("Magnesio") sobre prefijo ("Magnesio en orina")
      const fila = await waitFor(() => {
        const filas = [...document.querySelectorAll(SEL.indicRow)]
          .filter((r) => /-row-\d+$/.test(r.id))
          .map((r) => ({ r, ...nombresResultado(r) }));
        const campo = item.producto ? 'd2' : 'd1';
        return (filas.find((f) => f[campo] === objetivo) || filas.find((f) => f[campo].startsWith(objetivo)))?.r;
      }, { timeout: 15000 });
      if (!fila) { fallidos.push(etiqueta); continue; }
      // Con el nombre completo del resultado ("Hemograma (incluye …)") se evita duplicar
      if (yaEsta(nombresResultado(fila).especifico)) { omitidos.push(etiqueta); continue; }
      // Algunos fármacos (p. ej. heparina) no tienen "+": la flecha › abre la elección
      // de vía ("INTRAVENOSA - Infusión Continua"…) y ahí está el "+".
      let agregar = fila.querySelector(SEL.indicAgregar);
      if (!agregar && item.via) {
        fila.querySelector(SEL.indicVias)?.click();
        const via = normalizar(item.via);
        const filaVia = await waitFor(() =>
          [...document.querySelectorAll(SEL.indicRow)].find(
            (r) => /-row-\d+$/.test(r.id) && nombresResultado(r).d1 === via
          ), { timeout: 15000 });
        agregar = filaVia?.querySelector(SEL.indicAgregar);
      }
      if (!agregar) { fallidos.push(`${etiqueta} (requiere elegir vía)`); continue; }
      const antes = pendientes().length;
      agregar.click();
      if (await waitFor(() => pendientes().length > antes, { timeout: 15000 })) agregados.push(etiqueta);
      else fallidos.push(etiqueta);
      await sleep(1000); // no saturar el buscador de ALMA
    }
    inp.value = ''; // dejar el buscador limpio
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    const partes = [];
    if (agregados.length) partes.push(`agregados: ${agregados.join(', ')}`);
    if (omitidos.length) partes.push(`ya estaban: ${omitidos.join(', ')}`);
    if (fallidos.length) partes.push(`NO encontrados: ${fallidos.join(', ')}`);
    if (nota && agregados.length) partes.push(nota);
    toast(`${set.titulo} → ${partes.join(' · ')}. Revisa y guarda la lista.`, fallidos.length > 0, 9000);
  }

  // ---------------------------------------------------------------------------
  // Botones en cada cama del mapa de piso
  // ---------------------------------------------------------------------------
  function decorarCamas() {
    document.querySelectorAll(SEL.bed).forEach((bed) => {
      const actionBtn = bed.querySelector(SEL.bedActionBtn(bed.id));
      if (!actionBtn || bed.querySelector('.almah-bedbar')) return;
      const bar = document.createElement('div');
      bar.className = 'almah-bedbar';
      if (esMedico()) {
        bar.append(
          mkBtn('🩺 Evolucionar', 'Evolucionar (copia la evolución anterior)', () =>
            run('Evolucionar', () => evolucionDelDia(actionBtn))
          ),
          mkBtn('🔒 Cerrar', 'Bloquear mi evolución de hoy', () =>
            run('Cerrar evolución', () => cerrarEvolucion(actionBtn))
          )
        );
      }
      bar.append(
        mkBtn('📝 Notas MD', 'Notas médicas de este paciente', () =>
          run('Notas médicas', () => notasMedicas(actionBtn))
        ),
        mkBtn('✍️ Indic.', 'Indicaciones de este paciente', () =>
          run('Indicaciones', () => indicaciones(actionBtn))
        ),
        mkBtn('💊 Medicam.', 'Medicamentos de este paciente', () =>
          run('Medicamentos', () => medicamentos(actionBtn))
        )
      );
      if (!esMedico()) {
        bar.append(
          mkBtn('🩹 Notas Enf.', 'Notas de enfermería de este paciente', () =>
            run('Notas de enfermería', () => notasDe('enfermeria', actionBtn))),
          mkBtn('🏃 Notas Kine', 'Notas de kinesiología de este paciente', () =>
            run('Notas de kinesiología', () => notasDe('kinesiologia', actionBtn))),
          mkBtn('🧑‍⚕️ Notas TENS', 'Notas TENS de este paciente', () =>
            run('Notas TENS', () => notasDe('tens', actionBtn)))
        );
      }
      (bed.querySelector(`#${bed.id}-patient`) || bed).appendChild(bar);
    });
  }

  function mkBtn(label, title, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'almah-btn';
    b.textContent = label;
    b.title = title;
    b.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return b;
  }

  // ---------------------------------------------------------------------------
  // Panel flotante
  // ---------------------------------------------------------------------------
  function fmtAtajo(a) {
    return `${a.alt ? 'Alt+' : ''}${a.ctrl ? 'Ctrl+' : ''}${a.shift ? 'Shift+' : ''}${a.key.toUpperCase()}`;
  }

  // perfil: 'medico' u 'otro' (sin perfil: para todos). Ver perfilActual().
  const TODAS_LAS_ACCIONES = [
    { id: 'evolucion', label: '🩺 Evolucionar', fn: () => evolucionDelDia(), perfil: 'medico' },
    { id: 'cerrarEvolucion', label: '🔒 Cerrar evolución', fn: () => cerrarEvolucion(), perfil: 'medico' },
    { id: 'notasMedicas', label: '📝 Notas médicas', fn: () => notasMedicas() },
    { id: 'notasEnfermeria', label: '🩹 Notas de enfermería', fn: () => notasDe('enfermeria'), perfil: 'otro' },
    { id: 'notasKinesiologia', label: '🏃 Notas de kinesiología', fn: () => notasDe('kinesiologia'), perfil: 'otro' },
    { id: 'notasTens', label: '🧑‍⚕️ Notas TENS', fn: () => notasDe('tens'), perfil: 'otro' },
    { id: 'indicaciones', label: '✍️ Indicaciones', fn: () => indicaciones() },
    { id: 'medicamentos', label: '💊 Medicamentos', fn: () => medicamentos() },
    // soloEn: el botón aparece (resaltado) solo cuando la función devuelve true
    { id: 'ocultarTerminados', label: '👁️ Ocultar terminados', fn: async () => toggleTerminados(),
      soloEn: () => !!document.querySelector(SEL.ordenRow) },
  ];
  let ACCIONES = [];
  let perfilConstruido = null;

  // Construye (o reconstruye, si cambió el perfil tras iniciar sesión) panel, botones
  // de las camas y barra de indicaciones.
  function aplicarPerfil() {
    const perfil = perfilActual();
    if (perfil === perfilConstruido) return;
    perfilConstruido = perfil;
    ACCIONES = TODAS_LAS_ACCIONES.filter((a) => !a.perfil || a.perfil === perfil);
    document.getElementById('almah-panel')?.remove();
    document.querySelectorAll('.almah-bedbar, .almah-examenes').forEach((e) => e.remove());
    crearPanel();
  }

  // ---------------------------------------------------------------------------
  // Prescripción vigente: en la ficha del paciente, ventana flotante con lo vigente y por
  // renovar según la pantalla Medicamentos (misma regla de turnos que su resaltado; ver
  // clasificarOrden). No usa el ícono de píldora del mapa: no coincide con lo indicado.
  // Se recuerda solo en memoria, por nombre, y caduca al cambiar el turno.
  // ---------------------------------------------------------------------------
  const prescripciones = new Map(); // nombre → { vigentes, renovar, hora: 'HH:MM', turno: ms }

  // Nombre corto para la ventana: la presentación se cambia por la vía de administración
  // (de la columna "Inf. adicional"), p. ej. "CLOPIDOGREL COMPRIMIDO RECUBIERTO 75 MG" →
  // "CLOPIDOGREL VO 75 MG", "LORAZEPAM AMPOLLA 4 MG/2 ML" (intramuscular) → "LORAZEPAM IM 4 MG/2 ML".
  const VIAS = [[/^ORAL/, 'VO'], [/^INTRAVENOSA/, 'EV'], [/^SUBCUTANEA/, 'SC'], [/^INTRAMUSCULAR/, 'IM']];
  const PRESENTACION = /\b(FRASCO AMPOLLA|AMPOLLA|COMPRIMIDO|CM|JERING[AE] PRE-LLENADA|JERING[AE]|MATRAZ)\b/;
  function nombreCorto(row) {
    const nombre = nombreOrden(row);
    const partes = (row.querySelector(SEL.ordenLinea)?.textContent || '').split('—').map((p) => sinTildes(p).toUpperCase());
    const via = partes.map((p) => VIAS.find(([re]) => re.test(p))?.[1]).find(Boolean);
    if (!via) return nombre;
    return nombre.replace(PRESENTACION, via).replace(/\s*\bRECUBIERTO\b/, '').replace(/\s+/g, ' ').trim();
  }

  // Lee el resaltado ya aplicado a la tabla "Atención Actual" (resaltarMedicamentos)
  function leerPrescripcionMedicamentos() {
    // Otras pantallas (p. ej. RCE PRINCIPAL) usan la misma tabla con otro contenido
    const pestana = document.querySelector(`${SEL.chartMenuSeleccionado} ${SEL.chartMenuCaption}`);
    if (pestana?.textContent.trim() !== 'Medicamentos') return;
    const nombre = document.querySelector(SEL.bannerNombre)?.textContent.trim();
    const filas = [...document.querySelectorAll(SEL.ordenActualRow)].filter((r) => /-row-\d+$/.test(r.id));
    if (!nombre || !filas.length) return;
    const nombres = (estado) => [...new Set(filas.filter((r) => r.dataset.almahMed === estado).map(nombreCorto))].filter(Boolean);
    const vigentes = nombres('vigente');
    const renovar = nombres('renovar').filter((n) => !vigentes.includes(n));
    const turno = inicioTurno(new Date()).getTime();
    const previo = prescripciones.get(nombre);
    if (previo && previo.turno === turno && previo.vigentes.join(';') === vigentes.join(';') &&
      previo.renovar.join(';') === renovar.join(';')) return;
    prescripciones.set(nombre, { vigentes, renovar, hora: new Date().toTimeString().slice(0, 5), turno });
  }

  let medsPlegado = false;
  try { medsPlegado = localStorage.getItem('almah-meds-plegado') === '1'; } catch (e) { /* sin storage */ }

  // Ventana flotante (abajo a la izquierda por defecto, arrastrable, se pliega con un clic).
  // Sin datos del paciente (o si cambió el turno) queda como pestaña que abre Medicamentos.
  function actualizarMedsFlotante() {
    const nombre = document.querySelector(SEL.bannerNombre)?.textContent.trim();
    let win = document.getElementById('almah-meds-flot');
    if (!nombre) {
      if (win) win.hidden = true;
      return;
    }
    let datos = prescripciones.get(nombre);
    if (datos && datos.turno !== inicioTurno(new Date()).getTime()) datos = null;
    if (!win) {
      win = document.createElement('div');
      win.id = 'almah-meds-flot';
      const head = document.createElement('div');
      head.className = 'almah-meds-head';
      hacerArrastrable(win, head, () => {
        if (win.classList.contains('almah-sin-datos')) return run('Medicamentos', () => medicamentos());
        medsPlegado = win.classList.toggle('almah-collapsed');
        try { localStorage.setItem('almah-meds-plegado', medsPlegado ? '1' : '0'); } catch (e) { /* sin storage */ }
        posicionMeds(win);
      }, (w) => {
        const r = w.getBoundingClientRect();
        try { localStorage.setItem('almah-meds-pos', JSON.stringify({ top: r.top, left: r.left })); } catch (e) { /* sin storage */ }
        posicionMeds(w);
      });
      const lista = document.createElement('ul');
      win.append(head, lista);
      document.body.appendChild(win);
      window.addEventListener('resize', () => posicionMeds(win));
    }
    const clave = datos ? `${nombre}|${datos.hora}|${datos.vigentes.join(';')}|${datos.renovar.join(';')}` : `${nombre}|-`;
    win.hidden = false;
    win.classList.toggle('almah-sin-datos', !datos);
    win.classList.toggle('almah-collapsed', !datos || medsPlegado);
    if (win.dataset.clave !== clave) {
      win.dataset.clave = clave;
      const head = win.querySelector('.almah-meds-head');
      const lista = win.querySelector('ul');
      if (!datos) {
        head.innerHTML = '<span>💊 Prescripción vigente</span><small class="almah-meds-link">abrir Medicamentos</small>';
        head.title = 'Abre Medicamentos para cargar la prescripción vigente · arrastrar para mover';
        lista.replaceChildren();
      } else {
        head.innerHTML = `<span>💊 Prescripción vigente (${datos.vigentes.length})</span>` +
          '<small></small><span class="almah-meds-flecha"></span>';
        head.querySelector('small').textContent = `Medicamentos ${datos.hora}`;
        head.title = 'Mostrar/ocultar · arrastrar para mover';
        const item = (texto, clase) => {
          const li = document.createElement('li');
          li.textContent = texto;
          if (clase) li.className = clase;
          return li;
        };
        lista.replaceChildren(
          ...datos.vigentes.map((m) => item(m)),
          ...datos.renovar.map((m) => item(m, 'almah-renovar')),
        );
        if (!lista.children.length) lista.append(item('Sin medicamentos vigentes'));
      }
    }
    posicionMeds(win);
  }

  // Posición guardada { top, left } tras arrastrar; si no, pegada abajo a la izquierda
  function posicionMeds(win) {
    let pos = null;
    try { pos = JSON.parse(localStorage.getItem('almah-meds-pos') || 'null'); } catch (e) { /* sin storage */ }
    const r = win.getBoundingClientRect();
    if (!pos) {
      Object.assign(win.style, { left: '16px', top: 'auto', bottom: '0' });
      return;
    }
    Object.assign(win.style, {
      left: `${Math.max(0, Math.min(pos.left, window.innerWidth - r.width))}px`,
      top: `${Math.max(0, Math.min(pos.top, window.innerHeight - r.height))}px`,
      bottom: 'auto',
    });
  }

  // ---------------------------------------------------------------------------
  // Interruptor general: desactiva todas las funciones sin desinstalar el script
  // ---------------------------------------------------------------------------
  let activo = true;
  try { activo = localStorage.getItem('almah-activo') !== '0'; } catch (e) { /* sin storage */ }

  // Cada función trabaja solo en su pantalla, para no recorrer todo en cada cambio
  function decorarTodo() {
    const h = location.hash;
    if (h.startsWith('#/Floorplan')) decorarCamas();
    if (document.querySelector(SEL.ordenRow)) {
      resaltarMedicamentos();
      leerPrescripcionMedicamentos();
    }
    if (h.includes('OEOrder.EntryPortal')) {
      revisarPaciente6am();
      filtrarBusquedaIndicaciones();
      decorarIndicaciones();
    }
    actualizarPanelContextual();
    actualizarMedsFlotante();
  }

  // Deja ALMA como sin el script: quita botones, barras, resaltados y filtros
  function limpiarTodo() {
    document.querySelectorAll('.almah-bedbar, .almah-examenes, .almah-aviso, .almah-badge').forEach((e) => e.remove());
    document.querySelectorAll('.almah-oculto, .almah-filtrada').forEach((e) => e.classList.remove('almah-oculto', 'almah-filtrada'));
    document.querySelectorAll('[data-almah-med]').forEach((e) => e.removeAttribute('data-almah-med'));
    document.getElementById('almah-panel')?.classList.remove('almah-hay-contexto');
    const flot = document.getElementById('almah-meds-flot');
    if (flot) flot.hidden = true;
  }

  function setActivo(valor) {
    activo = valor;
    try { localStorage.setItem('almah-activo', valor ? '1' : '0'); } catch (e) { /* sin storage */ }
    const panel = document.getElementById('almah-panel');
    panel?.classList.toggle('almah-off', !valor);
    const chk = panel?.querySelector('.almah-interruptor input');
    if (chk) chk.checked = valor;
    if (valor) decorarTodo();
    else limpiarTodo();
    toast(valor ? 'Asistente ALMA activado' : 'Asistente ALMA desactivado (ALMA queda como sin el script)');
  }

  // ---------------------------------------------------------------------------
  // Ayuda
  // ---------------------------------------------------------------------------
  function mostrarAyuda() {
    if (document.getElementById('almah-dialogo')) return;
    const t = (id) => fmtAtajo(CONFIG.atajos[id]);
    const medico = esMedico();
    const secciones = [
      ['Panel y pestaña', `<p>La pestaña <b>⚡ Asistente ALMA</b> (borde derecho) abre este panel con un clic o con <kbd>${t('togglePanel')}</kbd>. Se puede arrastrar; si se suelta cerca del borde, queda pegada. El interruptor <b>Funciones</b> apaga todo el script sin desinstalarlo.</p>`],
      ['Botones en cada cama (mapa de piso)', `<p>Accesos directos a las funciones del paciente sin pasar por el menú <b>•••</b>.</p>`],
      ['💊 Prescripción vigente', '<p>Dentro de la ficha, una <b>ventana flotante</b> abajo a la izquierda muestra lo <b>vigente</b> y lo <b>por renovar</b> según la pantalla Medicamentos (misma regla de turnos que su resaltado). Un clic en su título la pliega o despliega, y se puede arrastrar. Si aún no se ha abierto Medicamentos de ese paciente en este turno, la pestaña dice <b>abrir Medicamentos</b> y con un clic la carga.</p>'],
      medico && ['🩺 Evolucionar', `<p><kbd>${t('evolucion')}</kbd> Crea (o abre) tu evolución de hoy y copia el texto de la evolución más reciente de <b>otro médico</b>. Si hay varias notas médicas recientes (p. ej. una nota nocturna y la evolución del día), pregunta cuál copiar mostrando la hora de la entrada, el autor, el largo y el comienzo de cada nota (también cuando están en la misma entrada). Si ya guardaste la tuya, pregunta si quieres <b>editarla</b> o <b>agregar una nota</b>. <b>Nunca guarda</b>: revisa y guarda tú.</p>`],
      medico && ['🔒 Cerrar evolución', `<p><kbd>${t('cerrarEvolucion')}</kbd> Bloquea (candado) tus evoluciones de hoy y de ayer que sigan abiertas. Si hay de ambos días, puedes elegir bloquear todas o solo las de un día. Pide confirmación y luego ALMA pide la suya.</p>`],
      ['📝 Notas por profesión', `<p><kbd>${t('notasMedicas')}</kbd> Notas médicas` +
        (medico ? '' : ` · <kbd>${t('notasEnfermeria')}</kbd> enfermería · <kbd>${t('notasKinesiologia')}</kbd> kinesiología · <kbd>${t('notasTens')}</kbd> TENS`) +
        ': abre Registro Clínico → Búsqueda filtrada por tipo de profesional.</p>'],
      ['✍️ Indicaciones', `<p><kbd>${t('indicaciones')}</kbd> Abre la página de indicaciones.` +
        (medico ? ' Bajo el buscador aparece una barra con <b>Reposo ▾</b>, <b>Régimen ▾</b>, <b>Fármacos ▾</b>, <b>Lab diario</b>, <b>Coronario</b> y <b>Otros exámenes ▾</b>: solo <b>agregan a la lista</b> (sin duplicar), nunca guardan. <b>⏰ 6 AM</b> programa los exámenes para las 06:00 (mañana si es antes de medianoche). Los fármacos se agregan con valores por defecto: ajusta dosis y frecuencia.' : '') +
        ' En la búsqueda se ocultan ítems poco usados (órtesis, domiciliarios, pediatría…); el aviso gris permite verlos.</p>'],
      ['💊 Medicamentos', `<p><kbd>${t('medicamentos')}</kbd> Abre Medicamentos y resalta cada indicación: <span class="almah-badge almah-badge-vigente">Vigente</span> solicitada en este turno · <span class="almah-badge almah-badge-renovar">Por renovar</span> del turno anterior y aún no indicada de nuevo · <span class="almah-badge almah-badge-terminado">Terminado</span> ya reemplazada, "UNA VEZ" de un turno pasado o más antigua · <span class="almah-badge almah-badge-suspendido">Suspendido</span>. Los turnos cambian a las 8:00 de lunes a viernes y a las 9:00 sábado y domingo. "Ocultar terminados" nunca oculta los "Por renovar". <b>👁️ Ocultar terminados</b> (<kbd>${t('ocultarTerminados')}</kbd>) aparece solo en esa pantalla.</p>`],
    ].filter(Boolean);

    const fondo = document.createElement('div');
    fondo.id = 'almah-dialogo';
    const caja = document.createElement('div');
    caja.className = 'almah-dialogo-caja almah-ayuda';
    caja.innerHTML = `<p>⚡ Asistente ALMA v${VERSION} · perfil ${medico ? 'médico' : 'otros profesionales'}</p>` +
      '<small class="almah-grupo"></small>' +
      secciones.map(([titulo, html]) => `<h4>${titulo}</h4>${html}`).join('') +
      '<small>El script no guarda nada por ti: toda indicación o nota se revisa y se guarda en ALMA como siempre.</small>' +
      `<p class="almah-ayuda-web">🌐 Instalación, novedades y más información: <a href="${PAGINA_WEB}" target="_blank" rel="noopener">${PAGINA_WEB.replace(/^https:\/\//, '')}</a></p>`;
    caja.querySelector('.almah-grupo').textContent = `Grupo de seguridad: ${grupoSeguridad() || '(no detectado)'}`;
    const cerrar = () => {
      document.removeEventListener('keydown', teclas, true);
      fondo.remove();
    };
    const teclas = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cerrar();
      }
    };
    const ok = mkBtn('Cerrar', 'Cerrar la ayuda (Esc)', cerrar);
    ok.classList.add('almah-cancelar');
    caja.appendChild(ok);
    document.addEventListener('keydown', teclas, true);
    fondo.addEventListener('click', (e) => e.target === fondo && cerrar());
    fondo.appendChild(caja);
    document.body.appendChild(fondo);
    ok.focus();
  }

  // Panel pegado al borde derecho a media altura (los botones de ALMA están abajo a
  // la derecha). Plegado por defecto; se puede arrastrar desde el encabezado y
  // recuerda la posición.
  function crearPanel() {
    if (document.getElementById('almah-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'almah-panel';
    let collapsed = true;
    try { collapsed = localStorage.getItem('almah-collapsed') !== '0'; } catch (e) { /* sin storage */ }
    panel.classList.toggle('almah-collapsed', collapsed);

    const head = document.createElement('div');
    head.className = 'almah-head';
    head.innerHTML = `<span class="almah-rayo">⚡</span><span class="almah-titulo">Asistente ALMA</span><span class="almah-estado"> (apagado)</span><span class="almah-version">v${VERSION} beta</span><span class="almah-punto" title="Hay una opción para esta pantalla"></span>`;
    head.title = `Mostrar/ocultar (${fmtAtajo(CONFIG.atajos.togglePanel)}) · arrastrar para mover`;
    hacerArrastrable(panel, head, togglePanel);
    panel.appendChild(head);

    const body = document.createElement('div');
    body.className = 'almah-body';
    const interruptor = document.createElement('label');
    interruptor.className = 'almah-interruptor';
    interruptor.title = 'Activa o desactiva todas las funciones del script (sin entrar a la extensión)';
    interruptor.innerHTML = '<span>Funciones</span><input type="checkbox"><span class="almah-switch"></span><span class="almah-switch-txt"></span>';
    const chk = interruptor.querySelector('input');
    chk.checked = activo;
    chk.addEventListener('change', () => setActivo(chk.checked));
    interruptor.addEventListener('click', (e) => e.stopPropagation());
    body.appendChild(interruptor);
    ACCIONES.forEach((a) => {
      const btn = mkBtn('', '', () => {
        plegarPanel();
        run(a.label, a.fn);
      });
      btn.innerHTML = `<span>${a.label}</span><kbd>${fmtAtajo(CONFIG.atajos[a.id])}</kbd>`;
      btn.dataset.accion = a.id;
      if (a.soloEn) btn.hidden = true;
      body.appendChild(btn);
    });
    const ayuda = mkBtn('', 'Qué hace cada función del Asistente ALMA', () => {
      plegarPanel();
      mostrarAyuda();
    });
    ayuda.className = 'almah-ayuda-btn';
    ayuda.textContent = '❓ Ayuda';
    body.appendChild(ayuda);
    panel.appendChild(body);
    panel.classList.toggle('almah-off', !activo);
    document.body.appendChild(panel);
    aplicarPosicion(panel);
    window.addEventListener('resize', () => aplicarPosicion(panel));
  }

  // Muestra los botones contextuales (p. ej. "Ocultar terminados" solo en Medicamentos).
  // Al aparecer, el botón pulsa y la pestaña plegada muestra un punto naranjo.
  function actualizarPanelContextual() {
    const panel = document.getElementById('almah-panel');
    if (!panel) return;
    let alguno = false;
    ACCIONES.filter((a) => a.soloEn).forEach((a) => {
      const btn = panel.querySelector(`[data-accion="${a.id}"]`);
      const visible = !!a.soloEn();
      alguno = alguno || visible;
      if (btn.hidden === !visible) return;
      btn.hidden = !visible;
      if (visible) {
        btn.classList.add('almah-nuevo');
        setTimeout(() => btn.classList.remove('almah-nuevo'), 4000);
      }
    });
    panel.classList.toggle('almah-hay-contexto', alguno);
    const t = panel.querySelector('[data-accion="ocultarTerminados"] span');
    const txt = ocultarTerminados ? '👁️ Mostrar terminados' : '👁️ Ocultar terminados';
    if (t && t.textContent !== txt) t.textContent = txt;
  }

  function togglePanel() {
    const p = document.getElementById('almah-panel');
    const c = p.classList.toggle('almah-collapsed');
    try { localStorage.setItem('almah-collapsed', c ? '1' : '0'); } catch (e) { /* sin storage */ }
    aplicarPosicion(p);
  }

  function plegarPanel() {
    const p = document.getElementById('almah-panel');
    if (p && !p.classList.contains('almah-collapsed')) togglePanel();
  }

  // Posición guardada { top } (borde derecho) o { top, left } tras arrastrar,
  // siempre dentro de la ventana.
  function aplicarPosicion(panel) {
    let pos = null;
    try { pos = JSON.parse(localStorage.getItem('almah-pos') || 'null'); } catch (e) { /* sin storage */ }
    const r = panel.getBoundingClientRect();
    const top = pos ? pos.top : (window.innerHeight - r.height) / 2;
    panel.style.top = `${Math.max(0, Math.min(top, window.innerHeight - r.height))}px`;
    if (pos && pos.left != null) {
      panel.style.left = `${Math.max(0, Math.min(pos.left, window.innerWidth - r.width))}px`;
      panel.style.right = 'auto';
    } else {
      panel.style.left = 'auto';
      panel.style.right = '0';
    }
  }

  // Panel soltado cerca del borde derecho: queda pegado al borde (solo se guarda la altura)
  function guardarPosicionPanel(panel) {
    const nr = panel.getBoundingClientRect();
    const pegado = window.innerWidth - nr.right < 80;
    const pos = pegado ? { top: nr.top } : { top: nr.top, left: nr.left };
    try { localStorage.setItem('almah-pos', JSON.stringify(pos)); } catch (err) { /* sin storage */ }
    aplicarPosicion(panel);
  }

  // Arrastrar desde `asa`; un clic sin movimiento ejecuta `alClic` y al soltar tras
  // moverlo se llama `alSoltar` (guarda la posición).
  function hacerArrastrable(panel, asa, alClic, alSoltar = guardarPosicionPanel) {
    asa.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const r = panel.getBoundingClientRect();
      const dx = e.clientX - r.left;
      const dy = e.clientY - r.top;
      let movido = false;
      const mover = (ev) => {
        if (!movido && Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) < 5) return;
        movido = true;
        panel.style.left = `${ev.clientX - dx}px`;
        panel.style.top = `${ev.clientY - dy}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
      };
      const soltar = () => {
        document.removeEventListener('mousemove', mover);
        document.removeEventListener('mouseup', soltar);
        if (!movido) return alClic();
        alSoltar(panel);
      };
      document.addEventListener('mousemove', mover);
      document.addEventListener('mouseup', soltar);
    });
  }

  // ---------------------------------------------------------------------------
  // Atajos de teclado
  // ---------------------------------------------------------------------------
  function coincide(e, a) {
    return (
      e.key.toLowerCase() === a.key &&
      !!e.altKey === !!a.alt &&
      !!e.ctrlKey === !!a.ctrl &&
      !!e.shiftKey === !!a.shift
    );
  }

  document.addEventListener(
    'keydown',
    (e) => {
      if (coincide(e, CONFIG.atajos.togglePanel)) {
        e.preventDefault();
        return togglePanel();
      }
      if (!activo) return; // desactivado: solo Alt+A (abrir el panel para reactivar)
      const a = ACCIONES.find((x) => coincide(e, CONFIG.atajos[x.id]));
      if (a) {
        e.preventDefault();
        e.stopPropagation();
        run(a.label, a.fn);
      }
    },
    true
  );

  // ---------------------------------------------------------------------------
  // Estilos
  // ---------------------------------------------------------------------------
  const css = `
    #almah-panel { position: fixed; right: 0; top: 40%; z-index: 99999;
      font: 13px/1.3 system-ui, sans-serif; background: #fff; border: 1px solid #007067;
      border-radius: 8px 0 0 8px; box-shadow: 0 4px 16px rgba(0,0,0,.2); overflow: hidden; min-width: 200px; }
    #almah-panel .almah-head { background: #007067; color: #fff; padding: 6px 10px; cursor: move;
      font-weight: 700; user-select: none; display: flex; gap: 6px; align-items: center; }
    #almah-panel.almah-collapsed { min-width: 0; opacity: .85; }
    #almah-panel.almah-collapsed:hover { opacity: 1; }
    #almah-panel .almah-version { font-weight: 400; font-size: 11px; opacity: .8; margin-left: auto; }
    /* Plegado: pestaña con texto vertical pegada al borde (se lee de abajo hacia arriba) */
    #almah-panel.almah-collapsed .almah-head { writing-mode: vertical-rl; transform: rotate(180deg);
      padding: 10px 6px; cursor: pointer; letter-spacing: .5px; }
    #almah-panel.almah-collapsed .almah-rayo { transform: rotate(180deg); }
    #almah-panel.almah-collapsed .almah-version { display: none; }
    /* Botones contextuales (solo en ciertas pantallas): naranjo y con pulso al aparecer */
    #almah-panel .almah-btn[hidden] { display: none !important; }
    /* Interruptor general */
    #almah-panel .almah-interruptor { display: flex; align-items: center; gap: 6px; padding: 2px 4px 6px;
      border-bottom: 1px solid #e0e0e0; margin-bottom: 2px; cursor: pointer; font-size: 12px; color: #333; user-select: none; }
    #almah-panel .almah-interruptor > span:first-child { flex: 1; font-weight: 600; }
    #almah-panel .almah-interruptor input { display: none; }
    #almah-panel .almah-switch { width: 30px; height: 16px; border-radius: 8px; background: #9aa0a6; position: relative; transition: background .2s; }
    #almah-panel .almah-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px;
      border-radius: 50%; background: #fff; transition: left .2s; }
    #almah-panel .almah-interruptor input:checked + .almah-switch { background: #1e8e3e; }
    #almah-panel .almah-interruptor input:checked + .almah-switch::after { left: 16px; }
    #almah-panel .almah-switch-txt::after { content: 'Apagado'; color: #80868b; font-size: 11px; }
    #almah-panel .almah-interruptor input:checked ~ .almah-switch-txt::after { content: 'Activo'; color: #1e8e3e; }
    #almah-panel .almah-estado { display: none; font-weight: 400; }
    #almah-panel.almah-off .almah-estado { display: inline; }
    #almah-panel.almah-off .almah-head { background: #80868b; }
    #almah-panel.almah-off { border-color: #80868b; }
    #almah-panel.almah-off .almah-body .almah-btn { display: none; }
    #almah-panel.almah-off .almah-punto { display: none !important; }
    #almah-panel .almah-ayuda-btn { cursor: pointer; border: none; background: none; color: #00554e;
      font-size: 12px; padding: 4px 2px 0; text-align: left; text-decoration: underline; }
    #almah-panel.almah-off .almah-ayuda-btn { display: block; }
    #almah-dialogo .almah-ayuda { max-width: 520px; max-height: 80vh; overflow-y: auto; gap: 2px; font-size: 13px; }
    #almah-dialogo .almah-ayuda h4 { margin: 8px 0 0; font-size: 13px; color: #007067; }
    #almah-dialogo .almah-ayuda p { font-weight: 400; margin: 2px 0; color: #333; }
    #almah-dialogo .almah-ayuda > p:first-child { font-weight: 700; }
    #almah-dialogo .almah-ayuda .almah-grupo { margin: 0; }
    #almah-dialogo .almah-ayuda small { color: #5f6368; margin: 8px 0 4px; }
    #almah-dialogo .almah-ayuda .almah-ayuda-web { font-size: 12.5px; margin: 0 0 6px; }
    #almah-dialogo .almah-ayuda a { color: #007067; font-weight: 600; }
    #almah-dialogo kbd { font: 11px monospace; color: #555; background: #f2f2f2; border: 1px solid #ccc; border-radius: 3px; padding: 0 4px; }
    .almah-examenes { display: flex; flex-direction: column; gap: 4px; padding: 4px 6px;
      margin: 4px 0; background: #f4faf9; border-left: 3px solid #007067; }
    .almah-fila { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    .almah-select { font: 11px system-ui, sans-serif; color: #00554e; background: #e8f4f3;
      border: 1px solid #007067; border-radius: 4px; padding: 1px 2px; max-width: 160px; cursor: pointer; }
    .almah-examenes-titulo { font: 600 11px system-ui, sans-serif; color: #00554e; margin-right: 2px; }
    .almah-examenes .almah-set { font-weight: 700; background: #d7efec; }
    .almah-examenes .almah-6am.almah-activo { background: #e37400; border-color: #e37400; color: #fff; font-weight: 700; }
    #almah-panel .almah-btn[data-accion="ocultarTerminados"] { background: #fff4e0; border-color: #e37400; color: #8a4500; }
    #almah-panel .almah-btn[data-accion="ocultarTerminados"]:hover { background: #e37400; color: #fff; }
    #almah-panel .almah-nuevo { animation: almah-pulso 1s ease-out 4; }
    @keyframes almah-pulso { 0% { box-shadow: 0 0 0 0 rgba(227,116,0,.8); } 100% { box-shadow: 0 0 0 10px rgba(227,116,0,0); } }
    #almah-panel .almah-punto { display: none; width: 9px; height: 9px; border-radius: 50%; background: #ff9f1c;
      animation: almah-pulso 1.2s ease-out infinite; flex: none; }
    #almah-panel.almah-collapsed.almah-hay-contexto .almah-punto { display: inline-block; }
    #almah-panel.almah-collapsed .almah-body { display: none; }
    #almah-panel .almah-body { display: flex; flex-direction: column; padding: 6px; gap: 4px; }
    #almah-panel .almah-body .almah-btn { display: flex; justify-content: space-between; gap: 12px;
      padding: 6px 8px; font-size: 13px; }
    #almah-panel kbd { font: 11px monospace; color: #555; background: #f2f2f2; border: 1px solid #ccc;
      border-radius: 3px; padding: 0 4px; }
    .almah-btn { cursor: pointer; border: 1px solid #007067; background: #e8f4f3; color: #00554e;
      border-radius: 4px; padding: 2px 6px; font-size: 11px; }
    .almah-btn:hover { background: #007067; color: #fff; }
    #almah-meds-flot { position: fixed; left: 16px; bottom: 0; z-index: 99998; max-width: 420px; min-width: 220px;
      font: 12px/1.35 system-ui, sans-serif; background: #fff; border: 1px solid #007067; border-radius: 8px 8px 0 0;
      box-shadow: 0 4px 16px rgba(0,0,0,.2); overflow: hidden; }
    #almah-meds-flot[hidden] { display: none; }
    #almah-meds-flot .almah-meds-head { background: #007067; color: #fff; padding: 5px 10px; cursor: move;
      user-select: none; display: flex; gap: 8px; align-items: baseline; font-weight: 700; }
    #almah-meds-flot .almah-meds-head small { font-weight: 400; opacity: .8; font-size: 10.5px; margin-left: auto; }
    #almah-meds-flot .almah-meds-flecha::after { content: '\\25BE'; }
    #almah-meds-flot.almah-collapsed .almah-meds-flecha::after { content: '\\25B4'; }
    #almah-meds-flot ul { margin: 0; padding: 6px 10px 8px 26px; max-height: 40vh; overflow-y: auto; color: #222; }
    #almah-meds-flot li { margin: 1px 0; }
    #almah-meds-flot li.almah-renovar { color: #8a4500; }
    #almah-meds-flot li.almah-renovar::after { content: 'por renovar'; font: 700 9.5px/1.6 system-ui, sans-serif;
      color: #fff; background: #e37400; border-radius: 3px; padding: 0 4px; margin-left: 6px; vertical-align: middle; }
    #almah-meds-flot.almah-collapsed ul { display: none; }
    #almah-meds-flot.almah-collapsed { opacity: .9; }
    #almah-meds-flot.almah-sin-datos .almah-meds-head { cursor: pointer; }
    #almah-meds-flot .almah-meds-link { text-decoration: underline; }
    .almah-bedbar { display: flex; flex-wrap: wrap; gap: 4px; padding: 3px 4px; }
    #almah-toast { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%);
      background: #007067; color: #fff; padding: 8px 14px; border-radius: 6px; z-index: 100000;
      font: 13px system-ui, sans-serif; opacity: 0; transition: opacity .2s; pointer-events: none; }
    #almah-toast.almah-show { opacity: 1; }
    #almah-toast.almah-error { background: #b3261e; }
    tr[data-almah-med="vigente"] { background: #e6f4ea !important; box-shadow: inset 4px 0 #1e8e3e; }
    tr[data-almah-med="renovar"] { background: #fff4e0 !important; box-shadow: inset 4px 0 #e37400; }
    tr[data-almah-med="terminado"] { opacity: .5; box-shadow: inset 4px 0 #9aa0a6; }
    tr[data-almah-med="suspendido"] { opacity: .5; box-shadow: inset 4px 0 #b3261e; }
    tr[data-almah-med="suspendido"] [id$="-item-OrderName-link"] { text-decoration: line-through; }
    tr.almah-oculto { display: none !important; }
    .almah-badge { display: inline-block; font: 700 10px/1.6 system-ui, sans-serif; padding: 0 5px;
      border-radius: 3px; margin-right: 4px; color: #fff; vertical-align: middle; }
    .almah-badge-vigente { background: #1e8e3e; }
    .almah-badge-renovar { background: #e37400; }
    .almah-badge-terminado { background: #80868b; }
    .almah-badge-suspendido { background: #b3261e; }
    .almah-aviso { cursor: pointer; font: 12px system-ui, sans-serif; color: #5f6368; background: #f1f3f4;
      border-left: 4px solid #9aa0a6; padding: 4px 8px; margin: 2px 0; user-select: none; }
    .almah-aviso:hover { background: #e8eaed; }
    tr.almah-filtrada { opacity: .45; }
    #almah-dialogo { position: fixed; inset: 0; z-index: 100001; background: rgba(0,0,0,.35);
      display: flex; align-items: center; justify-content: center; }
    #almah-dialogo .almah-dialogo-caja { background: #fff; border-radius: 8px; padding: 16px;
      max-width: 420px; display: flex; flex-direction: column; gap: 8px;
      font: 14px/1.4 system-ui, sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,.3); }
    #almah-dialogo p { margin: 0 0 4px; font-weight: 600; color: #333; }
    #almah-dialogo .almah-btn { display: flex; justify-content: space-between; gap: 12px;
      padding: 8px 10px; font-size: 14px; text-align: left; }
    #almah-dialogo .almah-btn small { display: block; font-weight: 400; color: #5f6368; margin-top: 2px; }
    #almah-dialogo .almah-btn:hover small { color: #e8f4f3; }
    #almah-dialogo .almah-cancelar { justify-content: center; background: #f1f3f4; border-color: #9aa0a6; color: #333; }
  `;
  const style = document.createElement('style');
  style.id = 'almah-style';
  style.textContent = css;
  document.head.appendChild(style);

  // ---------------------------------------------------------------------------
  // Arranque: ALMA es una SPA, así que observamos cambios del DOM
  // ---------------------------------------------------------------------------
  console.info(`[ALMA Helper] v${VERSION} cargado`);
  aplicarPerfil();
  if (activo) decorarTodo();
  let pending = false;
  // ¿El cambio es solo del propio script (botones, avisos, insignias)? Entonces se ignora
  const esPropio = (n) => n.nodeType !== 1 || /almah/.test(`${n.id} ${n.className}`);
  new MutationObserver((cambios) => {
    if (cambios.every((c) => [...c.addedNodes, ...c.removedNodes].every(esPropio))) return;
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      aplicarPerfil();
      if (activo) decorarTodo();
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
