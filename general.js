// =============================================
// TABLA GENERAL DE SERIE - Ciclismo
// =============================================

let tablaCorredores = []; // datos importados
let tablaPuntos = []; // posicion -> puntos
let resultadosFechaActual = []; // resultados de la fecha actual
let tablaCalculada = []; // resultado final

function normalizarTexto(t) {
    if (!t) return '';
    return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x00-\x7F]/g, '');
}

function mostrarNotificacion(msg, tipo = 'info') {
    const n = document.createElement('div');
    n.className = `notificacion ${tipo}`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

function borrarTodo() {
    if (!confirm('Borrar todos los datos cargados?')) return;
    tablaCorredores = [];
    tablaPuntos = [];
    resultadosFechaActual = [];
    tablaCalculada = [];
    document.getElementById('info-tabla').textContent = 'Sin datos cargados';
    document.getElementById('info-puntos').textContent = 'Sin tabla de puntos';
    document.getElementById('info-resultados').textContent = 'Sin resultados de fecha actual';
    document.getElementById('cuerpo-tabla-general').innerHTML = '<tr><td colspan="13" class="tabla-vacia">Importa la tabla y calcula</td></tr>';
    document.getElementById('top5-container').innerHTML = '';
    mostrarNotificacion('Datos borrados', 'info');
}


// --- Parsear CSV ---
function parsearCSVGeneral(texto) {
    const lineas = texto.split(/\r?\n/).filter(l => l.trim());
    if (lineas.length < 2) return [];
    let sep = ',';
    if (lineas[0].includes(';')) sep = ';';
    else if (lineas[0].includes('\t')) sep = '\t';
    const enc = lineas[0].split(sep).map(h => h.trim().replace(/['"]/g, ''));
    const resultados = [];
    for (let i = 1; i < lineas.length; i++) {
        const cols = parsearLinea(lineas[i], sep);
        if (cols.length < 2) continue;
        const obj = {};
        enc.forEach((h, idx) => { obj[h] = (cols[idx] || '').trim(); });
        resultados.push(obj);
    }
    return resultados;
}

function parsearLinea(linea, sep) {
    const r = []; let actual = ''; let q = false;
    for (let i = 0; i < linea.length; i++) {
        const c = linea[i];
        if (c === '"' || c === "'") q = !q;
        else if (c === sep && !q) { r.push(actual.trim()); actual = ''; }
        else actual += c;
    }
    r.push(actual.trim()); return r;
}

function leerArchivo(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        let texto = e.target.result;
        if (texto.includes('\ufffd') || texto.includes('Ã')) {
            const reader2 = new FileReader();
            reader2.onload = function(e2) { callback(e2.target.result); };
            reader2.readAsText(file, 'ISO-8859-1');
        } else { callback(texto); }
    };
    reader.readAsText(file, 'UTF-8');
}


// --- Importar tabla acumulada ---
function importarTabla(event) {
    const file = event.target.files[0];
    if (!file) return;
    leerArchivo(file, function(texto) {
        const datos = parsearCSVGeneral(texto);
        if (datos.length === 0) { mostrarNotificacion('No se encontraron datos', 'error'); return; }
        tablaCorredores = datos.map(d => ({
            pos_c: d.POS_C || d.pos_c || '',
            evento: d.EVENTO || d.evento || '',
            dorsal: d.DORSAL || d.dorsal || '',
            nombre: d.NOMBRE_BD || d.nombre_bd || d.NOMBRE || '',
            categoria: d.NUEVA_CATEGORIA || d.nueva_categoria || d.CATEGORIA || '',
            equipo: d.EQUIPO || d.equipo || '',
            ptos: [
                parseInt(d.I_PTOS || d.i_ptos || 0) || 0,
                parseInt(d.II_PTOS || d.ii_ptos || 0) || 0,
                parseInt(d.III_PTOS || d.iii_ptos || 0) || 0,
                parseInt(d.IV_PTOS || d.iv_ptos || 0) || 0,
                parseInt(d.V_PTOS || d.v_ptos || 0) || 0
            ]
        }));
        actualizarFiltros();
        document.getElementById('info-tabla').textContent = `${tablaCorredores.length} corredores cargados`;
        mostrarNotificacion(`Tabla importada: ${tablaCorredores.length} corredores`, 'exito');
    });
    event.target.value = '';
}

// --- Importar tabla de puntos ---
function importarPuntos(event) {
    const file = event.target.files[0];
    if (!file) return;
    leerArchivo(file, function(texto) {
        const datos = parsearCSVGeneral(texto);
        tablaPuntos = [];
        datos.forEach(d => {
            const pos = d.POS || d.pos || d.POSICION || d.posicion;
            const pts = d.PTOS || d.ptos || d.PUNTOS || d.puntos;
            if (pos && pts !== undefined) {
                tablaPuntos.push({ pos: pos.toString().trim(), puntos: parseInt(pts) || 0 });
            }
        });
        document.getElementById('info-puntos').textContent = `${tablaPuntos.length} posiciones configuradas (max: ${tablaPuntos[0]?.puntos || 0} pts)`;
        mostrarNotificacion(`Tabla de puntos: ${tablaPuntos.length} posiciones`, 'exito');
    });
    event.target.value = '';
}

function cargarPuntosDefault() {
    tablaPuntos = [];
    for (let i = 1; i <= 100; i++) { tablaPuntos.push({ pos: i.toString(), puntos: 101 - i }); }
    tablaPuntos.push({ pos: 'DNF', puntos: 0 }, { pos: 'DSQ', puntos: 0 }, { pos: 'DNS', puntos: 0 });
    document.getElementById('info-puntos').textContent = '100 posiciones (100 a 1 pts) + DNF/DSQ/DNS = 0';
    mostrarNotificacion('Puntos 100-1 cargados', 'exito');
}


// --- Importar resultados fecha actual ---
function importarResultados(event) {
    const file = event.target.files[0];
    if (!file) return;
    leerArchivo(file, function(texto) {
        const datos = parsearCSVGeneral(texto);
        if (datos.length === 0) { mostrarNotificacion('No se encontraron resultados', 'error'); return; }
        resultadosFechaActual = datos.map(d => ({
            pos: d.POS || d.pos || d.POSICION || '',
            dorsal: d.DORSAL || d.dorsal || d.NUMERO || '',
            categoria: d.NUEVA_CATEGORIA || d.nueva_categoria || d.CATEGORIA || d.categoria || '',
            evento: d.EVENTO || d.evento || '',
            estado: d.ESTADO || d.estado || ''
        }));
        document.getElementById('info-resultados').textContent = `${resultadosFechaActual.length} resultados cargados`;
        mostrarNotificacion(`Resultados fecha actual: ${resultadosFechaActual.length}`, 'exito');
    });
    event.target.value = '';
}

function obtenerPuntosPorPosicion(pos) {
    if (!pos || pos === '' || pos === '0') return 0;
    const posStr = pos.toString().toUpperCase().trim();
    const encontrado = tablaPuntos.find(p => p.pos.toString().toUpperCase().trim() === posStr);
    if (encontrado) return encontrado.puntos;
    const posNum = parseInt(posStr);
    if (!isNaN(posNum)) {
        const enc = tablaPuntos.find(p => parseInt(p.pos) === posNum);
        return enc ? enc.puntos : 0;
    }
    return 0;
}


// --- Calcular tabla general ---
function calcularGeneral() {
    if (tablaCorredores.length === 0) { mostrarNotificacion('Importa la tabla acumulada primero', 'error'); return; }

    const fechaActualIdx = parseInt(document.getElementById('fecha-actual').value) - 1;
    const numDescarte = parseInt(document.getElementById('fechas-descarte').value) || 1;

    // Asignar puntos de la fecha actual si hay resultados importados
    if (resultadosFechaActual.length > 0 && tablaPuntos.length > 0) {
        // Agrupar resultados por categoria+evento para asignar posicion
        const grupos = {};
        resultadosFechaActual.forEach(r => {
            const key = `${r.evento}|${r.categoria}`;
            if (!grupos[key]) grupos[key] = [];
            grupos[key].push(r);
        });

        // Asignar puntos a cada corredor en la tabla
        resultadosFechaActual.forEach(r => {
            const corredor = tablaCorredores.find(c => c.dorsal.toString() === r.dorsal.toString());
            if (corredor && fechaActualIdx >= 0 && fechaActualIdx < 5) {
                const estado = r.estado ? r.estado.toUpperCase() : '';
                if (estado === 'DNF' || estado === 'DNS' || estado === 'DSQ') {
                    corredor.ptos[fechaActualIdx] = 0;
                } else {
                    const pos = parseInt(r.pos);
                    corredor.ptos[fechaActualIdx] = obtenerPuntosPorPosicion(pos);
                }
            }
        });
    }

    // Calcular TOTAL, #VECES, MIN para cada corredor
    const numFechas = parseInt(document.getElementById('num-fechas').value) || 5;

    tablaCalculada = tablaCorredores.map(c => {
        // Solo tomar en cuenta las fechas configuradas
        const ptos = c.ptos.slice(0, numFechas);
        const veces = ptos.filter(p => p > 0).length;

        let totalPtos = 0;
        let minVal = 0;

        if (numDescarte > 0 && ptos.length > numDescarte) {
            // Ordenar de mayor a menor, descartar las ultimas N (las peores, incluyendo ceros)
            const ptosOrdenados = [...ptos].sort((a, b) => b - a);
            const mejores = ptosOrdenados.slice(0, ptosOrdenados.length - numDescarte);
            totalPtos = mejores.reduce((s, p) => s + p, 0);
            const descartados = ptosOrdenados.slice(ptosOrdenados.length - numDescarte);
            minVal = descartados.reduce((s, p) => s + p, 0);
        } else {
            totalPtos = ptos.reduce((s, p) => s + p, 0);
            minVal = 0;
        }

        return {
            ...c,
            veces,
            total: totalPtos,
            min: minVal
        };
    });

    // Ordenar segun criterios
    tablaCalculada.sort((a, b) => {
        // 1. EVENTO A-Z
        if (a.evento < b.evento) return -1;
        if (a.evento > b.evento) return 1;
        // 2. CATEGORIA A-Z
        if (a.categoria < b.categoria) return -1;
        if (a.categoria > b.categoria) return 1;
        // 3. TOTAL desc
        if (b.total !== a.total) return b.total - a.total;
        // 4. #VECES desc
        if (b.veces !== a.veces) return b.veces - a.veces;
        // 5. MIN desc
        if (b.min !== a.min) return b.min - a.min;
        // 6-10. Puntos por fecha de la mas reciente a la mas antigua
        for (let i = 4; i >= 0; i--) {
            if (b.ptos[i] !== a.ptos[i]) return b.ptos[i] - a.ptos[i];
        }
        return 0;
    });

    // Asignar posicion por categoria
    let lastKey = '';
    let posCount = 0;
    tablaCalculada.forEach(c => {
        const key = `${c.evento}|${c.categoria}`;
        if (key !== lastKey) { posCount = 0; lastKey = key; }
        posCount++;
        c.pos_c = posCount;
    });

    renderizarTablaGeneral();
    renderizarTop5();
    mostrarNotificacion(`Tabla calculada: ${tablaCalculada.length} corredores ordenados`, 'exito');
}


// --- Renderizar tabla general ---
function renderizarTablaGeneral() {
    const tbody = document.getElementById('cuerpo-tabla-general');
    const filtroEvento = document.getElementById('filtro-evento-general').value;
    const filtroCat = document.getElementById('filtro-cat-general').value;

    let datos = [...tablaCalculada];
    if (filtroEvento !== 'todos') datos = datos.filter(c => c.evento === filtroEvento);
    if (filtroCat !== 'todas') datos = datos.filter(c => c.categoria === filtroCat);

    if (datos.length === 0) { tbody.innerHTML = '<tr><td colspan="13" class="tabla-vacia">Sin datos</td></tr>'; return; }

    tbody.innerHTML = datos.map(c => `<tr>
        <td>${c.pos_c}</td><td>${c.dorsal}</td><td>${c.nombre}</td>
        <td>${c.categoria}</td><td>${c.equipo || '-'}</td>
        <td>${c.ptos[0] || '-'}</td><td>${c.ptos[1] || '-'}</td><td>${c.ptos[2] || '-'}</td>
        <td>${c.ptos[3] || '-'}</td><td>${c.ptos[4] || '-'}</td>
        <td>${c.veces}</td><td><strong>${c.total}</strong></td><td>${c.min}</td>
    </tr>`).join('');
}

// --- Renderizar Top 5 ---
function renderizarTop5() {
    const container = document.getElementById('top5-container');
    const filtroEvento = document.getElementById('filtro-evento-top5').value;
    const filtroCat = document.getElementById('filtro-cat-top5').value;

    let datos = [...tablaCalculada];
    if (filtroEvento !== 'todos') datos = datos.filter(c => c.evento === filtroEvento);
    if (filtroCat !== 'todas') datos = datos.filter(c => c.categoria === filtroCat);

    // Agrupar por evento+categoria
    const grupos = {};
    datos.forEach(c => {
        const key = `${c.evento} - ${c.categoria}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(c);
    });

    if (Object.keys(grupos).length === 0) { container.innerHTML = '<p class="placeholder-text">Calcula la tabla primero</p>'; return; }

    let html = '';
    Object.keys(grupos).sort().forEach(key => {
        const grupo = grupos[key].slice(0, 5);
        html += `<div class="premiacion-card"><h3>${key}</h3>
            <div class="tabla-container"><table>
            <thead><tr><th>Pos</th><th>Dorsal</th><th>Nombre</th><th>Equipo</th><th>I</th><th>II</th><th>III</th><th>IV</th><th>V</th><th>#V</th><th>Total</th></tr></thead><tbody>`;
        grupo.forEach((c, i) => {
            html += `<tr><td>${i+1}</td><td>${c.dorsal}</td><td>${c.nombre}</td><td>${c.equipo||'-'}</td><td>${c.ptos[0]||'-'}</td><td>${c.ptos[1]||'-'}</td><td>${c.ptos[2]||'-'}</td><td>${c.ptos[3]||'-'}</td><td>${c.ptos[4]||'-'}</td><td>${c.veces}</td><td><strong>${c.total}</strong></td></tr>`;
        });
        html += '</tbody></table></div></div>';
    });
    container.innerHTML = html;
}

// --- Actualizar filtros ---
function actualizarFiltros() {
    const eventos = [...new Set(tablaCorredores.map(c => c.evento).filter(e => e))];
    const cats = [...new Set(tablaCorredores.map(c => c.categoria).filter(c => c))];

    const selEvtGen = document.getElementById('filtro-evento-general');
    const selEvtTop = document.getElementById('filtro-evento-top5');
    const selCat = document.getElementById('filtro-cat-general');
    const selCatTop = document.getElementById('filtro-cat-top5');

    selEvtGen.innerHTML = '<option value="todos">-- Todos los eventos --</option>' + eventos.map(e => `<option value="${e}">${e}</option>`).join('');
    selEvtTop.innerHTML = '<option value="todos">-- Todos los eventos --</option>' + eventos.map(e => `<option value="${e}">${e}</option>`).join('');
    selCat.innerHTML = '<option value="todas">-- Todas las categorias --</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
    selCatTop.innerHTML = '<option value="todas">-- Todas las categorias --</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
}


// --- Exportar CSV General ---
function exportarGeneralCSV() {
    if (tablaCalculada.length === 0) { mostrarNotificacion('Calcula primero', 'error'); return; }
    const nombre = document.getElementById('nombre-serie').value || 'Serie';
    const BOM = '\uFEFF';
    let csv = 'POS_C,EVENTO,DORSAL,NOMBRE_BD,NUEVA_CATEGORIA,EQUIPO,I_PTOS,II_PTOS,III_PTOS,IV_PTOS,V_PTOS,#VECES,TOTAL,MIN\n';
    tablaCalculada.forEach(c => {
        csv += `${c.pos_c},"${c.evento}","${c.dorsal}","${c.nombre}","${c.categoria}","${c.equipo||''}",${c.ptos[0]},${c.ptos[1]},${c.ptos[2]},${c.ptos[3]},${c.ptos[4]},${c.veces},${c.total},${c.min}\n`;
    });
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `tabla_general_${nombre.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    mostrarNotificacion('CSV exportado', 'exito');
}

// --- Exportar Top 5 CSV ---
function exportarTop5CSV() {
    if (tablaCalculada.length === 0) { mostrarNotificacion('Calcula primero', 'error'); return; }
    const nombre = document.getElementById('nombre-serie').value || 'Serie';
    const BOM = '\uFEFF';
    let csv = '';
    const grupos = {};
    tablaCalculada.forEach(c => {
        const key = `${c.evento}|${c.categoria}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(c);
    });
    Object.keys(grupos).sort().forEach(key => {
        const [evt, cat] = key.split('|');
        const top5 = grupos[key].slice(0, 5);
        csv += `\n--- ${evt} - ${cat} ---\n`;
        csv += 'Pos,Dorsal,Nombre,Equipo,I,II,III,IV,V,#Veces,Total\n';
        top5.forEach((c, i) => {
            csv += `${i+1},${c.dorsal},"${c.nombre}","${c.equipo||''}",${c.ptos[0]},${c.ptos[1]},${c.ptos[2]},${c.ptos[3]},${c.ptos[4]},${c.veces},${c.total}\n`;
        });
    });
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `top5_premiacion_${nombre.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    mostrarNotificacion('Top 5 CSV exportado', 'exito');
}


// --- Generar PDF General ---
function generarPDFGeneral() {
    if (tablaCalculada.length === 0) { mostrarNotificacion('Calcula primero', 'error'); return; }
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'letter');
        const nombre = document.getElementById('nombre-serie').value || 'Serie';

        doc.setFontSize(16);
        doc.setTextColor(200, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(normalizarTexto(nombre.toUpperCase()), doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('TABLA GENERAL DE SERIE', doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

        const datos = tablaCalculada.map(c => [
            c.pos_c, c.dorsal, normalizarTexto(c.nombre), normalizarTexto(c.categoria),
            normalizarTexto(c.equipo || ''), c.ptos[0] || '-', c.ptos[1] || '-', c.ptos[2] || '-',
            c.ptos[3] || '-', c.ptos[4] || '-', c.veces, c.total, c.min
        ]);

        doc.autoTable({
            startY: 27,
            head: [['Pos', 'Dor', 'Nombre', 'Categoria', 'Equipo', 'I', 'II', 'III', 'IV', 'V', '#V', 'Total', 'Min']],
            body: datos,
            styles: { fontSize: 6.5, cellPadding: 1.5 },
            headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 12 }, 11: { fontStyle: 'bold' } }
        });

        doc.save(`tabla_general_${nombre.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        mostrarNotificacion('PDF General generado', 'exito');
    } catch(e) { alert('Error PDF: ' + e.message); }
}

// --- Generar PDF Top 5 ---
function generarPDFTop5() {
    if (tablaCalculada.length === 0) { mostrarNotificacion('Calcula primero', 'error'); return; }
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('portrait', 'mm', 'letter');
        const nombre = document.getElementById('nombre-serie').value || 'Serie';

        doc.setFontSize(16);
        doc.setTextColor(200, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(normalizarTexto(nombre.toUpperCase()), doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('PREMIACION TOP 5 POR CATEGORIA', doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

        let startY = 30;
        const grupos = {};
        tablaCalculada.forEach(c => {
            const key = `${c.evento} - ${c.categoria}`;
            if (!grupos[key]) grupos[key] = [];
            grupos[key].push(c);
        });

        Object.keys(grupos).sort().forEach(key => {
            const top5 = grupos[key].slice(0, 5);
            if (startY + 40 > 260) { doc.addPage(); startY = 20; }

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'bold');
            doc.text(normalizarTexto(key.toUpperCase()), 14, startY);
            startY += 2;

            const datos = top5.map((c, i) => [i + 1, c.dorsal, normalizarTexto(c.nombre), normalizarTexto(c.equipo || ''), c.veces, c.total]);

            doc.autoTable({
                startY: startY,
                head: [['Pos', 'Dorsal', 'Nombre', 'Equipo', '#V', 'Total']],
                body: datos,
                styles: { fontSize: 8, cellPadding: 1.5 },
                headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
                columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 14 }, 5: { fontStyle: 'bold' } },
                margin: { left: 14, right: 14 }
            });
            startY = doc.lastAutoTable.finalY + 8;
        });

        doc.save(`top5_premiacion_${nombre.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        mostrarNotificacion('PDF Top 5 generado', 'exito');
    } catch(e) { alert('Error PDF: ' + e.message); }
}


// --- Generar PDF TODO (General completa + Top 5) ---
function generarPDFTodo() {
    if (tablaCalculada.length === 0) { mostrarNotificacion('Calcula primero', 'error'); return; }
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'letter');
        const nombre = document.getElementById('nombre-serie').value || 'Serie';

        // --- Parte 1: Tabla General por Evento/Categoria ---
        const grupos = {};
        tablaCalculada.forEach(c => {
            const key = `${c.evento} - ${c.categoria}`;
            if (!grupos[key]) grupos[key] = [];
            grupos[key].push(c);
        });

        // Portada
        doc.setFontSize(20);
        doc.setTextColor(200, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(normalizarTexto(nombre.toUpperCase()), doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('TABLA GENERAL DE SERIE', doc.internal.pageSize.getWidth() / 2, 52, { align: 'center' });
        doc.setFontSize(10);
        doc.text('Fecha: ' + new Date().toLocaleDateString('es-ES'), doc.internal.pageSize.getWidth() / 2, 62, { align: 'center' });
        doc.text('Total corredores: ' + tablaCalculada.length, doc.internal.pageSize.getWidth() / 2, 70, { align: 'center' });

        // Tabla general completa por categoria
        Object.keys(grupos).sort().forEach(key => {
            doc.addPage();
            const grupo = grupos[key];

            doc.setFontSize(12);
            doc.setTextColor(200, 0, 0);
            doc.setFont(undefined, 'bold');
            doc.text(normalizarTexto(key.toUpperCase()), 14, 15);
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`${grupo.length} corredores`, 14, 21);

            const datos = grupo.map(c => [
                c.pos_c, c.dorsal, normalizarTexto(c.nombre), normalizarTexto(c.equipo || ''),
                c.ptos[0] || '-', c.ptos[1] || '-', c.ptos[2] || '-', c.ptos[3] || '-', c.ptos[4] || '-',
                c.veces, c.total, c.min
            ]);

            doc.autoTable({
                startY: 25,
                head: [['Pos', 'Dor', 'Nombre', 'Equipo', 'I', 'II', 'III', 'IV', 'V', '#V', 'Total', 'Min']],
                body: datos,
                styles: { fontSize: 7, cellPadding: 1.5 },
                headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.5 },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 12 }, 10: { fontStyle: 'bold' } }
            });
        });

        // --- Parte 2: Top 5 por categoria ---
        doc.addPage('portrait');
        doc.setFontSize(16);
        doc.setTextColor(200, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(normalizarTexto(nombre.toUpperCase()), doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('PREMIACION TOP 5 POR CATEGORIA', doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

        let startY = 30;
        Object.keys(grupos).sort().forEach(key => {
            const top5 = grupos[key].slice(0, 5);
            if (startY + 40 > 260) { doc.addPage(); startY = 20; }

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'bold');
            doc.text(normalizarTexto(key.toUpperCase()), 14, startY);
            startY += 2;

            const datos = top5.map((c, i) => [i + 1, c.dorsal, normalizarTexto(c.nombre), normalizarTexto(c.equipo || ''),
                c.ptos[0]||'-', c.ptos[1]||'-', c.ptos[2]||'-', c.ptos[3]||'-', c.ptos[4]||'-', c.veces, c.total]);

            doc.autoTable({
                startY: startY,
                head: [['Pos', 'Dor', 'Nombre', 'Equipo', 'I', 'II', 'III', 'IV', 'V', '#V', 'Total']],
                body: datos,
                styles: { fontSize: 7.5, cellPadding: 1.5 },
                headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
                columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 1: { halign: 'center', cellWidth: 12 }, 10: { fontStyle: 'bold' } },
                margin: { left: 14, right: 14 }
            });
            startY = doc.lastAutoTable.finalY + 8;
        });

        doc.save(`tabla_general_completa_${nombre.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        mostrarNotificacion('PDF completo generado', 'exito');
    } catch(e) { alert('Error PDF: ' + e.message); }
}
