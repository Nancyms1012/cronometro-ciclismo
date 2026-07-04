// =============================================
// CRONOMETRO CICLISMO - App de registro de tiempos
// =============================================

// --- Estado de la aplicacion ---
let corredores = []; // Lista de corredores registrados
let llegadas = [];   // Lista de llegadas registradas
let tiempoInicio = null;
let tiempoTranscurrido = 0;
let cronometroInterval = null;
let carreraEnCurso = false;
let carreraPausada = false;

// --- Elementos del DOM ---
const inputNombreCarrera = document.getElementById('nombre-carrera');
const inputCategoria = document.getElementById('categoria');
const inputDistancia = document.getElementById('distancia');
const inputDorsal = document.getElementById('dorsal');
const inputNombreCorredor = document.getElementById('nombre-corredor');
const inputEquipo = document.getElementById('equipo');
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

    setTimeout(() => {
        notif.remove();
    }, 3000);
}

// --- Corredores ---
function agregarCorredor() {
    const dorsal = inputDorsal.value.trim();
    const nombre = inputNombreCorredor.value.trim();
    const equipo = inputEquipo.value.trim();

    if (!dorsal || !nombre) {
        mostrarNotificacion('Debes ingresar dorsal y nombre', 'error');
        return;
    }

    // Verificar dorsal duplicado
    if (corredores.find(c => c.dorsal === dorsal)) {
        mostrarNotificacion(`El dorsal #${dorsal} ya esta registrado`, 'error');
        return;
    }

    corredores.push({ dorsal, nombre, equipo });
    renderizarCorredores();
    renderizarBotonesRapidos();
    renderizarPendientes();

    // Limpiar campos
    inputDorsal.value = '';
    inputNombreCorredor.value = '';
    inputEquipo.value = '';
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
        // Reanudar
        tiempoInicio = Date.now() - tiempoTranscurrido;
        carreraPausada = false;
    } else {
        // Iniciar desde cero
        tiempoInicio = Date.now();
        tiempoTranscurrido = 0;
        llegadas = [];
        renderizarTabla();
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
    if (!confirm('Estas seguro de reiniciar? Se perderan todos los tiempos registrados.')) {
        return;
    }

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

    mostrarNotificacion('Cronometro reiniciado', 'info');
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

    // Verificar que el corredor existe
    const corredor = corredores.find(c => c.dorsal === dorsal);
    if (!corredor) {
        mostrarNotificacion(`No existe corredor con dorsal #${dorsal}`, 'error');
        return;
    }

    // Verificar que no haya llegado ya
    if (llegadas.find(l => l.dorsal === dorsal)) {
        mostrarNotificacion(`El corredor #${dorsal} ya cruzo la meta`, 'error');
        return;
    }

    // Registrar llegada
    const tiempoLlegada = Date.now() - tiempoInicio;
    llegadas.push({
        posicion: llegadas.length + 1,
        dorsal: corredor.dorsal,
        nombre: corredor.nombre,
        equipo: corredor.equipo,
        tiempo: tiempoLlegada,
        tiempoFormateado: formatearTiempo(tiempoLlegada)
    });

    inputDorsalLlegada.value = '';
    renderizarTabla();
    renderizarPendientes();
    renderizarBotonesRapidos();

    mostrarNotificacion(`#${dorsal} ${corredor.nombre} - Pos. ${llegadas.length} - ${formatearTiempo(tiempoLlegada)}`, 'exito');

    // Verificar si todos llegaron
    if (llegadas.length === corredores.length) {
        mostrarNotificacion('TODOS LOS CORREDORES HAN LLEGADO!', 'info');
    }
}

function renderizarTabla() {
    if (llegadas.length === 0) {
        cuerpoTabla.innerHTML = '<tr><td colspan="6" class="tabla-vacia">No hay llegadas registradas</td></tr>';
        return;
    }

    const tiempoPrimero = llegadas[0].tiempo;

    cuerpoTabla.innerHTML = llegadas.map((l, i) => {
        const diferencia = i === 0 ? '-' : `+${formatearTiempo(l.tiempo - tiempoPrimero)}`;
        return `
            <tr>
                <td>${l.posicion}</td>
                <td>#${l.dorsal}</td>
                <td>${l.nombre}</td>
                <td>${l.equipo || '-'}</td>
                <td>${l.tiempoFormateado}</td>
                <td>${diferencia}</td>
            </tr>
        `;
    }).join('');
}

// --- Botones rapidos ---
function renderizarBotonesRapidos() {
    if (corredores.length === 0) {
        botonesRapidos.innerHTML = '';
        return;
    }

    botonesRapidos.innerHTML = '<p style="width:100%; color:#aaa; font-size:0.85rem; margin-bottom:5px;">Toque rapido por dorsal:</p>';
    botonesRapidos.innerHTML += corredores.map(c => {
        const yaLlego = llegadas.find(l => l.dorsal === c.dorsal);
        return `
            <button 
                class="btn-dorsal-rapido ${yaLlego ? 'llegado' : ''}" 
                onclick="registrarLlegadaRapida('${c.dorsal}')"
                ${yaLlego ? 'disabled' : ''}
                title="${c.nombre}"
            >${c.dorsal}</button>
        `;
    }).join('');
}

function registrarLlegadaRapida(dorsal) {
    registrarLlegada(dorsal);
}

// --- Pendientes ---
function renderizarPendientes() {
    const dorsalesLlegados = llegadas.map(l => l.dorsal);
    const pendientes = corredores.filter(c => !dorsalesLlegados.includes(c.dorsal));

    if (!carreraEnCurso && !carreraPausada) {
        listaPendientes.innerHTML = '<p class="placeholder-text">Inicia la carrera para ver los corredores pendientes</p>';
        return;
    }

    if (pendientes.length === 0) {
        listaPendientes.innerHTML = '<p class="placeholder-text">Todos los corredores han llegado!</p>';
        return;
    }

    listaPendientes.innerHTML = pendientes.map(c => `
        <span class="pendiente-tag">#${c.dorsal} ${c.nombre}</span>
    `).join('');
}

// --- Exportar CSV ---
function exportarCSV() {
    if (llegadas.length === 0) {
        mostrarNotificacion('No hay resultados para exportar', 'error');
        return;
    }

    const nombreCarrera = inputNombreCarrera.value || 'Carrera';
    const categoria = inputCategoria.value || '';
    const distancia = inputDistancia.value || '';

    let csv = 'Posicion,Dorsal,Nombre,Equipo,Tiempo,Diferencia\n';

    const tiempoPrimero = llegadas[0].tiempo;

    llegadas.forEach((l, i) => {
        const diferencia = i === 0 ? '-' : `+${formatearTiempo(l.tiempo - tiempoPrimero)}`;
        csv += `${l.posicion},${l.dorsal},"${l.nombre}","${l.equipo || ''}",${l.tiempoFormateado},${diferencia}\n`;
    });

    // Agregar corredores que no llegaron
    const dorsalesLlegados = llegadas.map(l => l.dorsal);
    const noLlegaron = corredores.filter(c => !dorsalesLlegados.includes(c.dorsal));
    noLlegaron.forEach(c => {
        csv += `DNF,${c.dorsal},"${c.nombre}","${c.equipo || ''}",DNF,-\n`;
    });

    // Agregar info de carrera al inicio
    let encabezado = `Carrera: ${nombreCarrera}\n`;
    if (categoria) encabezado += `Categoria: ${categoria}\n`;
    if (distancia) encabezado += `Distancia: ${distancia} km\n`;
    encabezado += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n`;
    encabezado += `Total corredores: ${corredores.length}\n`;
    encabezado += `Finalizaron: ${llegadas.length}\n`;
    encabezado += `\n`;

    const csvFinal = encabezado + csv;

    // Descargar archivo
    const blob = new Blob([csvFinal], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resultados_${nombreCarrera.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    mostrarNotificacion('Resultados exportados a CSV', 'exito');
}

// --- Event Listeners ---
btnAgregarCorredor.addEventListener('click', agregarCorredor);
btnIniciar.addEventListener('click', iniciarCronometro);
btnPausar.addEventListener('click', pausarCronometro);
btnReiniciar.addEventListener('click', reiniciarCronometro);
btnRegistrarLlegada.addEventListener('click', () => registrarLlegada());
btnExportar.addEventListener('click', exportarCSV);

// Enter para agregar corredor
inputNombreCorredor.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') agregarCorredor();
});

inputEquipo.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') agregarCorredor();
});

// Enter para registrar llegada
inputDorsalLlegada.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') registrarLlegada();
});

// --- Guardar datos en localStorage ---
function guardarDatos() {
    const datos = {
        nombreCarrera: inputNombreCarrera.value,
        categoria: inputCategoria.value,
        distancia: inputDistancia.value,
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
        inputCategoria.value = parsed.categoria || '';
        inputDistancia.value = parsed.distancia || '';
        corredores = parsed.corredores || [];
        llegadas = parsed.llegadas || [];
        renderizarCorredores();
        renderizarTabla();
        renderizarBotonesRapidos();
    }
}

// Guardar automaticamente cada 5 segundos
setInterval(guardarDatos, 5000);

// Cargar datos al iniciar
cargarDatos();

// Guardar al cerrar/recargar pagina
window.addEventListener('beforeunload', guardarDatos);
