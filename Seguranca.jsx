import React from 'react';

export function Seguranca({
  cadastrarNovoOperador,
  novoUserNome, setNovoUserNome,
  novoUserSenha, setNovoUserSenha,
  novoUserPerfil, setNovoUserPerfil,
  novoUserRestricoes, gerenciarCheckboxRestricao,
  nomeSoftware, setNomeSoftware,
  usuariosSistema, setUsuarioEditando, excluirUsuario
}) {
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