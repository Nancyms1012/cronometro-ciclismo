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

// --- Importar desde CSV/Excel ---
const inputArchivoCSV = document.getElementById('archivo-csv');

function descargarPlantilla() {
    const plantilla = 'Dorsal,Nombre,Equipo,Categoria\n1,Juan Perez,Equipo Rojo,Elite\n2,Maria Garcia,Equipo Azul,Elite\n3,Carlos Lopez,Equipo Verde,Sub-23\n';
    const blob = new Blob([plantilla], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_corredores.csv';
    link.click();
    mostrarNotificacion('Plantilla descargada. Abrir con Excel y completar.', 'info');
}

function procesarArchivoCSV(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const extension = archivo.name.split('.').pop().toLowerCase();

    if (extension === 'xlsx' || extension === 'xls') {
        mostrarNotificacion('Para archivos Excel (.xlsx), primero guardalos como CSV desde Excel: Archivo > Guardar como > CSV', 'error');
        inputArchivoCSV.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const contenido = e.target.result;
        const corredoresImportados = parsearCSV(contenido);

        if (corredoresImportados.length === 0) {
            mostrarNotificacion('No se encontraron corredores en el archivo', 'error');
            inputArchivoCSV.value = '';
            return;
        }

        // Mostrar previsualizacion
        mostrarPrevisualizacion(corredoresImportados);
        inputArchivoCSV.value = '';
    };
    reader.readAsText(archivo, 'UTF-8');
}

function parsearCSV(texto) {
    const lineas = texto.split(/\r?\n/).filter(l => l.trim() !== '');

    if (lineas.length < 2) return [];

    // Detectar separador (coma, punto y coma, o tabulador)
    const primeraLinea = lineas[0];
    let separador = ',';
    if (primeraLinea.includes(';')) separador = ';';
    else if (primeraLinea.includes('\t')) separador = '\t';

    // Obtener encabezados
    const encabezados = lineas[0].split(separador).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

    // Buscar indices de columnas (flexible)
    const iDorsal = encabezados.findIndex(h => h.includes('dorsal') || h.includes('numero') || h.includes('num') || h.includes('#'));
    const iNombre = encabezados.findIndex(h => h.includes('nombre') || h.includes('corredor') || h.includes('name'));
    const iEquipo = encabezados.findIndex(h => h.includes('equipo') || h.includes('team') || h.includes('club'));
    const iCategoria = encabezados.findIndex(h => h.includes('categoria') || h.includes('category') || h.includes('cat'));

    if (iDorsal === -1 || iNombre === -1) {
        // Intentar sin encabezados: asumir Dorsal, Nombre, Equipo, Categoria
        const resultados = [];
        for (let i = 0; i < lineas.length; i++) {
            const cols = parsearLineaCSV(lineas[i], separador);
            if (cols.length >= 2 && !isNaN(cols[0])) {
                resultados.push({
                    dorsal: cols[0].trim(),
                    nombre: cols[1].trim(),
                    equipo: cols[2] ? cols[2].trim() : '',
                    categoria: cols[3] ? cols[3].trim() : ''
                });
            }
        }
        return resultados;
    }

    // Parsear filas con encabezados detectados
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
            categoria: iCategoria !== -1 && cols[iCategoria] ? cols[iCategoria].trim() : ''
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

        if (char === '"' || char === "'") {
            dentroComillas = !dentroComillas;
        } else if (char === separador && !dentroComillas) {
            resultado.push(actual.trim());
            actual = '';
        } else {
            actual += char;
        }
    }
    resultado.push(actual.trim());
    return resultado;
}

function mostrarPrevisualizacion(corredoresImportados) {
    // Detectar categorias unicas
    const categorias = [...new Set(corredoresImportados.map(c => c.categoria).filter(c => c))];

    let tablaHTML = '';
    corredoresImportados.forEach(c => {
        tablaHTML += `<tr><td>${c.dorsal}</td><td>${c.nombre}</td><td>${c.equipo || '-'}</td><td>${c.categoria || '-'}</td></tr>`;
    });

    const categoriasTexto = categorias.length > 0
        ? `Categorias detectadas: <span>${categorias.join(', ')}</span>`
        : 'No se detectaron categorias en el archivo';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-importar';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Vista previa de importacion</h3>
            <p class="modal-info">Se encontraron <span>${corredoresImportados.length}</span> corredores. ${categoriasTexto}</p>
            <table class="modal-tabla">
                <thead>
                    <tr><th>Dorsal</th><th>Nombre</th><th>Equipo</th><th>Categoria</th></tr>
                </thead>
                <tbody>${tablaHTML}</tbody>
            </table>
            <div class="modal-botones">
                <button class="btn btn-cancelar-import" onclick="cerrarModal()">Cancelar</button>
                <button class="btn btn-confirmar-import" onclick="confirmarImportacion()">Importar ${corredoresImportados.length} corredores</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Guardar temporalmente
    window._corredoresParaImportar = corredoresImportados;
}

function cerrarModal() {
    const modal = document.getElementById('modal-importar');
    if (modal) modal.remove();
    window._corredoresParaImportar = null;
}

function confirmarImportacion() {
    const nuevos = window._corredoresParaImportar;
    if (!nuevos) return;

    let agregados = 0;
    let duplicados = 0;

    // Si se detectaron categorias, actualizar el campo de categoria
    const categorias = [...new Set(nuevos.map(c => c.categoria).filter(c => c))];
    if (categorias.length > 0 && !inputCategoria.value) {
        inputCategoria.value = categorias.join(', ');
    }

    nuevos.forEach(c => {
        if (corredores.find(ex => ex.dorsal === c.dorsal)) {
            duplicados++;
        } else {
            corredores.push({
                dorsal: c.dorsal,
                nombre: c.nombre,
                equipo: c.equipo || ''
            });
            agregados++;
        }
    });

    renderizarCorredores();
    renderizarBotonesRapidos();
    renderizarPendientes();
    cerrarModal();

    let mensaje = `${agregados} corredores importados correctamente`;
    if (duplicados > 0) mensaje += ` (${duplicados} duplicados omitidos)`;
    mostrarNotificacion(mensaje, 'exito');
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
