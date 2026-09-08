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
              className={isActive ? 'active' : ''}
              onClick={() => navegarPara(btn.id)}
              style={{
                display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                height: '30px', padding: '0 7px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', gap: '3px',
                cursor: 'pointer', transition: '0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                border: 'none',
                background: isActive ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
                color: '#007aff',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <i className={`fas ${btn.icon}`} style={{ fontSize: '11px' }}></i> {btn.label}
            </button>
          );
        })}
      </div>

      <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', flexShrink: 0, flexWrap: 'nowrap' }}>
        <span style={{ whiteSpace: 'nowrap', color: '#3c3c43', fontSize: '11px', fontWeight: '600' }}>
          <i className="fas fa-circle" style={{ color: autenticado ? '#34c759' : '#8e8e93', fontSize: '7px' }}></i>{' '}
          {autenticado && usuarioLogado ? usuarioLogado.usuario.toUpperCase() : 'Bloqueado'}
        </span>

        {autenticado && statusSincronizacao && (
          <span title={statusSincronizacao} style={{ whiteSpace: 'nowrap', fontSize: '10px', color: statusSincronizacao.startsWith('Falha') ? '#dc2626' : statusSincronizacao === 'Sincronizando' ? '#2563eb' : '#16a34a' }}>
            <i className={`fas ${statusSincronizacao === 'Sincronizando' ? 'fa-sync-alt fa-spin' : statusSincronizacao.startsWith('Falha') ? 'fa-exclamation-circle' : 'fa-cloud-check'}`} style={{ marginRight: '2px' }}></i>
            {statusSincronizacao}
          </span>
        )}

        {autenticado && sincronizarImagens && (
          <button
            onClick={sincronizarImagens}
            title="Baixar e sincronizar imagens dos produtos da nuvem"
            style={{
              background: 'rgba(0, 122, 255, 0.08)',
              border: '1px solid rgba(0, 122, 255, 0.2)',
              color: '#007aff',
              cursor: 'pointer',
              padding: '4px 7px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <i className="fas fa-image" style={{ fontSize: '10px' }}></i> Imagens
          </button>
        )}

        {autenticado && !isGarcom && (
          <button
            onClick={logoutSistema}
            title="Sair do Sistema"
            style={{
              background: 'rgba(255, 59, 48, 0.08)', border: 'none', color: '#ff3b30',
              cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '600',
              display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', flexShrink: 0
            }}
          >
            Sair <i className="fas fa-sign-out-alt" style={{ fontSize: '10px' }}></i>
          </button>
        )}
      </div>
    </div>
  );
};
