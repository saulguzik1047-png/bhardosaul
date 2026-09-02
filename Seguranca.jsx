import React from 'react';

export function Seguranca({
  cadastrarNovoOperador,
  novoUserNome, setNovoUserNome,
  novoUserSenha, setNovoUserSenha,
  novoUserPerfil, setNovoUserPerfil,
  novoUserRestricoes, gerenciarCheckboxRestricao,
  nomeSoftware, setNomeSoftware,
  usuariosSistema, setUsuarioEditando, excluirUsuario,
  obterConfigSupabase, salvarConfigSupabase, limparConfigSupabase,
  dispararMensagem, dispararConfirmacao
}) {
  const configAtual = obterConfigSupabase ? obterConfigSupabase() : { url: '', anonKey: '' };
  const [urlSupabase, setUrlSupabase] = React.useState(configAtual.url || '');
  const [anonKeySupabase, setAnonKeySupabase] = React.useState(configAtual.anonKey || '');

  function salvarESupabaseRecarregar() {
    if (!urlSupabase.trim() || !anonKeySupabase.trim()) {
      dispararMensagem?.('Erro', 'Preencha a URL e a Chave Anônima (anon key) do Supabase.');
      return;
    }
    salvarConfigSupabase?.({ url: urlSupabase.trim(), anonKey: anonKeySupabase.trim() });
    dispararConfirmacao?.(
      'Chaves Salvas',
      'As novas chaves do Supabase foram salvas neste dispositivo/navegador. É necessário recarregar a página para aplicar. Recarregar agora?',
      () => window.location.reload()
    );
  }

  function restaurarPadrao() {
    dispararConfirmacao?.(
      'Restaurar Padrão',
      'Isso remove as chaves personalizadas salvas neste navegador e volta a usar as chaves padrão do sistema. Deseja continuar?',
      () => {
        limparConfigSupabase?.();
        window.location.reload();
      }
    );
  }

  return (
    <div className="single-container">
      <h2>Controle de Acessos & Operadores do Sistema</h2>
      <div className="grid-financeiro-tabelas">
        <div className="col">
          <div className="card-panel">
            <h3>+ Cadastrar Novo Operador</h3>
            <form onSubmit={cadastrarNovoOperador} className="form-fin-bloco">
              <input
                type="text"
                placeholder="Nome do Usuário/Operador"
                value={novoUserNome}
                onChange={(e) => setNovoUserNome(e.target.value)}
              />
              <input
                type="password"
                placeholder="Definir Senha"
                value={novoUserSenha}
                onChange={(e) => setNovoUserSenha(e.target.value)}
              />
              <select
                value={novoUserPerfil}
                onChange={(e) => setNovoUserPerfil(e.target.value)}
              >
                <option value="operador">Operador (Perfil Padrão)</option>
                <option value="admin">Administrador (Acesso Total)</option>
                <option value="garcom">Garçom (Apenas Mesas/Cardápio)</option>
              </select>

              {novoUserPerfil === 'operador' && (
                <div>
                  <strong style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                    Telas Bloqueadas para este Operador:
                  </strong>
                  <div className="checkbox-group">
                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={novoUserRestricoes.includes('estoque')}
                        onChange={() => gerenciarCheckboxRestricao('estoque')}
                      />{' '}
                      Estoque
                    </label>
                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={novoUserRestricoes.includes('financeiro')}
                        onChange={() => gerenciarCheckboxRestricao('financeiro')}
                      />{' '}
                      Painel Financeiro
                    </label>
                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={novoUserRestricoes.includes('crediario')}
                        onChange={() => gerenciarCheckboxRestricao('crediario')}
                      />{' '}
                      Penduras/Crediário
                    </label>
                    <label className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={novoUserRestricoes.includes('seguranca')}
                        onChange={() => gerenciarCheckboxRestricao('seguranca')}
                      />{' '}
                      Segurança (Acessos)
                    </label>
                  </div>
                </div>
              )}
              <button type="submit" className="btn-add-fin" style={{ background: 'var(--blue)' }}>
                <i className="fas fa-user-plus"></i> Salvar Operador
              </button>
            </form>
          </div>

          <div className="card-panel">
            <h3><i className="fas fa-edit"></i> Personalização da Marca (White-Label)</h3>
            <div className="form-fin-bloco">
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-dark)' }}>
                Nome do Estabelecimento ou Software:
              </label>
              <input
                type="text"
                placeholder="Ex: BAR DO SAUL, MEU PDV..."
                value={nomeSoftware}
                onChange={(e) => setNomeSoftware(e.target.value)}
                style={{ textAlign: 'left', padding: '10px', border: '1px solid var(--border)' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-light)', margin: '4px 0 0 0' }}>
                Muda o Topbar, comandos, relatórios, notas fiscais e mensagens automatizadas globalmente.
              </p>
            </div>
          </div>

          <div className="card-panel">
            <h3><i className="fas fa-key"></i> Configuração para Novo Estabelecimento</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: 0 }}>
              Para ligar o sistema a um novo banco de dados Supabase, cole abaixo a URL e a Chave Anônima (anon key)
              do novo projeto. Essas duas informações são públicas por natureza (o próprio Supabase recomenda usá-las
              no navegador) e ficam salvas apenas neste dispositivo.
            </p>
            <div className="form-fin-bloco">
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-dark)' }}>
                Supabase Project URL:
              </label>
              <input
                type="text"
                placeholder="https://xxxxxxxx.supabase.co"
                value={urlSupabase}
                onChange={(e) => setUrlSupabase(e.target.value)}
                style={{ textAlign: 'left', padding: '10px', border: '1px solid var(--border)' }}
              />
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-dark)' }}>
                Supabase Anon/Public Key:
              </label>
              <input
                type="text"
                placeholder="eyJhbGciOi..."
                value={anonKeySupabase}
                onChange={(e) => setAnonKeySupabase(e.target.value)}
                style={{ textAlign: 'left', padding: '10px', border: '1px solid var(--border)' }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={salvarESupabaseRecarregar}
                  className="btn-add-fin"
                  style={{ background: 'var(--blue)', margin: 0 }}
                >
                  <i className="fas fa-save"></i> Salvar e Recarregar
                </button>
                <button
                  type="button"
                  onClick={restaurarPadrao}
                  className="btn-add-fin"
                  style={{ background: '#64748b', margin: 0 }}
                >
                  Restaurar Padrão
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#dc2626', margin: '6px 0 0 0' }}>
                Essas duas chaves só funcionam neste computador/navegador. Repita esse passo em cada aparelho usado no
                novo estabelecimento.
              </p>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '16px' }}>
              As chaves abaixo são <strong>secretas</strong> (dão acesso total ao servidor) e por isso não podem ser
              digitadas aqui — só quem administra a conta no Vercel consegue cadastrá-las, em Settings &gt; Environment
              Variables.
            </p>
            <div className="wrapper-tabela-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Variável</th>
                    <th>Uso</th>
                    <th>Onde configurar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td><code>SUPABASE_SERVICE_ROLE_KEY</code></td><td>Imagem e sincronização no servidor</td><td>Vercel, segredo</td></tr>
                  <tr><td><code>VITE_SUPABASE_STORAGE_BUCKET</code></td><td>Bucket das imagens de produtos</td><td>Vercel</td></tr>
                  <tr><td><code>OPENAI_API_KEY</code></td><td>Leitura de notas fiscais por IA</td><td>Vercel, segredo</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card-panel">
          <h3>Lista de Usuários Cadastrados</h3>
          <div className="wrapper-tabela-scroll">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Perfil</th>
                  <th>Telas Restritas</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuariosSistema.map((u) => (
                  <tr key={u.usuario}>
                    <td><strong>{u.usuario}</strong></td>
                    <td>
                      <span className={u.perfil === 'admin' ? 'status-pago' : 'status-pendente'}>
                        {u.perfil.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <small style={{ color: '#e74c3c' }}>
                        {u.restricoes && u.restricoes.length > 0
                          ? u.restricoes.join(', ').toUpperCase()
                          : 'NENHUMA'}
                      </small>
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => setUsuarioEditando(u)}
                          className="btn-add-fin"
                          style={{ background: '#3b82f6', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', margin: 0 }}
                        >
                          Editar
                        </button>
                        {u.usuario !== 'admin' && (
                          <button
                            onClick={() => excluirUsuario(u)}
                            className="btn-add-fin"
                            style={{ background: '#ef4444', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px', margin: 0 }}
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}