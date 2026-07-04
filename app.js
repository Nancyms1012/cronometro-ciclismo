// =============================================
// CRONOMETRO CICLISMO - App de registro de tiempos
// Version 2.0 - Multi-evento, categorias, premiacion
// =============================================

// --- Estado de la aplicacion ---
let corredores = [];
let llegadas = [];
let tiempoInicio = null;
let tiempoTranscurrido = 0;
let cronometroInterval = null;
let carreraEnCurso = false;
let carreraPausada = false;

// --- Elementos del DOM ---
const inputNombreCarrera = document.getElementById('nombre-carrera');
const inputDistancia = document.getElementById('distancia');
const inputEventos = document.getElementById('eventos');
const inputDorsal = document.getElementById('dorsal');
const inputNombreCorredor = document.getElementById('nombre-corredor');
const inputEquipo = document.getElementById('equipo');
const inputCategoriaCorredor = document.getElementById('categoria-corredor');
const inputEventoCorredor = document.getElementById('evento-corredor');
const btnAgregarCorredor = document.getElementById('btn-agregar-corredor');
const listaCorredores = document.getElementById('lista-corredores');
const totalCorredores = document.getElementById('total-corredores');
const tiempoDisplay = document.getElementById('tiempo-display');
const btnIniciar = document.getElementById('btn-iniciar');
const btnPausar = document.getElementById('btn-pausar');
const btnReiniciar = document.getElementById('btn-reiniciar');
const inputDorsalLlegada = document.getElementById('dorsal-llegada');
const btnRegistrarLlegada = document.getElementById('btn-registrar-llegada');
const botonesRapidos = document.getElementById('botones-rapidos');
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const btnExportar = document.getElementById('btn-exportar');
const listaPendientes = document.getElementById('lista-pendientes');
const numPendientes = document.getElementById('num-pendientes');
const filtroCat = document.getElementById('filtro-cat');
const inputArchivoCSV = document.getElementById('archivo-csv');


// --- Funciones de utilidad ---
function formatearTiempo(ms) {
    const horas = Math.floor(ms / 3600000);
    const minutos = Math.floor((ms % 3600000) / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    const milisegundos = ms % 1000;
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}.${String(milisegundos).padStart(3, '0')}`;
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    const notif = document.createElement('div');
    notif.className = `notificacion ${tipo}`;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    setTimeout(() => { notif.remove(); }, 3000);
}

function obtenerCategorias() {
    return [...new Set(corredores.map(c => c.categoria).filter(c => c))];
}

function obtenerEventos() {
    return [...new Set(corredores.map(c => c.evento).filter(e => e))];
}

function actualizarDatalistsCategorias() {
    const cats = obtenerCategorias();
    const evts = obtenerEventos();
    document.getElementById('lista-categorias').innerHTML = cats.map(c => `<option value="${c}">`).join('');
    document.getElementById('lista-eventos').innerHTML = evts.map(e => `<option value="${e}">`).join('');
    // Actualizar filtro de categorias
    const filtroActual = filtroCat.value;
    filtroCat.innerHTML = '<option value="todas">-- Todas --</option>';
    cats.forEach(c => { filtroCat.innerHTML += `<option value="${c}">${c}</option>`; });
    evts.forEach(e => { filtroCat.innerHTML += `<option value="evento:${e}">Evento: ${e}</option>`; });
    filtroCat.value = filtroActual || 'todas';
}


// --- Nueva Competencia ---
function nuevaCompetencia() {
    if (!confirm('ATENCION: Esto borrara TODOS los datos (corredores, tiempos, configuracion). Estas seguro?')) {
        return;
    }
    clearInterval(cronometroInterval);
    corredores = [];
    llegadas = [];
    tiempoInicio = null;
    tiempoTranscurrido = 0;
    carreraEnCurso = false;
    carreraPausada = false;
    inputNombreCarrera.value = '';
    inputDistancia.value = '';
    inputEventos.value = '';
    tiempoDisplay.textContent = '00:00:00.000';
    btnIniciar.disabled = false;
    btnPausar.disabled = true;
    btnReiniciar.disabled = true;
    btnRegistrarLlegada.disabled = true;
    renderizarCorredores();
    renderizarTabla();
    renderizarBotonesRapidos();
    renderizarPendientes();
    renderizarResultadosCategoria();
    renderizarPremiacion();
    actualizarDatalistsCategorias();
    localStorage.removeItem('cronometro-ciclismo');
    mostrarNotificacion('Competencia borrada. Listo para nueva carrera.', 'info');
}

// --- Corredores ---
function agregarCorredor() {
    const dorsal = inputDorsal.value.trim();
    const nombre = inputNombreCorredor.value.trim();
    const equipo = inputEquipo.value.trim();
    const categoria = inputCategoriaCorredor.value.trim();
    const evento = inputEventoCorredor.value.trim();

    if (!dorsal || !nombre) {
        mostrarNotificacion('Debes ingresar dorsal y nombre', 'error');
        return;
    }
    if (corredores.find(c => c.dorsal === dorsal)) {
        mostrarNotificacion(`El dorsal #${dorsal} ya esta registrado`, 'error');
        return;
    }
    corredores.push({ dorsal, nombre, equipo, categoria, evento });
    renderizarCorredores();
    renderizarBotonesRapidos();
    renderizarPendientes();
    actualizarDatalistsCategorias();
    inputDorsal.value = '';
    inputNombreCorredor.value = '';
    inputEquipo.value = '';
    // Mantener categoria y evento para agregar varios seguidos
    inputDorsal.focus();
    mostrarNotificacion(`Corredor #${dorsal} ${nombre} registrado`, 'exito');
}

function eliminarCorredor(dorsal) {
    if (carreraEnCurso) {
        mostrarNotificacion('No puedes eliminar corredores durante la carrera', 'error');
        return;
    }
    corredores = corredores.filter(c => c.dorsal !== dorsal);
    renderizarCorredores();
    renderizarBotonesRapidos();
    renderizarPendientes();
    actualizarDatalistsCategorias();
}


function renderizarCorredores() {
    if (corredores.length === 0) {
        listaCorredores.innerHTML = '<p class="placeholder-text">No hay corredores registrados</p>';
    } else {
        listaCorredores.innerHTML = corredores.map(c => `
            <div class="corredor-item">
                <span class="dorsal">#${c.dorsal}</span>
                <span class="nombre">${c.nombre}</span>
                ${c.equipo ? `<span class="equipo-tag">${c.equipo}</span>` : ''}
                ${c.categoria ? `<span class="categoria-tag">${c.categoria}</span>` : ''}
                ${c.evento ? `<span class="evento-tag">${c.evento}</span>` : ''}
                <button class="btn-eliminar" onclick="eliminarCorredor('${c.dorsal}')">X</button>
            </div>
        `).join('');
    }
    totalCorredores.textContent = corredores.length;
}

// --- Cronometro ---
function iniciarCronometro() {
    if (corredores.length === 0) {
        mostrarNotificacion('Debes registrar al menos un corredor', 'error');
        return;
    }
    if (carreraPausada) {
        tiempoInicio = Date.now() - tiempoTranscurrido;
        carreraPausada = false;
    } else {
        tiempoInicio = Date.now();
        tiempoTranscurrido = 0;
        llegadas = [];
        renderizarTabla();
        renderizarResultadosCategoria();
        renderizarPremiacion();
    }
    carreraEnCurso = true;
    cronometroInterval = setInterval(actualizarDisplay, 10);
    btnIniciar.disabled = true;
    btnPausar.disabled = false;
    btnReiniciar.disabled = false;
    btnRegistrarLlegada.disabled = false;
    renderizarPendientes();
    renderizarBotonesRapidos();
    mostrarNotificacion('CARRERA INICIADA!', 'exito');
}

function pausarCronometro() {
    carreraPausada = true;
    carreraEnCurso = false;
    clearInterval(cronometroInterval);
    tiempoTranscurrido = Date.now() - tiempoInicio;
    btnIniciar.disabled = false;
    btnPausar.disabled = true;
    btnRegistrarLlegada.disabled = true;
    mostrarNotificacion('Cronometro pausado', 'info');
}

function reiniciarCronometro() {
    if (!confirm('Estas seguro? Se perderan todos los tiempos (los corredores se mantienen).')) return;
    clearInterval(cronometroInterval);
    tiempoInicio = null;
    tiempoTranscurrido = 0;
    carreraEnCurso = false;
    carreraPausada = false;
    llegadas = [];
    tiempoDisplay.textContent = '00:00:00.000';
    btnIniciar.disabled = false;
    btnPausar.disabled = true;
    btnReiniciar.disabled = true;
    btnRegistrarLlegada.disabled = true;
    renderizarTabla();
    renderizarPendientes();
    renderizarBotonesRapidos();
    renderizarResultadosCategoria();
    renderizarPremiacion();
    mostrarNotificacion('Tiempos reiniciados', 'info');
}

function actualizarDisplay() {
    tiempoTranscurrido = Date.now() - tiempoInicio;
    tiempoDisplay.textContent = formatearTiempo(tiempoTranscurrido);
}


// --- Registro de llegadas ---
function registrarLlegada(dorsalParam) {
    if (!carreraEnCurso) {
        mostrarNotificacion('La carrera no esta en curso', 'error');
        return;
    }
    const dorsal = dorsalParam || inputDorsalLlegada.value.trim();
    if (!dorsal) {
        mostrarNotificacion('Ingresa un numero de dorsal', 'error');
        return;
    }
    const corredor = corredores.find(c => c.dorsal === dorsal);
    if (!corredor) {
        mostrarNotificacion(`No existe corredor con dorsal #${dorsal}`, 'error');
        return;
    }
    if (llegadas.find(l => l.dorsal === dorsal)) {
        mostrarNotificacion(`El corredor #${dorsal} ya cruzo la meta`, 'error');
        return;
    }
    const tiempoLlegada = Date.now() - tiempoInicio;
    llegadas.push({
        posicion: llegadas.length + 1,
        dorsal: corredor.dorsal,
        nombre: corredor.nombre,
        equipo: corredor.equipo,
        categoria: corredor.categoria,
        evento: corredor.evento,
        tiempo: tiempoLlegada,
        tiempoFormateado: formatearTiempo(tiempoLlegada)
    });
    inputDorsalLlegada.value = '';
    renderizarTabla();
    renderizarPendientes();
    renderizarBotonesRapidos();
    renderizarResultadosCategoria();
    renderizarPremiacion();
    mostrarNotificacion(`#${dorsal} ${corredor.nombre} - Pos. ${llegadas.length} - ${formatearTiempo(tiempoLlegada)}`, 'exito');
    if (llegadas.length === corredores.length) {
        mostrarNotificacion('TODOS LOS CORREDORES HAN LLEGADO!', 'info');
    }
}

function registrarLlegadaRapida(dorsal) {
    registrarLlegada(dorsal);
}

// --- Tabla general ---
function renderizarTabla() {
    if (llegadas.length === 0) {
        cuerpoTabla.innerHTML = '<tr><td colspan="8" class="tabla-vacia">No hay llegadas registradas</td></tr>';
        return;
    }
    const tiempoPrimero = llegadas[0].tiempo;
    cuerpoTabla.innerHTML = llegadas.map((l, i) => {
        const diferencia = i === 0 ? '-' : `+${formatearTiempo(l.tiempo - tiempoPrimero)}`;
        return `<tr>
            <td>${l.posicion}</td>
            <td>#${l.dorsal}</td>
            <td>${l.nombre}</td>
            <td>${l.equipo || '-'}</td>
            <td>${l.categoria || '-'}</td>
            <td>${l.evento || '-'}</td>
            <td>${l.tiempoFormateado}</td>
            <td>${diferencia}</td>
        </tr>`;
    }).join('');
}


// --- Botones rapidos (solo pendientes, ordenados) ---
function renderizarBotonesRapidos() {
    const dorsalesLlegados = llegadas.map(l => l.dorsal);
    const pendientes = corredores
        .filter(c => !dorsalesLlegados.includes(c.dorsal))
        .sort((a, b) => Number(a.dorsal) - Number(b.dorsal));

    if (pendientes.length === 0) {
        botonesRapidos.innerHTML = '<p class="botones-rapidos-titulo">Todos los corredores han llegado</p>';
        return;
    }

    botonesRapidos.innerHTML = '<p class="botones-rapidos-titulo">Toque rapido (solo pendientes, ordenados):</p>';
    botonesRapidos.innerHTML += pendientes.map(c => `
        <button class="btn-dorsal-rapido" onclick="registrarLlegadaRapida('${c.dorsal}')" title="${c.nombre} - ${c.categoria || 'Sin cat.'}">${c.dorsal}</button>
    `).join('');
}

// --- Pendientes y contador ---
function renderizarPendientes() {
    const dorsalesLlegados = llegadas.map(l => l.dorsal);
    const pendientes = corredores.filter(c => !dorsalesLlegados.includes(c.dorsal));

    // Actualizar contador
    numPendientes.textContent = pendientes.length;

    if (!carreraEnCurso && !carreraPausada) {
        listaPendientes.innerHTML = '<p class="placeholder-text">Inicia la carrera para ver los corredores pendientes</p>';
        return;
    }
    if (pendientes.length === 0) {
        listaPendientes.innerHTML = '<p class="placeholder-text">Todos los corredores han llegado!</p>';
        return;
    }
    listaPendientes.innerHTML = pendientes.map(c => `
        <span class="pendiente-tag">#${c.dorsal} ${c.nombre}${c.categoria ? ' (' + c.categoria + ')' : ''}</span>
    `).join('');
}

// --- Resultados por categoria ---
function renderizarResultadosCategoria() {
    const container = document.getElementById('resultados-por-categoria');
    if (llegadas.length === 0) {
        container.innerHTML = '<p class="placeholder-text">No hay resultados aun</p>';
        return;
    }

    const filtro = filtroCat.value;
    let llegadasFiltradas = [...llegadas];

    if (filtro !== 'todas') {
        if (filtro.startsWith('evento:')) {
            const evt = filtro.replace('evento:', '');
            llegadasFiltradas = llegadas.filter(l => l.evento === evt);
        } else {
            llegadasFiltradas = llegadas.filter(l => l.categoria === filtro);
        }
    }

    // Agrupar por categoria
    const categorias = {};
    llegadasFiltradas.forEach(l => {
        const cat = l.categoria || 'Sin categoria';
        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push(l);
    });

    if (Object.keys(categorias).length === 0) {
        container.innerHTML = '<p class="placeholder-text">No hay resultados para este filtro</p>';
        return;
    }

    let html = '';
    Object.keys(categorias).sort().forEach(cat => {
        const grupo = categorias[cat];
        const primerTiempo = grupo[0].tiempo;
        html += `<div class="categoria-bloque">
            <h3>${cat} (${grupo.length} corredores)</h3>
            <div class="tabla-container"><table>
                <thead><tr><th>Pos. Cat.</th><th>Dorsal</th><th>Nombre</th><th>Equipo</th><th>Evento</th><th>Tiempo</th><th>Dif. Categoria</th></tr></thead>
                <tbody>`;
        grupo.forEach((l, i) => {
            const dif = i === 0 ? '-' : `+${formatearTiempo(l.tiempo - primerTiempo)}`;
            html += `<tr><td>${i + 1}</td><td>#${l.dorsal}</td><td>${l.nombre}</td><td>${l.equipo || '-'}</td><td>${l.evento || '-'}</td><td>${l.tiempoFormateado}</td><td>${dif}</td></tr>`;
        });
        html += `</tbody></table></div></div>`;
    });
    container.innerHTML = html;
}


// --- Premiacion: Top 5 por categoria ---
function renderizarPremiacion() {
    const container = document.getElementById('premiacion-container');
    if (llegadas.length === 0) {
        container.innerHTML = '<p class="placeholder-text">Inicia la carrera para ver la premiacion</p>';
        return;
    }

    const categorias = {};
    // Contar total de corredores por categoria
    const totalPorCategoria = {};
    corredores.forEach(c => {
        const cat = c.categoria || 'Sin categoria';
        if (!totalPorCategoria[cat]) totalPorCategoria[cat] = 0;
        totalPorCategoria[cat]++;
    });

    llegadas.forEach(l => {
        const cat = l.categoria || 'Sin categoria';
        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push(l);
    });

    // Tambien mostrar categorias sin llegadas
    Object.keys(totalPorCategoria).forEach(cat => {
        if (!categorias[cat]) categorias[cat] = [];
    });

    let html = '';
    Object.keys(categorias).sort().forEach(cat => {
        const grupo = categorias[cat];
        const totalCat = totalPorCategoria[cat] || 0;
        const necesariosParaPremiar = Math.min(5, totalCat);
        const listaParaPremiar = grupo.length >= necesariosParaPremiar && necesariosParaPremiar > 0;
        const top5 = grupo.slice(0, 5);

        const claseCard = listaParaPremiar ? 'premiacion-card lista-premiar' : 'premiacion-card';
        const estadoTexto = listaParaPremiar ? '<span class="estado-premiacion estado-listo">LISTA PARA PREMIAR</span>' : `<span class="estado-premiacion estado-pendiente">Faltan ${necesariosParaPremiar - grupo.length} de ${necesariosParaPremiar}</span>`;

        html += `<div class="${claseCard}">
            <h3>${cat} ${estadoTexto}</h3>`;

        if (top5.length > 0) {
            const primerTiempo = top5[0].tiempo;
            html += `<div class="tabla-container"><table class="premiacion-tabla">
                <thead><tr><th>Pos.</th><th>Dorsal</th><th>Nombre</th><th>Equipo</th><th>Tiempo</th><th>Dif.</th></tr></thead>
                <tbody>`;
            top5.forEach((l, i) => {
                const dif = i === 0 ? '-' : `+${formatearTiempo(l.tiempo - primerTiempo)}`;
                html += `<tr><td>${i + 1}</td><td>#${l.dorsal}</td><td>${l.nombre}</td><td>${l.equipo || '-'}</td><td>${l.tiempoFormateado}</td><td>${dif}</td></tr>`;
            });
            html += `</tbody></table></div>`;
        } else {
            html += `<p class="placeholder-text">Aun no hay llegadas en esta categoria</p>`;
        }
        html += `</div>`;
    });
    container.innerHTML = html;
}


// --- Importar desde CSV ---
function descargarPlantilla() {
    const plantilla = 'Dorsal,Nombre,Equipo,Categoria,Evento\n1,Juan Perez,Equipo Rojo,Elite,Reto\n2,Maria Garcia,Equipo Azul,Elite,Reto\n3,Carlos Lopez,Equipo Verde,Sub-23,Endurance\n4,Ana Martinez,Club Ciclista,Master,Endurance\n';
    const blob = new Blob([plantilla], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_corredores.csv';
    link.click();
    mostrarNotificacion('Plantilla descargada', 'info');
}

function procesarArchivoCSV(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;
    const extension = archivo.name.split('.').pop().toLowerCase();
    if (extension === 'xlsx' || extension === 'xls') {
        mostrarNotificacion('Para Excel (.xlsx), primero guardalo como CSV: Archivo > Guardar como > CSV', 'error');
        inputArchivoCSV.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const contenido = e.target.result;
        const importados = parsearCSV(contenido);
        if (importados.length === 0) {
            mostrarNotificacion('No se encontraron corredores en el archivo', 'error');
            inputArchivoCSV.value = '';
            return;
        }
        mostrarPrevisualizacion(importados);
        inputArchivoCSV.value = '';
    };
    reader.readAsText(archivo, 'UTF-8');
}

function parsearCSV(texto) {
    const lineas = texto.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lineas.length < 2) return [];
    const primeraLinea = lineas[0];
    let separador = ',';
    if (primeraLinea.includes(';')) separador = ';';
    else if (primeraLinea.includes('\t')) separador = '\t';

    const encabezados = lineas[0].split(separador).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const iDorsal = encabezados.findIndex(h => h.includes('dorsal') || h.includes('numero') || h.includes('num') || h.includes('#'));
    const iNombre = encabezados.findIndex(h => h.includes('nombre') || h.includes('corredor') || h.includes('name'));
    const iEquipo = encabezados.findIndex(h => h.includes('equipo') || h.includes('team') || h.includes('club'));
    const iCategoria = encabezados.findIndex(h => h.includes('categoria') || h.includes('category') || h.includes('cat'));
    const iEvento = encabezados.findIndex(h => h.includes('evento') || h.includes('event') || h.includes('modalidad'));

    if (iDorsal === -1 || iNombre === -1) {
        const resultados = [];
        for (let i = 0; i < lineas.length; i++) {
            const cols = parsearLineaCSV(lineas[i], separador);
            if (cols.length >= 2 && !isNaN(cols[0])) {
                resultados.push({ dorsal: cols[0].trim(), nombre: cols[1].trim(), equipo: cols[2] ? cols[2].trim() : '', categoria: cols[3] ? cols[3].trim() : '', evento: cols[4] ? cols[4].trim() : '' });
            }
        }
        return resultados;
    }

    const resultados = [];
    for (let i = 1; i < lineas.length; i++) {
        const cols = parsearLineaCSV(lineas[i], separador);
        if (cols.length < 2) continue;
        const dorsal = cols[iDorsal] ? cols[iDorsal].trim() : '';
        const nombre = cols[iNombre] ? cols[iNombre].trim() : '';
        if (!dorsal || !nombre) continue;
        resultados.push({
            dorsal,
            nombre,
            equipo: iEquipo !== -1 && cols[iEquipo] ? cols[iEquipo].trim() : '',
            categoria: iCategoria !== -1 && cols[iCategoria] ? cols[iCategoria].trim() : '',
            evento: iEvento !== -1 && cols[iEvento] ? cols[iEvento].trim() : ''
        });
    }
    return resultados;
}

function parsearLineaCSV(linea, separador) {
    const resultado = [];
    let actual = '';
    let dentroComillas = false;
    for (let i = 0; i < linea.length; i++) {
        const char = linea[i];
        if (char === '"' || char === "'") { dentroComillas = !dentroComillas; }
        else if (char === separador && !dentroComillas) { resultado.push(actual.trim()); actual = ''; }
        else { actual += char; }
    }
    resultado.push(actual.trim());
    return resultado;
}


function mostrarPrevisualizacion(importados) {
    const categorias = [...new Set(importados.map(c => c.categoria).filter(c => c))];
    const eventos = [...new Set(importados.map(c => c.evento).filter(e => e))];

    let tablaHTML = '';
    importados.forEach(c => {
        tablaHTML += `<tr><td>${c.dorsal}</td><td>${c.nombre}</td><td>${c.equipo || '-'}</td><td>${c.categoria || '-'}</td><td>${c.evento || '-'}</td></tr>`;
    });

    let infoExtra = '';
    if (categorias.length > 0) infoExtra += `Categorias: <span>${categorias.join(', ')}</span><br>`;
    if (eventos.length > 0) infoExtra += `Eventos: <span>${eventos.join(', ')}</span>`;

    const tieneCorredoresExistentes = corredores.length > 0;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-importar';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Vista previa de importacion</h3>
            <p class="modal-info">Se encontraron <span>${importados.length}</span> corredores. ${infoExtra}</p>
            <table class="modal-tabla">
                <thead><tr><th>Dorsal</th><th>Nombre</th><th>Equipo</th><th>Categoria</th><th>Evento</th></tr></thead>
                <tbody>${tablaHTML}</tbody>
            </table>
            <div class="modal-botones">
                <button class="btn btn-cancelar-import" onclick="cerrarModal()">Cancelar</button>
                ${tieneCorredoresExistentes ? `<button class="btn btn-reemplazar-import" onclick="confirmarImportacion('reemplazar')">REEMPLAZAR todos (${importados.length})</button>` : ''}
                <button class="btn btn-confirmar-import" onclick="confirmarImportacion('agregar')">AGREGAR a los existentes</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    window._corredoresParaImportar = importados;
}

function cerrarModal() {
    const modal = document.getElementById('modal-importar');
    if (modal) modal.remove();
    window._corredoresParaImportar = null;
}

function confirmarImportacion(modo) {
    const nuevos = window._corredoresParaImportar;
    if (!nuevos) return;

    if (modo === 'reemplazar') {
        corredores = [];
        llegadas = [];
    }

    let agregados = 0;
    let duplicados = 0;
    nuevos.forEach(c => {
        if (corredores.find(ex => ex.dorsal === c.dorsal)) {
            duplicados++;
        } else {
            corredores.push({ dorsal: c.dorsal, nombre: c.nombre, equipo: c.equipo || '', categoria: c.categoria || '', evento: c.evento || '' });
            agregados++;
        }
    });

    // Actualizar campo de eventos si se detectaron
    const eventosDetectados = [...new Set(nuevos.map(c => c.evento).filter(e => e))];
    if (eventosDetectados.length > 0 && !inputEventos.value) {
        inputEventos.value = eventosDetectados.join(', ');
    }

    renderizarCorredores();
    renderizarBotonesRapidos();
    renderizarPendientes();
    renderizarTabla();
    renderizarResultadosCategoria();
    renderizarPremiacion();
    actualizarDatalistsCategorias();
    cerrarModal();

    let mensaje = modo === 'reemplazar' ? `Reemplazados. ${agregados} corredores cargados.` : `${agregados} corredores agregados.`;
    if (duplicados > 0) mensaje += ` (${duplicados} duplicados omitidos)`;
    mostrarNotificacion(mensaje, 'exito');
}


// --- Exportar CSV ---
function exportarCSV() {
    if (llegadas.length === 0) {
        mostrarNotificacion('No hay resultados para exportar', 'error');
        return;
    }
    const nombreCarrera = inputNombreCarrera.value || 'Carrera';
    const distancia = inputDistancia.value || '';

    let csv = 'Posicion,Dorsal,Nombre,Equipo,Categoria,Evento,Tiempo,Diferencia General,Pos. Categoria,Dif. Categoria\n';
    const tiempoPrimero = llegadas[0].tiempo;

    // Calcular posicion por categoria
    const posCategoria = {};
    const primeroPorCategoria = {};
    llegadas.forEach(l => {
        const cat = l.categoria || 'Sin categoria';
        if (!posCategoria[cat]) posCategoria[cat] = 0;
        posCategoria[cat]++;
        if (!primeroPorCategoria[cat]) primeroPorCategoria[cat] = l.tiempo;
    });

    const posCatContador = {};
    llegadas.forEach((l, i) => {
        const cat = l.categoria || 'Sin categoria';
        if (!posCatContador[cat]) posCatContador[cat] = 0;
        posCatContador[cat]++;
        const difGeneral = i === 0 ? '-' : `+${formatearTiempo(l.tiempo - tiempoPrimero)}`;
        const difCat = posCatContador[cat] === 1 ? '-' : `+${formatearTiempo(l.tiempo - primeroPorCategoria[cat])}`;
        csv += `${l.posicion},${l.dorsal},"${l.nombre}","${l.equipo || ''}","${l.categoria || ''}","${l.evento || ''}",${l.tiempoFormateado},${difGeneral},${posCatContador[cat]},${difCat}\n`;
    });

    // DNF
    const dorsalesLlegados = llegadas.map(l => l.dorsal);
    corredores.filter(c => !dorsalesLlegados.includes(c.dorsal)).forEach(c => {
        csv += `DNF,${c.dorsal},"${c.nombre}","${c.equipo || ''}","${c.categoria || ''}","${c.evento || ''}",DNF,-,-,-\n`;
    });

    let encabezado = `Carrera: ${nombreCarrera}\n`;
    if (distancia) encabezado += `Distancia: ${distancia} km\n`;
    encabezado += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n`;
    encabezado += `Total corredores: ${corredores.length}\n`;
    encabezado += `Finalizaron: ${llegadas.length}\n\n`;

    const blob = new Blob([encabezado + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resultados_${nombreCarrera.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    mostrarNotificacion('Resultados exportados', 'exito');
}

function exportarPorCategoria() {
    if (llegadas.length === 0) {
        mostrarNotificacion('No hay resultados para exportar', 'error');
        return;
    }
    const nombreCarrera = inputNombreCarrera.value || 'Carrera';
    const categorias = {};
    llegadas.forEach(l => {
        const cat = l.categoria || 'Sin categoria';
        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push(l);
    });

    let csv = `Resultados por Categoria - ${nombreCarrera}\nFecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;

    Object.keys(categorias).sort().forEach(cat => {
        const grupo = categorias[cat];
        const primerTiempo = grupo[0].tiempo;
        csv += `\n--- ${cat} (${grupo.length} corredores) ---\n`;
        csv += 'Pos,Dorsal,Nombre,Equipo,Evento,Tiempo,Diferencia\n';
        grupo.forEach((l, i) => {
            const dif = i === 0 ? '-' : `+${formatearTiempo(l.tiempo - primerTiempo)}`;
            csv += `${i + 1},${l.dorsal},"${l.nombre}","${l.equipo || ''}","${l.evento || ''}",${l.tiempoFormateado},${dif}\n`;
        });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resultados_por_categoria_${nombreCarrera.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    mostrarNotificacion('Resultados por categoria exportados', 'exito');
}


// --- Event Listeners ---
btnAgregarCorredor.addEventListener('click', agregarCorredor);
btnIniciar.addEventListener('click', iniciarCronometro);
btnPausar.addEventListener('click', pausarCronometro);
btnReiniciar.addEventListener('click', reiniciarCronometro);
btnRegistrarLlegada.addEventListener('click', () => registrarLlegada());
btnExportar.addEventListener('click', exportarCSV);
inputArchivoCSV.addEventListener('change', procesarArchivoCSV);

// Enter para agregar corredor
[inputNombreCorredor, inputEquipo, inputCategoriaCorredor, inputEventoCorredor].forEach(el => {
    el.addEventListener('keypress', (e) => { if (e.key === 'Enter') agregarCorredor(); });
});

// Enter para registrar llegada
inputDorsalLlegada.addEventListener('keypress', (e) => { if (e.key === 'Enter') registrarLlegada(); });

// --- Guardar datos en localStorage ---
function guardarDatos() {
    const datos = {
        nombreCarrera: inputNombreCarrera.value,
        distancia: inputDistancia.value,
        eventos: inputEventos.value,
        corredores,
        llegadas,
    };
    localStorage.setItem('cronometro-ciclismo', JSON.stringify(datos));
}

function cargarDatos() {
    const datos = localStorage.getItem('cronometro-ciclismo');
    if (datos) {
        const parsed = JSON.parse(datos);
        inputNombreCarrera.value = parsed.nombreCarrera || '';
        inputDistancia.value = parsed.distancia || '';
        inputEventos.value = parsed.eventos || '';
        corredores = parsed.corredores || [];
        llegadas = parsed.llegadas || [];
        renderizarCorredores();
        renderizarTabla();
        renderizarBotonesRapidos();
        renderizarPendientes();
        renderizarResultadosCategoria();
        renderizarPremiacion();
        actualizarDatalistsCategorias();
    }
}

// Guardar automaticamente cada 5 segundos
setInterval(guardarDatos, 5000);
cargarDatos();
window.addEventListener('beforeunload', guardarDatos);
