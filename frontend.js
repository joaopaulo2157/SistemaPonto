// ================= FUNÇÕES DA API VERCEl (Frontend) =================

/**
 * Lista todos os projetos da Vercel
 */
async function listarProjetosVercel() {
    const resultado = await chamarAPI('listarProjetos');
    if (resultado.sucesso) {
        console.log('📁 Projetos encontrados:', resultado.dados);
        return resultado.dados;
    } else {
        console.error('Erro ao listar projetos:', resultado.mensagem);
        alert('❌ ' + resultado.mensagem);
        return [];
    }
}

/**
 * Lista deployments de um projeto
 */
async function listarDeploymentsVercel(projectId, limit = 10) {
    const resultado = await chamarAPI('listarDeployments', { projectId, limit });
    if (resultado.sucesso) {
        console.log(`🚀 Deployments do projeto ${projectId}:`, resultado.dados);
        return resultado.dados;
    } else {
        console.error('Erro ao listar deployments:', resultado.mensagem);
        alert('❌ ' + resultado.mensagem);
        return [];
    }
}

/**
 * Obtém detalhes de um deployment específico
 */
async function getDeploymentVercel(deploymentId) {
    const resultado = await chamarAPI('getDeployment', { deploymentId });
    if (resultado.sucesso) {
        console.log(`📦 Deployment ${deploymentId}:`, resultado.dados);
        return resultado.dados;
    } else {
        console.error('Erro ao obter deployment:', resultado.mensagem);
        return null;
    }
}

/**
 * Cancela um deployment
 */
async function cancelDeploymentVercel(deploymentId) {
    if (!confirm(`Tem certeza que deseja cancelar o deployment ${deploymentId}?`)) {
        return false;
    }
    
    const resultado = await chamarAPI('cancelDeployment', { deploymentId });
    if (resultado.sucesso) {
        alert('✅ Deployment cancelado com sucesso!');
        return true;
    } else {
        alert('❌ ' + resultado.mensagem);
        return false;
    }
}

/**
 * Cria um novo deployment (para deploy automático)
 */
async function criarDeploymentVercel(projectId, files) {
    const resultado = await chamarAPI('criarDeployment', { projectId, files });
    if (resultado.sucesso) {
        alert('✅ Deployment criado com sucesso!');
        console.log('Novo deployment:', resultado.dados);
        return resultado.dados;
    } else {
        alert('❌ ' + resultado.mensagem);
        return null;
    }
}

/**
 * Renderiza lista de projetos no painel T.I
 */
async function renderizarProjetosVercel() {
    const container = document.getElementById('vercelProjectsList');
    if (!container) return;
    
    container.innerHTML = '<div class="status status-info">Carregando projetos...</div>';
    
    const projetos = await listarProjetosVercel();
    
    if (!projetos || projetos.length === 0) {
        container.innerHTML = '<div class="status status-info">Nenhum projeto encontrado</div>';
        return;
    }
    
    let html = '';
    projetos.forEach(projeto => {
        html += `
            <div class="card">
                <div class="card-title">📁 ${escapeHtml(projeto.name)}</div>
                <div class="card-subtitle">ID: ${escapeHtml(projeto.id)}</div>
                <div class="card-detail">
                    Framework: ${projeto.framework || 'N/A'} | 
                    Criado em: ${new Date(projeto.createdAt).toLocaleDateString('pt-BR')}
                </div>
                <div class="card-actions">
                    <button class="btn-small btn-primary" onclick="verDeployments('${projeto.id}')">
                        🚀 Ver Deployments
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Renderiza lista de deployments
 */
async function renderizarDeploymentsVercel(projectId) {
    const container = document.getElementById('vercelDeploymentsList');
    if (!container) return;
    
    container.innerHTML = '<div class="status status-info">Carregando deployments...</div>';
    
    const deployments = await listarDeploymentsVercel(projectId);
    
    if (!deployments || deployments.length === 0) {
        container.innerHTML = '<div class="status status-info">Nenhum deployment encontrado</div>';
        return;
    }
    
    let html = '';
    deployments.forEach(deploy => {
        const statusColor = deploy.readyState === 'READY' ? '#4caf50' : 
                           deploy.readyState === 'ERROR' ? '#f44336' : '#ff9800';
        
        html += `
            <div class="card">
                <div class="card-title">
                    🚀 Deployment #${escapeHtml(deploy.uid?.substring(0, 8))}
                    <span style="color: ${statusColor}; font-size: 12px; margin-left: 10px;">
                        ${deploy.readyState || 'PENDING'}
                    </span>
                </div>
                <div class="card-subtitle">
                    URL: <a href="https://${deploy.url}" target="_blank">${escapeHtml(deploy.url)}</a>
                </div>
                <div class="card-detail">
                    Criado em: ${new Date(deploy.createdAt).toLocaleString('pt-BR')}
                </div>
                <div class="card-actions">
                    <button class="btn-small btn-primary" onclick="verDetalhesDeployment('${deploy.uid}')">
                        📋 Detalhes
                    </button>
                    ${deploy.readyState !== 'READY' ? `
                        <button class="btn-small btn-danger" onclick="cancelarDeployment('${deploy.uid}')">
                            ❌ Cancelar
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Funções auxiliares para a UI
async function verDeployments(projectId) {
    // Salvar projectId atual
    window.currentProjectId = projectId;
    
    // Mostrar área de deployments
    const deploymentsSection = document.getElementById('vercelDeploymentsSection');
    if (deploymentsSection) {
        deploymentsSection.style.display = 'block';
        await renderizarDeploymentsVercel(projectId);
    }
}

async function verDetalhesDeployment(deploymentId) {
    const deployment = await getDeploymentVercel(deploymentId);
    if (deployment) {
        alert(`📦 Detalhes do Deployment:\n\n` +
              `ID: ${deployment.uid}\n` +
              `URL: https://${deployment.url}\n` +
              `Status: ${deployment.readyState}\n` +
              `Criado: ${new Date(deployment.createdAt).toLocaleString('pt-BR')}\n` +
              `Projeto: ${deployment.name}`);
    }
}

async function cancelarDeployment(deploymentId) {
    await cancelDeploymentVercel(deploymentId);
    // Recarregar lista
    if (window.currentProjectId) {
        await renderizarDeploymentsVercel(window.currentProjectId);
    }
}

/**
 * Adicionar seção da Vercel no painel T.I
 */
function adicionarSecaoVercelNoTI() {
    const tiPainel = document.getElementById('tiPainel');
    if (!tiPainel) return;
    
    const vercelSection = `
        <div class="card" style="margin-top: 20px;">
            <div class="card-title">🚀 Gerenciamento Vercel</div>
            <div id="vercelProjectsList" style="margin: 15px 0;">
                <div class="status status-info">Carregando projetos...</div>
            </div>
            <div id="vercelDeploymentsSection" style="display: none;">
                <h4 style="margin: 15px 0 10px;">📦 Deployments</h4>
                <div id="vercelDeploymentsList"></div>
                <button class="btn-small btn-primary" onclick="voltarParaProjetos()" style="margin-top: 10px;">
                    ← Voltar para Projetos
                </button>
            </div>
            <button class="btn-small btn-primary" onclick="atualizarProjetosVercel()" style="margin-top: 10px;">
                🔄 Atualizar Projetos
            </button>
        </div>
    `;
    
    tiPainel.insertAdjacentHTML('beforeend', vercelSection);
}

function voltarParaProjetos() {
    document.getElementById('vercelDeploymentsSection').style.display = 'none';
    renderizarProjetosVercel();
}

async function atualizarProjetosVercel() {
    await renderizarProjetosVercel();
}

// Adicionar função de teste de conexão com API Vercel
async function testarConexaoVercel() {
    const resultado = await chamarAPI('listarProjetos');
    if (resultado.sucesso) {
        alert('✅ Conexão com API Vercel estabelecida!\nProjetos encontrados: ' + (resultado.dados?.length || 0));
    } else {
        alert('❌ Erro na conexão: ' + resultado.mensagem);
    }
}
