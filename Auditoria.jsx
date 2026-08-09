import React from 'react';

export const Auditoria = ({ logsAuditoria }) => {
  return (
    <div className="single-container">
      <h2>📋 Auditoria de Movimentações</h2>
      <div className="wrapper-tabela-scroll">
        <table className="tabela-padrao">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Operador</th>
              <th>Motivo</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logsAuditoria.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.data).toLocaleString()}</td>
                <td>{log.tipo}</td>
                <td>{log.operador}</td>
                <td>{log.motivo}</td>
                <td>{JSON.stringify(log.detalhes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};