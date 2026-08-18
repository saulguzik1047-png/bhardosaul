import React from 'react';
import { formatarMoeda, calcularTotal } from './formatadores.js';
import { supabaseClient } from './supabase.js';

export const Clientes = ({
  clientesCadastrados,
  setClientesCadastrados,
  comandas,
  setComandas,
  crediarios,
  setCrediarios,
  vendas,
  setVendas,
  dispararMensagem
}) => {
  const [novoClienteNomeInput, setNovoClienteNomeInput] = React.useState('');
  const [novoClienteSobrenomeInput, setNovoClienteSobrenomeInput] = React.useState('');
  const [novoClienteTelefoneInput, setNovoClienteTelefoneInput] = React.useState('');
  const [pesquisaClienteBase, setPesquisaClienteBase] = React.useState('');
  const [expandedCliente, setExpandedCliente] = React.useState(null);
  const [clienteEmEdicao, setClienteEmEdicao] = React.useState(null);
  const [editNomeInput, setEditNomeInput] = React.useState('');
  const [editSobrenomeInput, setEditSobrenomeInput] = React.useState('');
  const [editTelefoneInput, setEditTelefoneInput] = React.useState('');

  const abrirEdicaoCliente = (cli) => {
    setClienteEmEdicao(cli);
    const partesNome = (cli.nome || '').split(' ');
    setEditNomeInput(partesNome[0] || '');
    setEditSobrenomeInput(cli.sobrenome || partesNome.slice(1).join(' '));
    setEditTelefoneInput(cli.telefone || '');
  };

  const fecharEdicaoCliente = () => setClienteEmEdicao(null);

  const handleSalvarEdicaoCliente = async (e) => {
    e.preventDefault();
    if (!clienteEmEdicao) return;
    if (!editNomeInput.trim() || !editSobrenomeInput.trim()) {
      dispararMensagem('Erro', 'Nome e Sobrenome são obrigatórios.');
      return;
    }

    const nomeAntigo = clienteEmEdicao.nome;
    const nome = editNomeInput.trim().toUpperCase();
    const sobrenome = editSobrenomeInput.trim().toUpperCase();
    const nomeNovo = `${nome} ${sobrenome}`;
    const telefone = editTelefoneInput.trim();

    if (
      nomeNovo.toLowerCase() !== nomeAntigo.toLowerCase() &&
      clientesCadastrados.some((c) => c.nome.toLowerCase() === nomeNovo.toLowerCase())
    ) {
      dispararMensagem('Aviso', 'Já existe outro cliente cadastrado com este nome.');
      return;
    }

    setClientesCadastrados((prev) =>
      prev.map((c) =>
        c.nome.toLowerCase() === nomeAntigo.toLowerCase()
          ? { ...c, nome: nomeNovo, sobrenome, telefone }
          : c
      )
    );

    const nomeMudou = nomeNovo.toLowerCase() !== nomeAntigo.toLowerCase();
    if (nomeMudou) {
      if (typeof setComandas === 'function') {
        setComandas((prev) =>
          prev.map((c) => (c.nome.toLowerCase() === nomeAntigo.toLowerCase() ? { ...c, nome: nomeNovo } : c))
        );
      }
      if (typeof setCrediarios === 'function') {
        setCrediarios((prev) =>
          prev.map((c) => (c.cliente.toLowerCase() === nomeAntigo.toLowerCase() ? { ...c, cliente: nomeNovo } : c))
        );
      }
      if (typeof setVendas === 'function') {
        setVendas((prev) =>
          prev.map((v) => (v.cliente.toLowerCase() === nomeAntigo.toLowerCase() ? { ...v, cliente: nomeNovo } : v))
        );
      }
    }

    try {
      await supabaseClient
        ?.from('clientes')
        .update({ nome: nomeNovo, sobrenome, telefone })
        .eq('nome', nomeAntigo);

      if (nomeMudou) {
        await Promise.all([
          supabaseClient?.from('comandas').update({ nome: nomeNovo }).eq('nome', nomeAntigo),
          supabaseClient?.from('crediarios').update({ cliente: nomeNovo }).eq('cliente', nomeAntigo),
          supabaseClient?.from('vendas').update({ cliente: nomeNovo }).eq('cliente', nomeAntigo),
        ]);
      }
    } catch (err) {
      console.warn('Nuvem offline:', err);
    }

    dispararMensagem('Sucesso', 'Cliente atualizado com sucesso!');
    setClienteEmEdicao(null);
  };

  const handleSalvarCliente = async (e) => {
    e.preventDefault();
    if (!novoClienteNomeInput.trim() || !novoClienteSobrenomeInput.trim()) {
      dispararMensagem('Erro', 'Nome e Sobrenome são obrigatórios.');
      return;
    }
    const nome = novoClienteNomeInput.trim().toUpperCase();
    const sobrenome = novoClienteSobrenomeInput.trim().toUpperCase();
    const nomeCompleto = `${nome} ${sobrenome}`;
    if (
      clientesCadastrados.some(
        (c) => c.nome.toLowerCase() === nomeCompleto.toLowerCase()
      )
    ) {
      dispararMensagem('Aviso', 'Este cliente já está cadastrado.');
      return;
    }
    const novoCli = {
      nome: nomeCompleto,
      sobrenome,
      telefone: novoClienteTelefoneInput.trim(),
      foto: '',
    };
    setClientesCadastrados(prev => [...prev, novoCli]);
    try { await supabaseClient?.from('clientes').insert([novoCli]); } catch (err) { console.warn('Nuvem offline:', err); }
    setNovoClienteNomeInput('');
    setNovoClienteSobrenomeInput('');
    setNovoClienteTelefoneInput('');
    dispararMensagem('Sucesso', 'Cliente cadastrado com sucesso!');
  };

  const clientesFiltradosPesquisa = clientesCadastrados.filter(
    (cli) =>
      cli.nome.toLowerCase().includes(pesquisaClienteBase.toLowerCase()) ||
      (cli.sobrenome &&
        cli.sobrenome
          .toLowerCase()
          .includes(pesquisaClienteBase.toLowerCase())) ||
      (cli.telefone && cli.telefone.includes(pesquisaClienteBase))
  );

  return (
    <div className="estoque-dark-container">
      <div className="estoque-dark-header">
        <div className="estoque-dark-title-box">
          <div
            className="estoque-dark-icon-badge"
            style={{ borderColor: '#ef4444', color: '#ef4444' }}
          >
            <i className="fas fa-users"></i>
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '20px' }}>
              Gerenciamento de Clientes
            </h2>
            <p
              style={{
                margin: '4px 0 0 0',
                color: '#64748b',
                fontSize: '13px',
              }}
            >
              Cadastre e pesquise rapidamente seus clientes.
            </p>
          </div>
        </div>
      </div>

      <div
        className="estoque-dark-layout"
        style={{ gridTemplateColumns: '1fr 1fr' }}
      >
        <div className="estoque-dark-panel-left">
          <div className="estoque-dark-section-title">
            Novo cadastro de cliente
          </div>
          <form
            onSubmit={handleSalvarCliente}
            style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
          >
            <div className="dark-form-row">
              <div className="dark-input-group">
                <label>Nome *</label>
                <input
                  type="text"
                  className="dark-input-field"
                  value={novoClienteNomeInput}
                  onChange={(e) => setNovoClienteNomeInput(e.target.value)}
                  placeholder="Ex: João"
                />
              </div>
              <div className="dark-input-group">
                <label>Sobrenome *</label>
                <input
                  type="text"
                  className="dark-input-field"
                  value={novoClienteSobrenomeInput}
                  onChange={(e) =>
                    setNovoClienteSobrenomeInput(e.target.value)
                  }
                  placeholder="Ex: Silva"
                />
              </div>
            </div>
            <div className="dark-input-group">
              <label>Telefone / WhatsApp</label>
              <input
                type="text"
                className="dark-input-field"
                value={novoClienteTelefoneInput}
                onChange={(e) => setNovoClienteTelefoneInput(e.target.value)}
                placeholder="Ex: 31999999999"
              />
            </div>
            <button
              type="submit"
              className="btn-dark-save"
              style={{
                alignSelf: 'flex-start',
                width: 'auto',
                marginTop: '10px',
              }}
            >
              <i className="fas fa-user-plus"></i> Cadastrar Cliente
            </button>
          </form>
        </div>

        <div className="estoque-dark-panel-right">
          <div
            className="dark-quick-info"
            style={{ height: '100%' }}
          >
            <div className="dark-quick-info-title">
              <i className="fas fa-search"></i> Pesquisa Geral de Contas e
              Comandas
            </div>

            <div
              className="dark-search-bar-auto"
              style={{ marginTop: '0px', marginBottom: '15px' }}
            >
              <i className="fas fa-search" style={{ color: 'var(--ios-label-tertiary)' }}></i>
              <input
                type="text"
                placeholder="Buscar por nome, sobrenome ou telefone..."
                value={pesquisaClienteBase}
                onChange={(e) => setPesquisaClienteBase(e.target.value)}
              />
            </div>

            <div
              style={{ maxHeight: '340px', overflowY: 'auto' }}
              className="wrapper-tabela-scroll"
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr>
                    <th style={{ color: 'var(--ios-label-tertiary)', fontSize: '11px', padding: '10px' }}>
                      Nome Completo
                    </th>
                    <th style={{ color: 'var(--ios-label-tertiary)', fontSize: '11px', padding: '10px' }}>
                      Telefone
                    </th>
                    <th style={{ color: 'var(--ios-label-tertiary)', fontSize: '11px', padding: '10px', textAlign: 'center' }}>
                      Abertas
                    </th>
                    <th style={{ color: 'var(--ios-label-tertiary)', fontSize: '11px', padding: '10px', textAlign: 'center' }}>
                      Pendentes
                    </th>
                    <th style={{ color: 'var(--ios-label-tertiary)', fontSize: '11px', padding: '10px', textAlign: 'center' }}>
                      Pagas
                    </th>
                    <th style={{ color: 'var(--ios-label-tertiary)', fontSize: '11px', padding: '10px', textAlign: 'center' }}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltradosPesquisa.map((cli, index) => {
                    const abertasQtd = comandas.filter(
                      (com) =>
                        com.nome.toLowerCase() === cli.nome.toLowerCase()
                    ).length;
                    const pendentesQtd = crediarios.filter(
                      (cred) =>
                        cred.cliente.toLowerCase() ===
                          cli.nome.toLowerCase() && cred.status === 'Pendente'
                    ).length;

                    const vendasCliente = vendas.filter(
                      (v) =>
                        v.cliente.toLowerCase() === cli.nome.toLowerCase() &&
                        !v.cliente.includes('Crediário')
                    );
                    const pagasQtd =
                      crediarios.filter(
                        (cred) =>
                          cred.cliente.toLowerCase() ===
                            cli.nome.toLowerCase() && cred.status === 'Pago'
                      ).length + vendasCliente.length;

                    return (
                      <React.Fragment key={index}>
                        <tr
                          style={{
                            borderBottom: '1px solid var(--ios-fill-secondary)',
                            cursor: 'pointer',
                          }}
                          onClick={() =>
                            setExpandedCliente(
                              expandedCliente === cli.nome ? null : cli.nome
                            )
                          }
                        >
                          <td style={{ padding: '10px', fontSize: '13px', color: 'var(--ios-label)' }}>
                            <strong>{cli.nome}</strong>
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', color: 'var(--ios-label-secondary)' }}>
                            {cli.telefone || 'Não informado'}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', color: abertasQtd > 0 ? 'var(--ios-green)' : 'var(--ios-label-quaternary)', textAlign: 'center', fontWeight: 'bold' }}>
                            {abertasQtd}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', color: pendentesQtd > 0 ? '#fb923c' : 'var(--ios-label-quaternary)', textAlign: 'center', fontWeight: 'bold' }}>
                            {pendentesQtd}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', color: pagasQtd > 0 ? '#a3e635' : 'var(--ios-label-quaternary)', textAlign: 'center', fontWeight: 'bold' }}>
                            {pagasQtd}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              title="Editar cliente"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirEdicaoCliente(cli);
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid #38bdf8',
                                color: '#38bdf8',
                                borderRadius: '6px',
                                padding: '5px 8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              <i className="fas fa-pen"></i> Editar
                            </button>
                          </td>
                        </tr>
                        {expandedCliente === cli.nome && (
                          <tr style={{ backgroundColor: 'var(--ios-fill)' }}>
                            <td
                              colSpan="6"
                              style={{
                                padding: '15px',
                                borderBottom: '1px solid var(--ios-fill-secondary)',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: 'var(--ios-label-tertiary)',
                                  marginBottom: '10px',
                                  textTransform: 'uppercase',
                                  fontWeight: 'bold',
                                }}
                              >
                                <i className="fas fa-list-ul"></i> Detalhamento do Consumo:
                              </div>

                              {comandas
                                .filter(
                                  (com) =>
                                    com.nome.toLowerCase() ===
                                    cli.nome.toLowerCase()
                                )
                                .map((c) => (
                                  <div
                                    key={'aberta' + c.id}
                                    style={{
                                      marginBottom: '10px',
                                      padding: '8px',
                                      borderLeft: '3px solid #4ade80',
                                      background: 'var(--ios-fill)',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: '12px',
                                        color: '#4ade80',
                                        fontWeight: 'bold',
                                        marginBottom: '5px',
                                      }}
                                    >
                                      Mesa Ativa #{c.id} - Total:{' '}
                                      {formatarMoeda(calcularTotal(c.itens))}
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                      {c.itens.map((i, idx) => (
                                        <li
                                          key={idx}
                                          style={{
                                            fontSize: '11px',
                                            color: 'var(--ios-label)',
                                            marginBottom: '2px',
                                          }}
                                        >
                                          • {i.qtd}x {i.nome} —{' '}
                                          <span style={{ color: 'var(--ios-label-tertiary)' }}>
                                            {formatarMoeda(i.preco * i.qtd)}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}

                              {crediarios
                                .filter(
                                  (cred) =>
                                    cred.cliente.toLowerCase() ===
                                      cli.nome.toLowerCase() &&
                                    cred.status === 'Pendente'
                                )
                                .map((c) => (
                                  <div
                                    key={'cred' + c.idCred}
                                    style={{
                                      marginBottom: '10px',
                                      padding: '8px',
                                      borderLeft: `3px solid #fb923c`,
                                      background: 'var(--ios-fill)',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: '12px',
                                        color: '#fb923c',
                                        fontWeight: 'bold',
                                        marginBottom: '5px',
                                      }}
                                    >
                                      Fiado Pendente ({c.data.split(',')[0]})
                                      - Total: {formatarMoeda(c.total)}
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                      {c.itensConsumidos &&
                                        c.itensConsumidos.map((i, idx) => (
                                          <li
                                            key={idx}
                                            style={{
                                              fontSize: '11px',
                                              color: 'var(--ios-label)',
                                              marginBottom: '2px',
                                            }}
                                          >
                                            • {i.qtd}x {i.nome} —{' '}
                                            <span style={{ color: 'var(--ios-label-tertiary)' }}>
                                              {formatarMoeda(i.preco * i.qtd)}
                                            </span>
                                          </li>
                                        ))}
                                    </ul>
                                  </div>
                                ))}

                              {[
                                ...crediarios.filter(
                                  (cred) =>
                                    cred.cliente.toLowerCase() ===
                                      cli.nome.toLowerCase() &&
                                    cred.status === 'Pago'
                                ),
                                ...vendasCliente,
                              ].map((v, idx) => {
                                const isCred = v.hasOwnProperty('idCred');
                                const valor = isCred
                                  ? v.pagamentos
                                    ? v.pagamentos.reduce(
                                        (acc, p) => acc + p.valor,
                                        0
                                      )
                                    : 0
                                  : v.total;
                                const itens = isCred
                                  ? v.itensConsumidos
                                  : v.itensConsumidos;
                                const metodoExibicao = isCred
                                  ? v.pagamentos && v.pagamentos.length > 0
                                    ? v.pagamentos
                                        .map((p) => p.metodo)
                                        .join(', ')
                                    : 'Não informado'
                                  : v.pagamento;

                                return (
                                  <div
                                    key={'hist' + idx}
                                    style={{
                                      marginBottom: '10px',
                                      padding: '8px',
                                      borderLeft: `3px solid #a3e635`,
                                      background: 'var(--ios-fill)',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: '12px',
                                        color: '#a3e635',
                                        fontWeight: 'bold',
                                        marginBottom: '5px',
                                      }}
                                    >
                                      {isCred ? 'Fiado Pago' : 'Venda Direta'}{' '}
                                      ({v.data.split(',')[0]}) - Valor:{' '}
                                      {formatarMoeda(valor)}
                                      <span style={{ color: 'var(--ios-label-tertiary)', marginLeft: '5px' }}>
                                        ({metodoExibicao})
                                      </span>
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                      {itens &&
                                        itens.map((i, iidx) => (
                                          <li
                                            key={iidx}
                                            style={{
                                              fontSize: '11px',
                                              color: 'var(--ios-label)',
                                              marginBottom: '2px',
                                            }}
                                          >
                                            • {i.qtd}x {i.nome} —{' '}
                                            <span style={{ color: 'var(--ios-label-tertiary)' }}>
                                              {formatarMoeda(i.preco * i.qtd)}
                                            </span>
                                          </li>
                                        ))}
                                    </ul>
                                  </div>
                                );
                              })}

                              {abertasQtd === 0 &&
                                pendentesQtd === 0 &&
                                pagasQtd === 0 && (
                                  <div style={{ fontSize: '11px', color: 'var(--ios-label-tertiary)', fontStyle: 'italic' }}>
                                    Nenhum consumo registrado.
                                  </div>
                                )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {clientesFiltradosPesquisa.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        style={{
                          padding: '20px',
                          color: 'var(--ios-label-tertiary)',
                          textAlign: 'center',
                          fontSize: '13px',
                          fontStyle: 'italic',
                        }}
                      >
                        Nenhum cliente correspondente encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {clienteEmEdicao && (
        <div className="custom-dialog-overlay">
          <div className="custom-dialog-box" style={{ maxWidth: '420px' }}>
            <div className="custom-dialog-title" style={{ color: '#38bdf8' }}>
              <i className="fas fa-user-edit"></i>
              <span>Editar Cliente</span>
            </div>
            <form
              onSubmit={handleSalvarEdicaoCliente}
              style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}
            >
              <div className="dark-form-row">
                <div className="dark-input-group">
                  <label>Nome *</label>
                  <input
                    type="text"
                    className="dark-input-field"
                    value={editNomeInput}
                    onChange={(e) => setEditNomeInput(e.target.value)}
                    placeholder="Ex: João"
                  />
                </div>
                <div className="dark-input-group">
                  <label>Sobrenome *</label>
                  <input
                    type="text"
                    className="dark-input-field"
                    value={editSobrenomeInput}
                    onChange={(e) => setEditSobrenomeInput(e.target.value)}
                    placeholder="Ex: Silva"
                  />
                </div>
              </div>
              <div className="dark-input-group">
                <label>Telefone / WhatsApp</label>
                <input
                  type="text"
                  className="dark-input-field"
                  value={editTelefoneInput}
                  onChange={(e) => setEditTelefoneInput(e.target.value)}
                  placeholder="Ex: 31999999999"
                />
              </div>
              <div className="custom-dialog-buttons">
                <button type="button" className="btn-dialog-cancel" onClick={fecharEdicaoCliente}>
                  Cancelar
                </button>
                <button type="submit" className="btn-dialog-confirm" style={{ background: '#0284c7' }}>
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};