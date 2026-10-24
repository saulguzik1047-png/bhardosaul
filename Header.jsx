import React from 'react';

export const Header = ({
  nomeSoftware,
  telaAtual,
  proximaTelaPendente,
  navegarPara,
  autenticado,
  usuarioLogado,
  sincronizarDadosNuvem,
  sincronizarImagens,
  statusSincronizacao,
  logoutSistema
}) => {
  const isGarcom = autenticado && usuarioLogado && usuarioLogado.perfil === 'garcom';

  let navBtns = [
    { id: 'pdv', icon: 'fa-calculator', label: 'PDV' },
    { id: 'estoque', icon: 'fa-boxes', label: 'Estoq.' },
    { id: 'auditoria', icon: 'fa-clipboard-list', label: 'Audit.' },
    { id: 'clientes', icon: 'fa-users', label: 'Clientes' },
    { id: 'financeiro', icon: 'fa-chart-line', label: 'Financ.' },
    { id: 'crediario', icon: 'fa-book-dead', label: 'Fiados' },
  ];

  if (autenticado && usuarioLogado && usuarioLogado.perfil === 'admin') {
    navBtns.push({ id: 'seguranca', icon: 'fa-user-shield', label: 'Acessos' });
  }

  if (isGarcom) {
    navBtns = [{ id: 'garcom', icon: 'fa-concierge-bell', label: 'Garçom' }];
  }

  return (
    <div
      className="topbar"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '56px', padding: '6px 12px', gap: '8px'
      }}
    >
      <div
        className="bar-logo"
        style={{ position: 'static', transform: 'none', fontSize: '18px', fontWeight: '700', color: '#1c1c1e', letterSpacing: '-0.5px', whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        {nomeSoftware}
      </div>

      <div className="topbar-menu" style={{ display: 'flex', gap: '2px', flexWrap: 'nowrap', alignItems: 'center', minWidth: 0, overflowX: 'auto' }}>
        {navBtns.map((btn) => {
          const isActive = telaAtual === btn.id || (telaAtual === 'login_gerencial' && proximaTelaPendente === btn.id);
          return (
            <button
              key={btn.id}
              className={`topbar-nav-button${isActive ? ' active' : ''}`}
              onClick={() => navegarPara(btn.id)}
            >
              <i className={`fas ${btn.icon}`}></i> {btn.label}
            </button>
          );
        })}
      </div>

      <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', flexShrink: 0, flexWrap: 'nowrap' }}>
        <span className={`topbar-user${autenticado ? '' : ' topbar-user-locked'}`}>
          <i className="fas fa-circle"></i>
          {autenticado && usuarioLogado ? usuarioLogado.usuario.toUpperCase() : 'Bloqueado'}
        </span>

        {autenticado && statusSincronizacao && (
          <span
            className={`topbar-status${statusSincronizacao.startsWith('Falha') ? ' topbar-status-error' : statusSincronizacao === 'Sincronizando' ? ' topbar-status-pending' : ''}`}
            title={statusSincronizacao}
            role="status"
            aria-live="polite"
          >
            <i className={`fas ${statusSincronizacao === 'Sincronizando' ? 'fa-sync-alt fa-spin' : statusSincronizacao.startsWith('Falha') ? 'fa-exclamation-circle' : 'fa-cloud-check'}`}></i>
            {statusSincronizacao.startsWith('Falha') ? 'Falha na nuvem · cache local' : statusSincronizacao}
          </span>
        )}

        {autenticado && sincronizarImagens && (
          <button
            className="topbar-utility-button"
            onClick={sincronizarImagens}
            title="Baixar e sincronizar imagens dos produtos da nuvem"
          >
            <i className="fas fa-image"></i> Imagens
          </button>
        )}

        {autenticado && !isGarcom && (
          <button
            className="topbar-utility-button topbar-logout-button"
            onClick={logoutSistema}
            title="Sair do Sistema"
          >
            <i className="fas fa-sign-out-alt"></i> Sair
          </button>
        )}
      </div>
    </div>
  );
};
