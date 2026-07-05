// =============================================
// CRONOMETRO CICLISMO v3.0
// Multi-evento, salidas escalonadas, premiacion
// =============================================

// --- Estado ---
let corredores = [];
let llegadas = [];
let salidasDesfase = {}; // { "categoria": minutos_desfase }
let tiempoInicio = null;
let tiempoTranscurrido = 0;
let cronometroInterval = null;
let carreraEnCurso = false;
let carreraPausada = false;

// --- DOM ---
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
const numPendientes = document.getElementById('num-pendientes');
const filtroCat = document.getElementById('filtro-cat');
const inputArchivoCSV = document.getElementById('archivo-csv');
const selectEventoExportar = document.getElementById('select-evento-exportar');
const selectEventoExportarCat = document.getElementById('select-evento-exportar-cat');

// --- Utilidad ---
function formatearTiempo(ms) {
    if (ms < 0) ms = 0;
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const ms2 = ms % 1000;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms2).padStart(3,'0')}`;
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    const n = document.createElement('div');
    n.className = `notificacion ${tipo}`;
    n.textContent = mensaje;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

function obtenerCategorias() {
    return [...new Set(corredores.map(c => c.categoria).filter(c => c))];
}

function obtenerEventos() {
    const evtsCorredores = corredores.map(c => c.evento).filter(e => e);
    const evtsLlegadas = llegadas.map(l => l.evento).filter(e => e);
    return [...new Set([...evtsCorredores, ...evtsLlegadas])];
}

function actualizarDatalists() {
    const cats = obtenerCategorias();
    const evts = obtenerEventos();
    document.getElementById('lista-categorias').innerHTML = cats.map(c => `<option value="${c}">`).join('');
    document.getElementById('lista-eventos').innerHTML = evts.map(e => `<option value="${e}">`).join('');
    const filtroActual = filtroCat.value;
    filtroCat.innerHTML = '<option value="todas">-- Todas --</option>';
    cats.forEach(c => { filtroCat.innerHTML += `<option value="${c}">${c}</option>`; });
    evts.forEach(e => { filtroCat.innerHTML += `<option value="evento:${e}">Evento: ${e}</option>`; });
    filtroCat.value = filtroActual || 'todas';
    // Actualizar selectores de evento para exportar
    const evtActual1 = selectEventoExportar.value;
    const evtActual2 = selectEventoExportarCat.value;
    const optsEvento = '<option value="todos">-- Todos los eventos --</option>' + evts.map(e => `<option value="${e}">${e}</option>`).join('');
    selectEventoExportar.innerHTML = optsEvento;
    selectEventoExportarCat.innerHTML = optsEvento;
    selectEventoExportar.value = evtActual1 || 'todos';
    selectEventoExportarCat.value = evtActual2 || 'todos';
}

function getDesfaseCategoria(categoria) {
    return (salidasDesfase[categoria] || 0) * 60000; // convertir min a ms
}

function getTiempoReal(llegada) {
    const desfase = getDesfaseCategoria(llegada.categoria);
    return llegada.tiempo - desfase;
}


// --- Salidas escalonadas ---
function renderizarSalidas() {
    const container = document.getElementById('salidas-container');
    const cats = obtenerCategorias();
    if (cats.length === 0) {
        container.innerHTML = '<p class="placeholder-text">Registra corredores con categorias para configurar salidas</p>';
        return;
    }
    container.innerHTML = cats.map(cat => {
        const valor = salidasDesfase[cat] || 0;
        return `<div class="salida-item">
            <label>${cat}</label>
            <input type="number" min="0" value="${valor}" onchange="actualizarDesfase('${cat}', this.value)" placeholder="0">
            <span class="desfase-info">min despues del crono</span>
        </div>`;
    }).join('');
}

function actualizarDesfase(cat, valor) {
    salidasDesfase[cat] = parseInt(valor) || 0;
}

// --- Nueva Competencia ---
function nuevaCompetencia() {
    if (!confirm('ATENCION: Esto borrara TODOS los datos. Seguro?')) return;
    clearInterval(cronometroInterval);
    corredores = []; llegadas = []; salidasDesfase = {};
    tiempoInicio = null; tiempoTranscurrido = 0;
    carreraEnCurso = false; carreraPausada = false;
    inputNombreCarrera.value = ''; inputDistancia.value = ''; inputEventos.value = '';
    tiempoDisplay.textContent = '00:00:00.000';
    btnIniciar.disabled = false; btnPausar.disabled = true;
    btnReiniciar.disabled = true; btnRegistrarLlegada.disabled = true;
    renderizarTodo();
    localStorage.removeItem('cronometro-ciclismo');
    mostrarNotificacion('Competencia borrada.', 'info');
}

function renderizarTodo() {
    renderizarCorredores(); renderizarTabla(); renderizarBotonesRapidos();
    renderizarPendientes(); renderizarResultadosCategoria();
    renderizarPremiacion(); actualizarDatalists(); renderizarSalidas();
}

// --- Corredores ---
function agregarCorredor() {
    const dorsal = inputDorsal.value.trim();
    const nombre = inputNombreCorredor.value.trim();
    const equipo = inputEquipo.value.trim();
    const categoria = inputCategoriaCorredor.value.trim();
    const evento = inputEventoCorredor.value.trim();
    if (!dorsal || !nombre) { mostrarNotificacion('Dorsal y nombre son obligatorios', 'error'); return; }
    if (corredores.find(c => c.dorsal === dorsal)) { mostrarNotificacion(`Dorsal #${dorsal} ya existe`, 'error'); return; }
    corredores.push({ dorsal, nombre, equipo, categoria, evento });
    renderizarCorredores(); renderizarBotonesRapidos(); renderizarPendientes();
    actualizarDatalists(); renderizarSalidas();
    inputDorsal.value = ''; inputNombreCorredor.value = ''; inputEquipo.value = '';
    inputDorsal.focus();
    mostrarNotificacion(`#${dorsal} ${nombre} registrado`, 'exito');
}

function eliminarCorredor(dorsal) {
    if (carreraEnCurso) { mostrarNotificacion('No puedes eliminar durante la carrera', 'error'); return; }
    corredores = corredores.filter(c => c.dorsal !== dorsal);
    renderizarCorredores(); renderizarBotonesRapidos(); renderizarPendientes();
    actualizarDatalists(); renderizarSalidas();
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
            </div>`).join('');
    }
    totalCorredores.textContent = corredores.length;
}


// --- Cronometro ---
function iniciarCronometro() {
    if (corredores.length === 0) { mostrarNotificacion('Registra al menos un corredor', 'error'); return; }
    if (carreraPausada) {
        tiempoInicio = Date.now() - tiempoTranscurrido;
        carreraPausada = false;
    } else {
        tiempoInicio = Date.now(); tiempoTranscurrido = 0;
        llegadas = [];
        renderizarTabla(); renderizarResultadosCategoria(); renderizarPremiacion();
    }
    carreraEnCurso = true;
    cronometroInterval = setInterval(actualizarDisplay, 10);
    btnIniciar.disabled = true; btnPausar.disabled = false;
    btnReiniciar.disabled = false; btnRegistrarLlegada.disabled = false;
    renderizarPendientes(); renderizarBotonesRapidos();
    mostrarNotificacion('CARRERA INICIADA!', 'exito');
}

function pausarCronometro() {
    carreraPausada = true; carreraEnCurso = false;
    clearInterval(cronometroInterval);
    tiempoTranscurrido = Date.now() - tiempoInicio;
    btnIniciar.disabled = false; btnPausar.disabled = true; btnRegistrarLlegada.disabled = true;
    mostrarNotificacion('Cronometro pausado', 'info');
}

function reiniciarCronometro() {
    if (!confirm('Se perderan todos los tiempos (corredores se mantienen).')) return;
    clearInterval(cronometroInterval);
    tiempoInicio = null; tiempoTranscurrido = 0;
    carreraEnCurso = false; carreraPausada = false; llegadas = [];
    tiempoDisplay.textContent = '00:00:00.000';
    btnIniciar.disabled = false; btnPausar.disabled = true;
    btnReiniciar.disabled = true; btnRegistrarLlegada.disabled = true;
    renderizarTabla(); renderizarPendientes(); renderizarBotonesRapidos();
    renderizarResultadosCategoria(); renderizarPremiacion();
    mostrarNotificacion('Tiempos reiniciados', 'info');
}

function actualizarDisplay() {
    tiempoTranscurrido = Date.now() - tiempoInicio;
    tiempoDisplay.textContent = formatearTiempo(tiempoTranscurrido);
}

// --- Llegadas ---
function registrarLlegada(dorsalParam) {
    if (!carreraEnCurso) { mostrarNotificacion('La carrera no esta en curso', 'error'); return; }
    const dorsal = dorsalParam || inputDorsalLlegada.value.trim();
    if (!dorsal) { mostrarNotificacion('Ingresa un dorsal', 'error'); return; }
    const corredor = corredores.find(c => c.dorsal === dorsal);
    if (!corredor) { mostrarNotificacion(`No existe dorsal #${dorsal}`, 'error'); return; }
    if (llegadas.find(l => l.dorsal === dorsal)) { mostrarNotificacion(`#${dorsal} ya cruzo la meta`, 'error'); return; }

    const tiempoCrono = Date.now() - tiempoInicio;
    const desfase = getDesfaseCategoria(corredor.categoria);
    const tiempoReal = tiempoCrono - desfase;

    llegadas.push({
        posicion: llegadas.length + 1,
        dorsal: corredor.dorsal, nombre: corredor.nombre,
        equipo: corredor.equipo, categoria: corredor.categoria,
        evento: corredor.evento,
        tiempo: tiempoCrono, tiempoReal: tiempoReal,
        tiempoFormateado: formatearTiempo(tiempoCrono),
        tiempoRealFormateado: formatearTiempo(tiempoReal)
    });

    inputDorsalLlegada.value = '';
    renderizarTabla(); renderizarPendientes(); renderizarBotonesRapidos();
    renderizarResultadosCategoria(); renderizarPremiacion();
    mostrarNotificacion(`#${dorsal} ${corredor.nombre} - ${formatearTiempo(tiempoReal)}`, 'exito');
    if (llegadas.length === corredores.length) mostrarNotificacion('TODOS HAN LLEGADO!', 'info');
}

function registrarLlegadaRapida(dorsal) { registrarLlegada(dorsal); }


// --- Tabla general ---
function renderizarTabla() {
    if (llegadas.length === 0) {
        cuerpoTabla.innerHTML = '<tr><td colspan="9" class="tabla-vacia">No hay llegadas registradas</td></tr>';
        return;
    }
    const primerTiempo = llegadas[0].tiempo;
    cuerpoTabla.innerHTML = llegadas.map((l, i) => {
        const dif = i === 0 ? '-' : `+${formatearTiempo(l.tiempo - primerTiempo)}`;
        return `<tr>
            <td>${l.posicion}</td><td>#${l.dorsal}</td><td>${l.nombre}</td>
            <td>${l.equipo || '-'}</td><td>${l.categoria || '-'}</td><td>${l.evento || '-'}</td>
            <td>${l.tiempoFormateado}</td><td>${l.tiempoRealFormateado}</td><td>${dif}</td>
        </tr>`;
    }).join('');
}

// --- Botones rapidos (solo pendientes, ordenados) ---
function renderizarBotonesRapidos() {
    const dorsalesLlegados = llegadas.map(l => l.dorsal);
    const pendientes = corredores.filter(c => !dorsalesLlegados.includes(c.dorsal))
        .sort((a, b) => Number(a.dorsal) - Number(b.dorsal));
    if (pendientes.length === 0) {
        botonesRapidos.innerHTML = '<p class="botones-rapidos-titulo">Todos han llegado</p>';
        return;
    }
    botonesRapidos.innerHTML = '<p class="botones-rapidos-titulo">Toque rapido (pendientes, ordenados):</p>';
    botonesRapidos.innerHTML += pendientes.map(c =>
        `<button class="btn-dorsal-rapido" onclick="registrarLlegadaRapida('${c.dorsal}')" title="${c.nombre} - ${c.categoria || ''}">${c.dorsal}</button>`
    ).join('');
}

// --- Pendientes (solo contador) ---
function renderizarPendientes() {
    const dorsalesLlegados = llegadas.map(l => l.dorsal);
    const pendientes = corredores.filter(c => !dorsalesLlegados.includes(c.dorsal));
    numPendientes.textContent = pendientes.length;
}

// --- Resultados por categoria ---
function renderizarResultadosCategoria() {
    const container = document.getElementById('resultados-por-categoria');
    if (llegadas.length === 0) { container.innerHTML = '<p class="placeholder-text">No hay resultados aun</p>'; return; }

    const filtro = filtroCat.value;
    let llegadasFiltradas = [...llegadas];
    if (filtro !== 'todas') {
        if (filtro.startsWith('evento:')) {
            llegadasFiltradas = llegadas.filter(l => l.evento === filtro.replace('evento:', ''));
        } else {
            llegadasFiltradas = llegadas.filter(l => l.categoria === filtro);
        }
    }

    const categorias = {};
    llegadasFiltradas.forEach(l => {
        const cat = l.categoria || 'Sin categoria';
        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push(l);
    });

    if (Object.keys(categorias).length === 0) { container.innerHTML = '<p class="placeholder-text">Sin resultados para este filtro</p>'; return; }

    let html = '';
    Object.keys(categorias).sort().forEach(cat => {
        const grupo = categorias[cat];
        const primerReal = grupo[0].tiempoReal;
        html += `<div class="categoria-bloque"><h3>${cat} (${grupo.length} corredores)</h3>
            <div class="tabla-container"><table>
            <thead><tr><th>Pos.</th><th>Dorsal</th><th>Nombre</th><th>Equipo</th><th>Evento</th><th>T. Real</th><th>Dif. Cat.</th></tr></thead><tbody>`;
        grupo.forEach((l, i) => {
            const dif = i === 0 ? '-' : `+${formatearTiempo(l.tiempoReal - primerReal)}`;
            html += `<tr><td>${i+1}</td><td>#${l.dorsal}</td><td>${l.nombre}</td><td>${l.equipo||'-'}</td><td>${l.evento||'-'}</td><td>${l.tiempoRealFormateado}</td><td>${dif}</td></tr>`;
        });
        html += '</tbody></table></div></div>';
    });
    container.innerHTML = html;
}


// --- Premiacion: solo categorias completas (verdes) ---
function renderizarPremiacion() {
    const container = document.getElementById('premiacion-container');
    if (llegadas.length === 0) { container.innerHTML = '<p class="placeholder-text">Inicia la carrera</p>'; return; }

    const totalPorCat = {};
    corredores.forEach(c => { const cat = c.categoria || 'Sin categoria'; totalPorCat[cat] = (totalPorCat[cat] || 0) + 1; });

    const llegadasPorCat = {};
    llegadas.forEach(l => { const cat = l.categoria || 'Sin categoria'; if (!llegadasPorCat[cat]) llegadasPorCat[cat] = []; llegadasPorCat[cat].push(l); });

    let html = '';
    let hayAlgunaLista = false;

    Object.keys(totalPorCat).sort().forEach(cat => {
        const grupo = llegadasPorCat[cat] || [];
        const totalCat = totalPorCat[cat];
        const necesarios = Math.min(5, totalCat);
        const lista = grupo.length >= necesarios && necesarios > 0;

        if (!lista) return; // Solo mostrar las que estan listas
        hayAlgunaLista = true;

        const top5 = grupo.slice(0, 5);
        const primerReal = top5[0].tiempoReal;

        html += `<div class="premiacion-card"><h3>${cat} <span class="estado-premiacion">LISTA PARA PREMIAR</span></h3>
            <div class="tabla-container"><table>
            <thead><tr><th>Pos.</th><th>Dorsal</th><th>Nombre</th><th>Equipo</th><th>T. Real</th><th>Dif.</th></tr></thead><tbody>`;
        top5.forEach((l, i) => {
            const dif = i === 0 ? '-' : `+${formatearTiempo(l.tiempoReal - primerReal)}`;
            html += `<tr><td>${i+1}</td><td>#${l.dorsal}</td><td>${l.nombre}</td><td>${l.equipo||'-'}</td><td>${l.tiempoRealFormateado}</td><td>${dif}</td></tr>`;
        });
        html += '</tbody></table></div></div>';
    });

    if (!hayAlgunaLista) html = '<p class="placeholder-text">Ninguna categoria lista para premiar aun</p>';
    container.innerHTML = html;
}

// --- Exportar General ---
function exportarCSV() {
    if (llegadas.length === 0) { mostrarNotificacion('No hay resultados', 'error'); return; }
    const nombre = inputNombreCarrera.value || 'Carrera';
    let csv = 'Posicion,Dorsal,Nombre,Equipo,Categoria,Evento,Tiempo Crono,Tiempo Real,Dif General,Pos Categoria,Dif Categoria\n';
    const primerTiempo = llegadas[0].tiempo;
    const posCatCont = {}; const primerRealCat = {};
    llegadas.forEach(l => { const cat = l.categoria || 'Sin cat'; if (!primerRealCat[cat]) primerRealCat[cat] = l.tiempoReal; });

    llegadas.forEach((l, i) => {
        const cat = l.categoria || 'Sin cat';
        posCatCont[cat] = (posCatCont[cat] || 0) + 1;
        const difGen = i === 0 ? '-' : `+${formatearTiempo(l.tiempo - primerTiempo)}`;
        const difCat = posCatCont[cat] === 1 ? '-' : `+${formatearTiempo(l.tiempoReal - primerRealCat[cat])}`;
        csv += `${l.posicion},${l.dorsal},"${l.nombre}","${l.equipo||''}","${l.categoria||''}","${l.evento||''}",${l.tiempoFormateado},${l.tiempoRealFormateado},${difGen},${posCatCont[cat]},${difCat}\n`;
    });
    // DNF
    const dorsalesLlegados = llegadas.map(l => l.dorsal);
    corredores.filter(c => !dorsalesLlegados.includes(c.dorsal)).forEach(c => {
        csv += `DNF,${c.dorsal},"${c.nombre}","${c.equipo||''}","${c.categoria||''}","${c.evento||''}",DNF,DNF,-,-,-\n`;
    });

    let enc = `Carrera: ${nombre}\nFecha: ${new Date().toLocaleDateString('es-ES')}\nTotal: ${corredores.length} | Llegaron: ${llegadas.length}\n\n`;
    descargarCSV(enc + csv, `resultados_general_${nombre.replace(/\s+/g,'_')}`);
}


// --- Exportar por Categoria ---
function exportarPorCategoria() {
    if (llegadas.length === 0) { mostrarNotificacion('No hay resultados', 'error'); return; }
    const nombre = inputNombreCarrera.value || 'Carrera';
    const categorias = {};
    llegadas.forEach(l => { const cat = l.categoria || 'Sin categoria'; if (!categorias[cat]) categorias[cat] = []; categorias[cat].push(l); });

    let csv = `Resultados por Categoria - ${nombre}\nFecha: ${new Date().toLocaleDateString('es-ES')}\n`;
    Object.keys(categorias).sort().forEach(cat => {
        const grupo = categorias[cat];
        const primerReal = grupo[0].tiempoReal;
        csv += `\n--- ${cat} (${grupo.length} corredores) ---\n`;
        csv += 'Pos,Dorsal,Nombre,Equipo,Evento,Tiempo Real,Diferencia\n';
        grupo.forEach((l, i) => {
            const dif = i === 0 ? '-' : `+${formatearTiempo(l.tiempoReal - primerReal)}`;
            csv += `${i+1},${l.dorsal},"${l.nombre}","${l.equipo||''}","${l.evento||''}",${l.tiempoRealFormateado},${dif}\n`;
        });
    });
    descargarCSV(csv, `resultados_por_categoria_${nombre.replace(/\s+/g,'_')}`);
}

// --- Exportar por Evento ---
function exportarPorEvento(eventoFiltro) {
    if (llegadas.length === 0) { mostrarNotificacion('No hay resultados', 'error'); return; }
    const nombre = inputNombreCarrera.value || 'Carrera';

    let llegadasFiltradas = [...llegadas];
    if (eventoFiltro && eventoFiltro !== 'todos') {
        llegadasFiltradas = llegadas.filter(l => l.evento === eventoFiltro);
        if (llegadasFiltradas.length === 0) { mostrarNotificacion(`No hay resultados para evento "${eventoFiltro}"`, 'error'); return; }
    }

    const eventos = {};
    llegadasFiltradas.forEach(l => { const evt = l.evento || 'Sin evento'; if (!eventos[evt]) eventos[evt] = []; eventos[evt].push(l); });

    let csv = `Resultados por Evento - ${nombre}\nFecha: ${new Date().toLocaleDateString('es-ES')}\n`;
    Object.keys(eventos).sort().forEach(evt => {
        const grupo = eventos[evt];
        const catsDentro = {};
        grupo.forEach(l => { const cat = l.categoria || 'Sin cat'; if (!catsDentro[cat]) catsDentro[cat] = []; catsDentro[cat].push(l); });

        csv += `\n========== EVENTO: ${evt} (${grupo.length} corredores) ==========\n`;
        Object.keys(catsDentro).sort().forEach(cat => {
            const subGrupo = catsDentro[cat];
            const primerReal = subGrupo[0].tiempoReal;
            csv += `\n--- ${cat} (${subGrupo.length}) ---\n`;
            csv += 'Pos,Dorsal,Nombre,Equipo,Tiempo Real,Diferencia\n';
            subGrupo.forEach((l, i) => {
                const dif = i === 0 ? '-' : `+${formatearTiempo(l.tiempoReal - primerReal)}`;
                csv += `${i+1},${l.dorsal},"${l.nombre}","${l.equipo||''}",${l.tiempoRealFormateado},${dif}\n`;
            });
        });
    });
    const sufijo = eventoFiltro && eventoFiltro !== 'todos' ? `_${eventoFiltro.replace(/\s+/g,'_')}` : '_todos';
    descargarCSV(csv, `resultados_evento${sufijo}_${nombre.replace(/\s+/g,'_')}`);
}

function exportarEventoSeleccionado() {
    const evento = selectEventoExportar.value;
    exportarPorEvento(evento);
}

function exportarEventoSeleccionadoCat() {
    const evento = selectEventoExportarCat.value;
    exportarPorEvento(evento);
}

// --- Exportar Pendientes ---
function exportarPendientes() {
    const dorsalesLlegados = llegadas.map(l => l.dorsal);
    const pendientes = corredores.filter(c => !dorsalesLlegados.includes(c.dorsal));
    if (pendientes.length === 0) { mostrarNotificacion('No hay pendientes', 'info'); return; }
    const nombre = inputNombreCarrera.value || 'Carrera';
    let csv = `Corredores pendientes de llegada - ${nombre}\nFecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;
    csv += 'Dorsal,Nombre,Equipo,Categoria,Evento\n';
    pendientes.forEach(c => { csv += `${c.dorsal},"${c.nombre}","${c.equipo||''}","${c.categoria||''}","${c.evento||''}"\n`; });
    descargarCSV(csv, `pendientes_${nombre.replace(/\s+/g,'_')}`);
}

// --- Exportar Premiacion ---
function exportarPremiacion() {
    if (llegadas.length === 0) { mostrarNotificacion('No hay resultados', 'error'); return; }
    const nombre = inputNombreCarrera.value || 'Carrera';
    const totalPorCat = {};
    corredores.forEach(c => { const cat = c.categoria || 'Sin cat'; totalPorCat[cat] = (totalPorCat[cat] || 0) + 1; });
    const llegadasPorCat = {};
    llegadas.forEach(l => { const cat = l.categoria || 'Sin cat'; if (!llegadasPorCat[cat]) llegadasPorCat[cat] = []; llegadasPorCat[cat].push(l); });

    let csv = `Premiacion Top 5 - ${nombre}\nFecha: ${new Date().toLocaleDateString('es-ES')}\n`;
    Object.keys(totalPorCat).sort().forEach(cat => {
        const grupo = llegadasPorCat[cat] || [];
        const totalCat = totalPorCat[cat];
        const necesarios = Math.min(5, totalCat);
        if (grupo.length < necesarios) return;
        const top5 = grupo.slice(0, 5);
        const primerReal = top5[0].tiempoReal;
        csv += `\n--- ${cat} (LISTA PARA PREMIAR) ---\n`;
        csv += 'Pos,Dorsal,Nombre,Equipo,Tiempo Real,Diferencia\n';
        top5.forEach((l, i) => {
            const dif = i === 0 ? '-' : `+${formatearTiempo(l.tiempoReal - primerReal)}`;
            csv += `${i+1},${l.dorsal},"${l.nombre}","${l.equipo||''}",${l.tiempoRealFormateado},${dif}\n`;
        });
    });
    descargarCSV(csv, `premiacion_${nombre.replace(/\s+/g,'_')}`);
}

function descargarCSV(csv, nombreArchivo) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    mostrarNotificacion('Archivo exportado', 'exito');
}


// --- Importar CSV ---
function descargarPlantilla() {
    const p = 'Dorsal,Nombre,Equipo,Categoria,Evento\n1,Juan Perez,Equipo Rojo,Elite,Reto\n2,Maria Garcia,Equipo Azul,Sub-23,Reto\n3,Carlos Lopez,Club Verde,Master,Endurance\n4,Ana Martinez,Club Ciclista,Elite F,Endurance\n';
    const blob = new Blob([p], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_corredores.csv'; link.click();
    mostrarNotificacion('Plantilla descargada', 'info');
}

function procesarArchivoCSV(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;
    const ext = archivo.name.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') { mostrarNotificacion('Guarda como CSV desde Excel primero', 'error'); inputArchivoCSV.value = ''; return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        const importados = parsearCSV(e.target.result);
        if (importados.length === 0) { mostrarNotificacion('No se encontraron corredores', 'error'); inputArchivoCSV.value = ''; return; }
        mostrarPrevisualizacion(importados); inputArchivoCSV.value = '';
    };
    reader.readAsText(archivo, 'UTF-8');
}

function parsearCSV(texto) {
    const lineas = texto.split(/\r?\n/).filter(l => l.trim());
    if (lineas.length < 2) return [];
    let sep = ',';
    if (lineas[0].includes(';')) sep = ';';
    else if (lineas[0].includes('\t')) sep = '\t';
    const enc = lineas[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const iD = enc.findIndex(h => h.includes('dorsal') || h.includes('numero') || h.includes('num') || h === '#');
    const iN = enc.findIndex(h => h.includes('nombre') || h.includes('corredor') || h.includes('name'));
    const iE = enc.findIndex(h => h.includes('equipo') || h.includes('team') || h.includes('club'));
    const iC = enc.findIndex(h => h.includes('categoria') || h.includes('category') || h.includes('cat'));
    const iEv = enc.findIndex(h => h.includes('evento') || h.includes('event') || h.includes('modalidad'));

    const resultados = [];
    const inicio = (iD !== -1 && iN !== -1) ? 1 : 0;
    for (let i = inicio; i < lineas.length; i++) {
        const cols = parsearLineaCSV(lineas[i], sep);
        if (cols.length < 2) continue;
        let dorsal, nombre, equipo, categoria, evento;
        if (iD !== -1 && iN !== -1) {
            dorsal = (cols[iD] || '').trim(); nombre = (cols[iN] || '').trim();
            equipo = iE !== -1 ? (cols[iE] || '').trim() : '';
            categoria = iC !== -1 ? (cols[iC] || '').trim() : '';
            evento = iEv !== -1 ? (cols[iEv] || '').trim() : '';
        } else {
            dorsal = cols[0].trim(); nombre = cols[1].trim();
            equipo = cols[2] ? cols[2].trim() : '';
            categoria = cols[3] ? cols[3].trim() : '';
            evento = cols[4] ? cols[4].trim() : '';
        }
        if (!dorsal || !nombre || isNaN(dorsal)) continue;
        resultados.push({ dorsal, nombre, equipo, categoria, evento });
    }
    return resultados;
}

function parsearLineaCSV(linea, sep) {
    const r = []; let actual = ''; let q = false;
    for (let i = 0; i < linea.length; i++) {
        const c = linea[i];
        if (c === '"' || c === "'") q = !q;
        else if (c === sep && !q) { r.push(actual.trim()); actual = ''; }
        else actual += c;
    }
    r.push(actual.trim()); return r;
}

function mostrarPrevisualizacion(importados) {
    const cats = [...new Set(importados.map(c => c.categoria).filter(c => c))];
    const evts = [...new Set(importados.map(c => c.evento).filter(e => e))];
    let tabla = importados.map(c => `<tr><td>${c.dorsal}</td><td>${c.nombre}</td><td>${c.equipo||'-'}</td><td>${c.categoria||'-'}</td><td>${c.evento||'-'}</td></tr>`).join('');
    let info = ''; if (cats.length) info += `Categorias: <span>${cats.join(', ')}</span><br>`; if (evts.length) info += `Eventos: <span>${evts.join(', ')}</span>`;
    const tiene = corredores.length > 0;
    const modal = document.createElement('div'); modal.className = 'modal-overlay'; modal.id = 'modal-importar';
    modal.innerHTML = `<div class="modal-content"><h3>Vista previa</h3>
        <p class="modal-info"><span>${importados.length}</span> corredores encontrados. ${info}</p>
        <table class="modal-tabla"><thead><tr><th>Dorsal</th><th>Nombre</th><th>Equipo</th><th>Cat.</th><th>Evento</th></tr></thead><tbody>${tabla}</tbody></table>
        <div class="modal-botones">
            <button class="btn btn-cancelar-import" onclick="cerrarModal()">Cancelar</button>
            ${tiene ? `<button class="btn btn-reemplazar-import" onclick="confirmarImportacion('reemplazar')">REEMPLAZAR</button>` : ''}
            <button class="btn btn-confirmar-import" onclick="confirmarImportacion('agregar')">AGREGAR</button>
        </div></div>`;
    document.body.appendChild(modal);
    window._imp = importados;
}

function cerrarModal() { const m = document.getElementById('modal-importar'); if (m) m.remove(); window._imp = null; }

function confirmarImportacion(modo) {
    const nuevos = window._imp; if (!nuevos) return;
    if (modo === 'reemplazar') { corredores = []; llegadas = []; }
    let ok = 0, dup = 0;
    nuevos.forEach(c => {
        if (corredores.find(x => x.dorsal === c.dorsal)) { dup++; }
        else { corredores.push({ dorsal: c.dorsal, nombre: c.nombre, equipo: c.equipo, categoria: c.categoria, evento: c.evento }); ok++; }
    });
    const evtsDetectados = [...new Set(nuevos.map(c => c.evento).filter(e => e))];
    if (evtsDetectados.length && !inputEventos.value) inputEventos.value = evtsDetectados.join(', ');
    renderizarTodo(); cerrarModal();
    let msg = modo === 'reemplazar' ? `${ok} cargados.` : `${ok} agregados.`;
    if (dup) msg += ` (${dup} duplicados omitidos)`;
    mostrarNotificacion(msg, 'exito');
}


// --- Event Listeners ---
btnAgregarCorredor.addEventListener('click', agregarCorredor);
btnIniciar.addEventListener('click', iniciarCronometro);
btnPausar.addEventListener('click', pausarCronometro);
btnReiniciar.addEventListener('click', reiniciarCronometro);
btnRegistrarLlegada.addEventListener('click', () => registrarLlegada());
btnExportar.addEventListener('click', exportarCSV);
inputArchivoCSV.addEventListener('change', procesarArchivoCSV);
[inputNombreCorredor, inputEquipo, inputCategoriaCorredor, inputEventoCorredor].forEach(el => {
    el.addEventListener('keypress', e => { if (e.key === 'Enter') agregarCorredor(); });
});
inputDorsalLlegada.addEventListener('keypress', e => { if (e.key === 'Enter') registrarLlegada(); });

// --- localStorage ---
function guardarDatos() {
    localStorage.setItem('cronometro-ciclismo', JSON.stringify({
        nombreCarrera: inputNombreCarrera.value, distancia: inputDistancia.value,
        eventos: inputEventos.value, corredores, llegadas, salidasDesfase
    }));
}

function cargarDatos() {
    const d = localStorage.getItem('cronometro-ciclismo');
    if (d) {
        const p = JSON.parse(d);
        inputNombreCarrera.value = p.nombreCarrera || '';
        inputDistancia.value = p.distancia || '';
        inputEventos.value = p.eventos || '';
        corredores = p.corredores || [];
        llegadas = p.llegadas || [];
        salidasDesfase = p.salidasDesfase || {};
        // Recalcular tiempoReal para llegadas que no lo tengan (compat. version anterior)
        llegadas.forEach(l => {
            if (l.tiempoReal === undefined || l.tiempoReal === null) {
                const desfase = getDesfaseCategoria(l.categoria);
                l.tiempoReal = l.tiempo - desfase;
            }
            if (!l.tiempoRealFormateado) {
                l.tiempoRealFormateado = formatearTiempo(l.tiempoReal);
            }
        });
        renderizarTodo();
    }
}

setInterval(guardarDatos, 5000);
cargarDatos();
window.addEventListener('beforeunload', guardarDatos);
