// ================= CONFIGURAÇÃO =================
const API_URL = 'https://sistema-ponto-seven.vercel.app/api/ponto';

// Variáveis globais
let colaboradores = [];
let registrosPonto = [];
let trocasTurno = [];

// ================= FUNÇÕES DE COMUNICAÇÃO =================
async function chamarAPI(acao, dados = {}) {
    try {
        const url = `${API_URL}?acao=${acao}`;
        const resposta = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        if (!resposta.ok) {
            const erro = await resposta.text();
            throw new Error(`HTTP ${resposta.status}: ${erro}`);
        }
        
        const resultado = await resposta.json();
        return resultado;
    } catch (erro) {
        console.error(`❌ Erro na API (${acao}):`, erro);
        return { sucesso: false, mensagem: 'Erro de conexão: ' + erro.message };
    }
}

// ================= COLABORADORES =================
async function listarColaboradores() {
    const resultado = await chamarAPI('listarColaboradores');
    if (resultado.sucesso) {
        colaboradores = resultado.dados;
        renderizarColaboradores();
    } else {
        console.error('Erro ao listar colaboradores:', resultado.mensagem);
    }
}

async function adicionarColaborador(dados) {
    const resultado = await chamarAPI('adicionarColaborador', dados);
    if (resultado.sucesso) {
        alert('✅ Colaborador adicionado!');
        await listarColaboradores();
        await carregarEstatisticas();
        return true;
    } else {
        alert('❌ ' + (resultado.mensagem || 'Erro ao adicionar'));
        return false;
    }
}

async function editarColaborador(id, dados) {
    const resultado = await chamarAPI('editarColaborador', { id, dadosColab: dados });
    if (resultado.sucesso) {
        alert('✅ Colaborador editado!');
        await listarColaboradores();
    } else {
        alert('❌ ' + (resultado.mensagem || 'Erro ao editar'));
    }
}

async function excluirColaborador(id) {
    if (confirm('Tem certeza que deseja excluir este colaborador?')) {
        const resultado = await chamarAPI('excluirColaborador', { id });
        if (resultado.sucesso) {
            alert('✅ Colaborador excluído!');
            await listarColaboradores();
            await carregarEstatisticas();
        } else {
            alert('❌ ' + (resultado.mensagem || 'Erro ao excluir'));
        }
    }
}

// ================= REGISTROS =================
async function listarRegistros() {
    const resultado = await chamarAPI('listarRegistros');
    if (resultado.sucesso) {
        registrosPonto = resultado.dados;
        renderizarRegistros();
    } else {
        console.error('Erro ao listar registros:', resultado.mensagem);
    }
}

async function registrarPonto(dados) {
    const resultado = await chamarAPI('registrarPonto', dados);
    if (resultado.sucesso) {
        alert(resultado.mensagem);
        await listarRegistros();
        await carregarEstatisticas();
        return true;
    } else {
        alert('❌ ' + (resultado.mensagem || 'Erro ao registrar ponto'));
        return false;
    }
}

// ================= BIOMETRIA =================
async function verificarBiometria(hash) {
    const resultado = await chamarAPI('verificarBiometria', { hash });
    return resultado;
}

async function cadastrarBiometria(dados) {
    const resultado = await chamarAPI('cadastrarBiometria', dados);
    return resultado;
}

// ================= TROCAS =================
async function listarTrocas() {
    const resultado = await chamarAPI('listarTrocas');
    if (resultado.sucesso) {
        trocasTurno = resultado.dados;
        renderizarTrocas();
    } else {
        console.error('Erro ao listar trocas:', resultado.mensagem);
    }
}

async function registrarTroca(dados) {
    const resultado = await chamarAPI('registrarTroca', dados);
    if (resultado.sucesso) {
        alert('🔄 Troca registrada!');
        await listarTrocas();
    } else {
        alert('❌ ' + (resultado.mensagem || 'Erro ao registrar troca'));
    }
}

// ================= ÁREA T.I =================
async function loginTI(usuario, senha) {
    const resultado = await chamarAPI('loginTI', { usuario, senha });
    return resultado;
}

async function listarUsuariosTI() {
    const resultado = await chamarAPI('listarUsuariosTI');
    if (resultado.sucesso) {
        renderizarUsuariosTI(resultado.dados);
    }
}

async function adicionarUsuarioTI(usuario, senha, tipo) {
    const resultado = await chamarAPI('adicionarUsuarioTI', { usuario, senha, tipo });
    if (resultado.sucesso) {
        alert('✅ Usuário adicionado!');
        await listarUsuariosTI();
    } else {
        alert('❌ ' + (resultado.mensagem || 'Erro ao adicionar usuário'));
    }
}

async function excluirUsuarioTI(usuario) {
    if (confirm(`Tem certeza que deseja excluir o usuário ${usuario}?`)) {
        const resultado = await chamarAPI('excluirUsuarioTI', { usuario });
        if (resultado.sucesso) {
            alert('✅ Usuário excluído!');
            await listarUsuariosTI();
        } else {
            alert('❌ ' + (resultado.mensagem || 'Erro ao excluir usuário'));
        }
    }
}

// ================= ESTATÍSTICAS =================
async function carregarEstatisticas() {
    const resultado = await chamarAPI('estatisticas');
    if (resultado.sucesso) {
        const totalColab = document.getElementById('totalColab');
        const registrosHoje = document.getElementById('registrosHoje');
        
        if (totalColab) totalColab.textContent = resultado.totalColaboradores || 0;
        if (registrosHoje) registrosHoje.textContent = resultado.registrosHoje || 0;
    } else {
        console.error('Erro ao carregar estatísticas:', resultado.mensagem);
    }
}

// ================= FUNÇÕES DE RENDERIZAÇÃO =================
function renderizarColaboradores() {
    const container = document.getElementById('colaboradoresList');
    if (!container) return;
    
    if (!colaboradores || colaboradores.length === 0) {
        container.innerHTML = '<div class="status status-info">Nenhum colaborador cadastrado</div>';
        return;
    }
    
    let html = '';
    colaboradores.forEach(c => {
        html += `
            <div class="card">
                <div class="card-title">${escapeHtml(c.nome)}</div>
                <div class="card-subtitle">Mat: ${escapeHtml(c.matricula)} • ${escapeHtml(c.cargo || '-')}</div>
                <div class="card-detail">${escapeHtml(c.escola || '-')} • ${c.cargaHoraria || 160}h</div>
                <div class="card-actions">
                    <button class="btn-small btn-primary" onclick="editarColaborador(${c.id})">✏️ Editar</button>
                    <button class="btn-small btn-danger" onclick="excluirColaborador(${c.id})">❌ Excluir</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderizarRegistros() {
    const container = document.getElementById('registrosList');
    if (!container) return;
    
    if (!registrosPonto || registrosPonto.length === 0) {
        container.innerHTML = '<div class="status status-info">Nenhum registro de ponto encontrado</div>';
        return;
    }
    
    const registrosOrdenados = [...registrosPonto].reverse().slice(0, 50);
    
    let html = '';
    registrosOrdenados.forEach(r => {
        html += `
            <div class="card">
                <div class="card-title">${escapeHtml(r.nome)}</div>
                <div class="card-subtitle">${escapeHtml(r.data)} • ${escapeHtml(r.entrada || '-')} ${r.saida ? '→ ' + escapeHtml(r.saida) : ''}</div>
                <div class="card-detail">Tipo: ${escapeHtml(r.tipo || 'Manual')}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderizarTrocas() {
    const container = document.getElementById('trocasList');
    if (!container) return;
    
    if (!trocasTurno || trocasTurno.length === 0) {
        container.innerHTML = '<div class="status status-info">Nenhuma troca de turno registrada</div>';
        return;
    }
    
    let html = '';
    trocasTurno.slice().reverse().forEach(t => {
        html += `
            <div class="card">
                <div class="card-title">🔄 Troca de Turno</div>
                <div class="card-subtitle">${escapeHtml(t.saidaNome)} → ${escapeHtml(t.entradaNome)}</div>
                <div class="card-detail">Data: ${escapeHtml(t.data)} • Motivo: ${escapeHtml(t.motivo)}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderizarUsuariosTI(usuarios) {
    const container = document.getElementById('usuariosTIList');
    if (!container) return;
    
    if (!usuarios || usuarios.length === 0) {
        container.innerHTML = '<div class="status status-info">Nenhum usuário cadastrado</div>';
        return;
    }
    
    let html = '';
    usuarios.forEach(u => {
        html += `
            <div class="card" style="margin-top: 10px;">
                <div class="card-title">${escapeHtml(u.usuario)}</div>
                <div class="card-subtitle">Tipo: ${escapeHtml(u.tipo)}</div>
                <button class="btn-small btn-danger" onclick="excluirUsuarioTI('${escapeHtml(u.usuario)}')">Excluir</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ================= FUNÇÕES AUXILIARES =================
function escapeHtml(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

// ================= FOLHA DE PONTO =================
async function gerarFolhaPonto(mes, ano) {
    const resultado = await chamarAPI('gerarFolhaPonto', { mes, ano });
    if (resultado.sucesso) {
        let html = gerarHTMLFolha(resultado.dados, mes, ano);
        const janela = window.open('', '_blank');
        janela.document.write(html);
        janela.document.close();
        janela.print();
    } else {
        alert('❌ ' + (resultado.mensagem || 'Erro ao gerar folha de ponto'));
    }
}

function gerarHTMLFolha(folhas, mes, ano) {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const nomeMes = meses[mes - 1];
    
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Folha de Ponto - ${nomeMes}/${ano}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; padding: 30px; background: #f5f5f5; }
                .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                h1 { text-align: center; color: #667eea; margin-bottom: 10px; }
                .subtitle { text-align: center; color: #666; margin-bottom: 30px; }
                .folha { margin-bottom: 50px; page-break-after: always; }
                h2 { color: #333; margin: 20px 0 10px; border-left: 5px solid #667eea; padding-left: 15px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background: #667eea; color: white; padding: 12px; font-weight: 600; }
                td { border: 1px solid #ddd; padding: 10px; text-align: center; }
                tr:nth-child(even) { background: #f9f9f9; }
                .total { font-weight: bold; background: #e8f5e9; }
                .assinatura { margin-top: 40px; text-align: center; border-top: 2px solid #ccc; padding-top: 20px; }
                .info { margin: 10px 0; color: #666; }
                .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
                @media print {
                    body { padding: 0; background: white; }
                    .container { padding: 20px; box-shadow: none; }
                    .page-break { page-break-after: always; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📋 SISTEMA DE PONTO ELETRÔNICO</h1>
                <div class="subtitle">Folha de Ponto - ${nomeMes}/${ano}</div>
    `;
    
    folhas.forEach(f => {
        // Calcular total de horas
        let totalHoras = 0;
        f.registros.forEach(r => {
            if (r.entrada && r.saida) {
                const entradaHora = parseInt(r.entrada.split(':')[0]);
                const entradaMin = parseInt(r.entrada.split(':')[1]);
                const saidaHora = parseInt(r.saida.split(':')[0]);
                const saidaMin = parseInt(r.saida.split(':')[1]);
                const horas = (saidaHora - entradaHora) + (saidaMin - entradaMin) / 60;
                totalHoras += horas;
            }
        });
        
        const horasExtras = totalHoras > f.cargaHoraria ? (totalHoras - f.cargaHoraria).toFixed(2) : 0;
        const horasFaltantes = totalHoras < f.cargaHoraria ? (f.cargaHoraria - totalHoras).toFixed(2) : 0;
        
        html += `
            <div class="folha">
                <h2>👤 ${escapeHtml(f.colaborador)}</h2>
                <div class="info">
                    <strong>Matrícula:</strong> ${escapeHtml(f.matricula)} | 
                    <strong>Escola:</strong> ${escapeHtml(f.escola)} | 
                    <strong>Cargo:</strong> ${escapeHtml(f.cargo)} |
                    <strong>Carga Horária Mensal:</strong> ${f.cargaHoraria}h
                </div>
                
                <table>
                    <thead>
                        <tr><th>Dia</th><th>Data</th><th>Entrada</th><th>Saída</th><th>Horas</th><th>Observação</th></tr>
                    </thead>
                    <tbody>
        `;
        
        // Criar mapa de registros por dia
        const registrosPorDia = {};
        f.registros.forEach(r => {
            const dia = r.data.split('/')[0];
            registrosPorDia[dia] = r;
        });
        
        // Gerar todos os dias do mês
        const diasNoMes = new Date(ano, mes, 0).getDate();
        for (let d = 1; d <= diasNoMes; d++) {
            const dia = d.toString().padStart(2, '0');
            const registro = registrosPorDia[dia];
            const dataFormatada = `${dia}/${mes.toString().padStart(2, '0')}/${ano}`;
            
            let horasDia = 0;
            if (registro && registro.entrada && registro.saida) {
                const entradaHora = parseInt(registro.entrada.split(':')[0]);
                const entradaMin = parseInt(registro.entrada.split(':')[1]);
                const saidaHora = parseInt(registro.saida.split(':')[0]);
                const saidaMin = parseInt(registro.saida.split(':')[1]);
                horasDia = (saidaHora - entradaHora) + (saidaMin - entradaMin) / 60;
            }
            
            html += `
                <tr>
                    <td>${dia}</td>
                    <td>${dataFormatada}</td>
                    <td>${registro?.entrada || '-'}</td>
                    <td>${registro?.saida || '-'}</td>
                    <td>${horasDia > 0 ? horasDia.toFixed(2) + 'h' : '-'}</td>
                    <td>${escapeHtml(registro?.observacao || '-')}</td>
                </tr>
            `;
        }
        
        html += `
                    <tr class="total">
                        <td colspan="4"><strong>TOTAL NO MÊS</strong></td>
                        <td><strong>${totalHoras.toFixed(2)}h</strong></td>
                        <td></td>
                    </tr>
                </tbody>
                </table>
                
                <div class="info">
                    <strong>📊 Resumo:</strong><br>
                    • Horas Trabalhadas: ${totalHoras.toFixed(2)}h<br>
                    • Carga Horária Contratada: ${f.cargaHoraria}h<br>
                    ${horasExtras > 0 ? `• Horas Extras: +${horasExtras}h` : ''}
                    ${horasFaltantes > 0 ? `• Horas Pendentes: -${horasFaltantes}h` : ''}
                </div>
                
                <div class="assinatura">
                    <p>____________________________________</p>
                    <p>Assinatura do Diretor(a)</p>
                    <p>${escapeHtml(f.escola)}</p>
                </div>
            </div>
        `;
    });
    
    html += `
                <div class="footer">
                    Sistema de Ponto Eletrônico - Desenvolvido por João Paulo da Silva de Farias<br>
                    Documento gerado em ${new Date().toLocaleString('pt-BR')}
                </div>
            </div>
        </body>
        </html>
    `;
    
    return html;
}

// ================= INICIALIZAÇÃO =================
async function inicializarApp() {
    console.log('🚀 Inicializando app...');
    
    // Verificar conexão com a API
    const teste = await chamarAPI('estatisticas');
    if (teste.sucesso) {
        console.log('✅ API conectada com sucesso!');
    } else {
        console.warn('⚠️ Erro na conexão com API:', teste.mensagem);
    }
    
    await carregarEstatisticas();
    await listarColaboradores();
    await listarRegistros();
    await listarTrocas();
    
    console.log('✅ App inicializado!');
}

// Aguardar DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarApp);
} else {
    inicializarApp();
}
