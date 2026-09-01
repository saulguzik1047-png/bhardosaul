import React from 'react';

export const Auditoria = ({ logsAuditoria }) => {
  const formatarDetalhesExtras = (detalhes) => {
    if (!detalhes || typeof detalhes !== 'object') return '-';

    const camposPrincipais = new Set(['id_comanda', 'id_cred', 'nome_cliente', 'cliente', 'produto', 'quantidade', 'valor']);
    const extras = Object.entries(detalhes).filter(([chave]) => !camposPrincipais.has(chave));
    if (extras.length === 0) return '-';

    return (
      <div style={{ display: 'grid', gap: '3px', minWidth: '140px' }}>
        {extras.map(([chave, valor]) => (
          <div key={chave} style={{ display: 'flex', gap: '5px', fontSize: '11px', lineHeight: 1.35 }}>
            <strong style={{ color: 'var(--ios-label-secondary)', whiteSpace: 'nowrap' }}>
              {chave.replace(/_/g, ' ')}:
            </strong>
            <span style={{ color: 'var(--ios-label)', overflowWrap: 'anywhere' }}>
              {typeof valor === 'object' ? JSON.stringify(valor) : String(valor)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="single-container">
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>Auditoria</h2>
        <span style={{ color: 'var(--ios-label-secondary)', fontSize: '13px' }}>Histórico de cancelamentos, ajustes e exclusões.</span>
      </div>
      <div className="wrapper-tabela-scroll" style={{ background: 'var(--ios-fill)', borderRadius: '8px', padding: '4px' }}>
        <table className="tabela-padrao">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Operador</th>
              <th>Motivo</th>
              <th>Comanda / Débito</th>
              <th>Cliente</th>
              <th>Produto</th>
              <th>Qtd.</th>
              <th>Valor</th>
              <th>Outros detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logsAuditoria.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.data).toLocaleString()}</td>
                <td>{log.tipo}</td>
                <td>{log.operador}</td>
                <td>{log.motivo}</td>
                <td>{log.detalhes?.id_comanda ? `#${log.detalhes.id_comanda}` : log.detalhes?.id_cred ? `#${log.detalhes.id_cred}` : '-'}</td>
                <td>{log.detalhes?.nome_cliente || log.detalhes?.cliente || '-'}</td>
                <td>{log.detalhes?.produto || '-'}</td>
                <td style={{ textAlign: 'center' }}>{log.detalhes?.quantidade ?? '-'}</td>
                <td style={{ textAlign: 'right' }}>{log.detalhes?.valor ?? '-'}</td>
                <td>{formatarDetalhesExtras(log.detalhes)}</td>
              </tr>
            ))}
            {logsAuditoria.length === 0 && (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '24px', color: 'var(--ios-label-tertiary)' }}>
                  Nenhuma movimentação registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};