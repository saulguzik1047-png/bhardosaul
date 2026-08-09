import React from 'react';

const LeitorNotaCamera = () => {
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [cameraAtiva, setCameraAtiva] = React.useState(false);
  const [stream, setStream] = React.useState(null);
  const [imagemCapturada, setImagemCapturada] = React.useState(null);
  const [textoExtraido, setTextoExtraido] = React.useState('');
  const [statusLendo, setStatusLendo] = React.useState('Aguardando câmera');
  const [progressoOcr, setProgressoOcr] = React.useState(0);
  const [erroPermissao, setErroPermissao] = React.useState(false);
  const [itensProcessados, setItensProcessados] = React.useState([]);
  const [modalTabelaAberto, setModalTabelaAberto] = React.useState(false);

  // --- FASE 1: GERENCIAR CÂMERA ---
  const iniciarCamera = async () => {
    setTextoExtraido('');
    setImagemCapturada(null);
    setErroPermissao(false);
    setItensProcessados([]);
    setStatusLendo('Iniciando câmera...');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatusLendo('Seu navegador bloqueou o acesso físico à câmera.');
      setErroPermissao(true);
      return;
    }

    try {
      const novoStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = novoStream;
      }
      
      setStream(novoStream);
      setCameraAtiva(true);
      setStatusLendo('Câmera pronta. Aponte para a nota e capture!');
    } catch (erro) {
      console.error("Erro ao acessar a câmera:", erro);
      setStatusLendo('Permissão negada ou câmera indisponível.');
      setErroPermissao(true);
      setCameraAtiva(false);
    }
  };

  const capturarFoto = () => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg');
    setImagemCapturada(dataUrl);

    pararCamera();
    setStatusLendo('Imagem capturada. Clique em Ler Texto para processar.');
  };

  const pararCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraAtiva(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // --- FASE 2: GERENCIAR OCR COM CARREGAMENTO ASSÍNCRONO SEGURO ---
  const executarOCR = async () => {
    if (!imagemCapturada) return;

    setStatusLendo('Lendo texto... (Carregando motor offline no navegador)');
    setTextoExtraido('');
    setProgressoOcr(0);
    setItensProcessados([]);

    try {
      // 🧠 SOLUÇÃO DE ENGENHARIA: Importação dinâmica sob demanda.
      // Impede que o StackBlitz trave a inicialização da tela com tela branca!
      const moduloTesseract = await import('tesseract.js');
      const Tesseract = moduloTesseract.default || moduloTesseract;

      const resultado = await Tesseract.recognize(
        imagemCapturada,
        'por',
        { 
          logger: info => {
            if (info.status === 'recognizing text') {
              setProgressoOcr(info.progress * 100);
            }
          }
        }
      );

      const textoFinal = resultado.data?.text || '';
      setTextoExtraido(textoFinal);
      setStatusLendo('Leitura concluída! Analisando produtos...');
      
      processarTextoLidoParaEstoque(textoFinal);
    } catch (erro) {
      console.error("Erro no Tesseract:", erro);
      setStatusLendo('Erro na leitura offline. Tente com uma imagem mais clara.');
    }
  };

  // --- FASE 3: INTELIGÊNCIA LOCAL (REGEX + CHECAGEM DE PRODUTO EXISTENTE) ---
  const processarTextoLidoParaEstoque = (texto) => {
    const textoSeguro = texto + '\n\n-- FIM --';
    const linhas = textoSeguro.split('\n');
    const itensEncontrados = [];
    
    let nomeTemporario = null;
    let qtdTemporaria = 1;

    linhas.forEach((linha) => {
      const matchNome = linha.match(/\d{4,5}\s*[-|.]?\s*([A-Z0-9\s.-]+?)(?=\s+(?:ve|\||\d{4,8}|$))/i);
      if (matchNome && matchNome[1]) {
        nomeTemporario = matchNome[1].replace(/\|\s*/g, '').trim();
      }

      const matchQtd = linha.match(/\s(\d{1,3})(?:,\d{2,4})?\s+(?:UN|CX|PC|KG|L|ve|\d{8})/i);
      if (matchQtd && matchQtd[1]) {
        qtdTemporaria = parseInt(matchQtd[1], 10) || 1;
      }

      const matchPreco = linha.match(/Preco\s*Final.*?[R$:]+\s*([\d.,]+)/i);

      if (matchPreco && matchPreco[1] && nomeTemporario) {
        const valorNumerico = parseFloat(matchPreco[1].replace(/\./g, '').replace(',', '.'));
        
        const nomeNorm = nomeTemporario.toLowerCase().replace(/\s+/g, '');
        const prodExistente = window.produtosSistema ? window.produtosSistema.find(p => {
          const pNorm = p.nome.toLowerCase().replace(/\s+/g, '');
          if (pNorm === nomeNorm) return true;
          if (pNorm.includes(nomeNorm.slice(0, 8)) || nomeNorm.includes(pNorm.slice(0, 8))) return true;
          if (p.apelidos && p.apelidos.length > 0) {
            return p.apelidos.some(a => {
              const aNorm = a.toLowerCase().replace(/\s+/g, '');
              return nomeNorm.includes(aNorm) || aNorm.includes(nomeNorm);
            });
          }
          return false;
        }) : null;

        itensEncontrados.push({
          idTemp: Date.now() + Math.random(),
          nome: nomeTemporario,
          custo: valorNumerico || 0,
          quantidade: qtdTemporaria,
          statusCadastro: prodExistente ? 'EXISTENTE' : 'PRE_CADASTRO',
          idVinculado: prodExistente ? prodExistente.id : null,
          nomeSistema: prodExistente ? prodExistente.nome : '⚠️ NOVO - Requer Confirmação'
        });

        nomeTemporario = null; 
        qtdTemporaria = 1;
      }
    });

    setItensProcessados(itensEncontrados);
    
    if (itensEncontrados.length > 0) {
      setModalTabelaAberto(true);
    }
    if (itensEncontrados.length > 0) {
      const novos = itensEncontrados.filter(i => i.statusCadastro === 'PRE_CADASTRO').length;
      if (novos > 0) {
        setStatusLendo(`Atenção: ${novos} produto(s) não encontrado(s) no sistema e foram Pré-Cadastrados.`);
      } else {
        setStatusLendo(`Sucesso! Todos os ${itensEncontrados.length} itens já existem no seu estoque.`);
      }
    } else {
      setStatusLendo('Texto lido, mas nenhum item foi extraído corretamente.');
    }
  };

  // --- INTERFACE ---
  return (
    <div style={{ padding: '15px', fontFamily: 'Arial, sans-serif', color: 'white' }}>
      <h3 style={{ color: '#f97316', marginTop: 0, marginBottom: '10px' }}>
        Leitor de Nota Fiscal - OCR Offline
      </h3>
      
      <p style={{ color: '#cbd5e1', fontSize: '13px', marginBottom: '15px' }}>
        Status: <strong style={{ color: erroPermissao ? '#ef4444' : '#38bdf8' }}>{statusLendo}</strong>
      </p>

      {/* Botões de Ação */}
      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {!cameraAtiva && !imagemCapturada && (
          <>
            <button onClick={iniciarCamera} style={estiloBotao('#3b82f6')}>
              <i className="fas fa-camera"></i> Abrir Câmera
            </button>
            
            <label style={{ ...estiloBotao('#0ea5e9'), cursor: 'pointer', margin: 0 }}>
              <i className="fas fa-file-upload"></i> Carregar Foto do Celular
              <input 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={(e) => {
                  const arquivo = e.target.files[0];
                  if (arquivo) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setImagemCapturada(event.target.result);
                      setTextoExtraido('');
                      setItensProcessados([]);
                      setModalTabelaAberto(false);
                      setStatusLendo('Foto do celular carregada! Clique em Ler Texto.');
                    };
                    reader.readAsDataURL(arquivo);
                  }
                }} 
              />
            </label>
          </>
        )}

        {cameraAtiva && (
          <>
            <button onClick={capturarFoto} style={estiloBotao('#22c55e')}>
              [ CAPTURAR FOTO ]
            </button>
            <button onClick={pararCamera} style={estiloBotao('#ef4444')}>
              Cancelar
            </button>
          </>
        )}

        {imagemCapturada && (
          <>
            <button onClick={executarOCR} style={estiloBotao('#f97316')}>
              <i className="fas fa-play"></i> Ler Texto (OCR Offline)
            </button>

            {/* Botão extra para reabrir a tabela sobreposta caso o usuário feche sem querer */}
            {itensProcessados.length > 0 && (
              <button onClick={() => setModalTabelaAberto(true)} style={estiloBotao('#22c55e')}>
                <i className="fas fa-external-link-alt"></i> Ver Itens Identificados ({itensProcessados.length})
              </button>
            )}

            <button 
              onClick={() => {
                setImagemCapturada(null);
                setTextoExtraido('');
                setItensProcessados([]);
                setModalTabelaAberto(false);
                setStatusLendo('Aguardando câmera ou arquivo');
              }} 
              style={estiloBotao('#64748b')}
            >
              Limpar / Outra Foto
            </button>
          </>
        )}
      </div>

      {/* Lado Esquerdo e Direito normais (Sem a tabela espremida!) */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '280px' }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{ 
              width: '100%', 
              height: 'auto', 
              display: cameraAtiva ? 'block' : 'none', 
              borderRadius: '8px',
              border: '2px solid #334155'
            }} 
          />

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {imagemCapturada && (
            <img 
              src={imagemCapturada} 
              alt="Nota capturada" 
              style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', borderRadius: '8px', border: '2px solid #334155', background: '#000' }} 
            />
          )}
        </div>

        <div style={{ flex: '1', minWidth: '280px' }}>
          {statusLendo.includes('Lendo texto') && (
            <div style={{ border: '1px solid #334155', padding: '10px', borderRadius: '6px', marginBottom: '10px', background: '#090f17' }}>
              <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                Processando localmente... {Math.round(progressoOcr)}%
              </div>
              <div style={{ width: '100%', background: '#1e293b', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progressoOcr}%`, height: '100%', background: '#f97316', transition: 'width 0.2s' }}></div>
              </div>
            </div>
          )}

          {/* Mostra apenas o texto lido na direita (a tabela agora abre flutuante!) */}
          {!modalTabelaAberto && textoExtraido && (
            <textarea
              readOnly
              value={textoExtraido}
              rows={14}
              placeholder="O texto extraído da nota aparecerá aqui..."
              style={{ 
                width: '100%', 
                padding: '10px', 
                background: '#090f17',
                border: '1px solid #334155',
                color: '#fff', 
                fontFamily: 'monospace', 
                fontSize: '12px',
                borderRadius: '6px',
                boxSizing: 'border-box'
              }}
            />
          )}
        </div>
      </div>

      {/* 🚀 JANELA SOBREPOSTA EM CIMA DE TUDO (TELA CHEIA / MODAL) */}
      {modalTabelaAberto && itensProcessados.length > 0 && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            backgroundColor: 'rgba(0, 0, 0, 0.85)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 999999, /* Garante que fique acima do menu e de todo o site */
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div 
            style={{ 
              background: '#0f172a', 
              border: '2px solid #38bdf8', 
              borderRadius: '12px', 
              width: '100%', 
              maxWidth: '820px', /* Janela bem larga para ler com conforto */
              maxHeight: '85vh', 
              display: 'flex', 
              flexDirection: 'column', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
              overflow: 'hidden'
            }}
          >
            {/* Cabeçalho da Janela Sobreposta */}
            <div style={{ background: '#0284c7', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '20px' }}></i>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                  Itens Identificados na Nota ({itensProcessados.length})
                </span>
              </div>
              <button 
                onClick={() => setModalTabelaAberto(false)} 
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '22px', cursor: 'pointer' }}
                title="Fechar janela"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Tabela Larga e Confortável */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <p style={{ color: '#cbd5e1', fontSize: '13px', marginTop: 0, marginBottom: '15px' }}>
                Confira abaixo os produtos extraídos da sua nota fiscal. Os itens em <strong>PRÉ-CADASTRO</strong> serão criados automaticamente no seu estoque com categoria "Geral".
              </p>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8', background: '#1e293b' }}>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Produto na Nota</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Qtd</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Custo Un.</th>
                    <th style={{ padding: '12px' }}>Correspondência no Sistema</th>
                  </tr>
                </thead>
                <tbody>
                  {itensProcessados.map((item) => (
                    <tr 
                      key={item.idTemp} 
                      style={{ 
                        borderBottom: '1px solid #1e293b', 
                        background: item.statusCadastro === 'PRE_CADASTRO' ? 'rgba(245, 158, 11, 0.08)' : 'transparent' 
                      }}
                    >
                      <td style={{ padding: '12px' }}>
                        {item.statusCadastro === 'EXISTENTE' ? (
                          <span style={{ background: '#166534', color: '#86efac', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>
                            OK (Existe)
                          </span>
                        ) : (
                          <span style={{ background: '#9a3412', color: '#fdba74', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>
                            PRÉ-CADASTRO
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>
                        {item.nome}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#38bdf8', textAlign: 'center', fontSize: '14px' }}>
                        {item.quantidade}x
                      </td>
                      <td style={{ padding: '12px', color: '#22c55e', fontWeight: 'bold', textAlign: 'right', fontSize: '14px' }}>
                        R$ {item.custo.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', color: item.statusCadastro === 'EXISTENTE' ? '#94a3b8' : '#f59e0b' }}>
                        {item.nomeSistema}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rodapé da Janela Sobreposta */}
            <div style={{ background: '#1e293b', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                * PRÉ-CADASTROS entram com margem de 100% no preço de venda.
              </span>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setModalTabelaAberto(false)}
                  style={{ background: '#64748b', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Fechar / Revisar Depois
                </button>

                <button
                  onClick={() => {
                    if (window.confirmarEntradaNotaEstoque) {
                      window.confirmarEntradaNotaEstoque(itensProcessados);
                      setModalTabelaAberto(false);
                    } else {
                      alert('Aguardando carregamento da ponte com o sistema...');
                    }
                  }}
                  style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px 22px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}
                >
                  <i className="fas fa-save"></i> Aprovar e Dar Entrada no Estoque
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

const estiloBotao = (cor) => ({
  backgroundColor: cor,
  color: 'white',
  border: 'none',
  padding: '10px 18px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
});

export default LeitorNotaCamera;
