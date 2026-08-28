import React from 'react';

export const Header = ({
  nomeSoftware,
  telaAtual,
  proximaTelaPendente,
  navegarPara,
  autenticado,
  usuarioLogado,
  sincronizarDadosNuvem,
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
        height: '56px', padding: '8px 16px', gap: '12px'
      }}
    >
      <div
        className="bar-logo"
        style={{ position: 'static', transform: 'none', fontSize: '22px', fontWeight: '700', color: '#1c1c1e', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}
      >
        {nomeSoftware}
      </div>

      <div className="topbar-menu" style={{ display: 'flex', gap: '1px', flexWrap: 'nowrap', alignItems: 'center', minWidth: 0 }}>
        {navBtns.map((btn) => {
          const isActive = telaAtual === btn.id || (telaAtual === 'login_gerencial' && proximaTelaPendente === btn.id);
          return (
            <button
              key={btn.id}
              className={isActive ? 'active' : ''}
              onClick={() => navegarPara(btn.id)}
              style={{
                display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                height: '32px', padding: '0 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', gap: '4px',
                cursor: 'pointer', transition: '0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                border: 'none',
                background: isActive ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
                color: '#007aff',
                textTransform: 'uppercase',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <i className={`fas ${btn.icon}`} style={{ fontSize: '12px' }}></i> {btn.label}
            </button>
          );
        })}
      </div>

      <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
        <span style={{ whiteSpace: 'nowrap', color: '#3c3c43' }}>
          <i className="fas fa-circle" style={{ color: autenticado ? '#34c759' : '#8e8e93', fontSize: '8px' }}></i>{' '}
          {autenticado && usuarioLogado ? usuarioLogado.usuario.toUpperCase() : 'Bloqueado'}
        </span>

        {autenticado && !isGarcom && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={logoutSistema}
              title="Sair do Sistema"
              style={{
                background: 'rgba(255, 59, 48, 0.08)', border: 'none', color: '#ff3b30',
                cursor: 'pointer', padding: '7px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: '500',
                display: 'flex', alignItems: 'center', gap: '5px', transition: '0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)'
              }}
            >
              Sair <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
