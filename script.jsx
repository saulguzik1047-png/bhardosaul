import React from 'react';
import ReactDOM from 'react-dom/client';
import Tesseract from 'tesseract.js';
import LeitorNotaCamera from './LeitorNotaCamera.jsx';
import { supabaseClient } from './supabase.js';  
import { formatarMoeda, calcularTotal } from './formatadores.js';
import { criptografarSenha } from './seguranca.js';

import { Header } from './Header.jsx';
import { Login } from './Login.jsx';
import { Estoque } from './Estoque.jsx';
import { Clientes } from './Clientes.jsx';
import { Auditoria } from './Auditoria.jsx';
import { Seguranca } from './Seguranca.jsx';
import { Financeiro } from './Financeiro.jsx';
import { Crediario } from './Crediario.jsx';
import { PDV } from './PDV.jsx';
import { Garcom } from './Garcom.jsx';

const gerarImpressaoTermica = (conteudoHTML) => {
  let iframe = document.getElementById('iframe-impressora');
  
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'iframe-impressora';
    iframe.style.display = 'none'; 
    document.body.appendChild(iframe);
  }

  const htmlCompleto = `
    <html>
      <head>
        <title>Cupom</title>
        <style>
          @page { margin: 0; }
          body { 
            font-family: Arial, Helvetica, sans-serif; 
            width: 68mm; 
            margin: 0; 
            padding: 5px; 
            color: black; 
            font-size: 13px; 
            font-weight: bold; 
            line-height: 1.5; 
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .linha { border-bottom: 1px dashed black; margin: 8px 0; }
          .flex { display: flex; justify-content: space-between; }
          .item { font-size: 13px; font-weight: bold; margin-bottom: 3px; }
          .title { font-size: 16px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        ${conteudoHTML}
      </body>
    </html>
  `;
  
  iframe.contentDocument.open();
  iframe.contentDocument.write(htmlCompleto);
  iframe.contentDocument.close();
  
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 500);
};

const BANCO_IMAGENS_AUTOMATICAS = {
  Cervejas: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200&q=80',
  Drinks: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=200&q=80',
  Porções: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=200&q=80',
  'Não Alcoólicos': 'https://images.unsplash.com/photo-1548963363-fae5e6634a47?w=200&q=80',
};

const FRASES_ROCK = [
  '"Eu olho para o mundo e não vejo nenhuma col, quero que tudo seja pintado de preto." - Rolling Stones',
  '"É uma longa caminhada até o topo se você quer tocar Rock \'n\' Roll." - AC/DC',
  '"Não me impede agora, estou me divertindo tanto, estou tendo uma bola." - Queen',
  '"Vivendo rápido, morrendo jovem, tudo se resume a se divertun." - Motley Crue',
  '"Apenas um garoto de cidade pequena, born and raised in South Detroit." - Journey',
  '"Pode ser que eu saiba o que é o amor." - Motörhead',
];

const parseMoedaBR = (valor) => {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  const texto = String(valor || '').trim();
  if (!texto) return 0;

  const somenteNumeros = texto.replace(/[^\d]/g, '');
  if (!somenteNumeros) return 0;

  return Number(somenteNumeros) / 100;
};

const INTERVALO_BACKUP_MS = 10 * 60 * 1000;
const INTERVALO_MINIMO_ENTRE_BACKUPS_MS = 60 * 1000;

function App() {
  const [nomeSoftware, setNomeSoftware] = React.useState(() => {
    try {
      return localStorage.getItem('bhar_nome_software') || 'BHAR DO SAUL';
    } catch (e) {
      return 'BHAR DO SAUL';
    }
  });

  const [mostrarLeitorCamera, setMostrarLeitorCamera] = React.useState(false);
  const [processandoNota, setProcessandoNota] = React.useState(false);
  const [itensNotaIA, setItensNotaIA] = React.useState([]);

  const MAX_LADO_IMAGEM_NOTA = 1600;
  const QUALIDADE_JPEG_NOTA = 0.82;

  const converterArquivoParaBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const carregarImagemDataUrl = (dataUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = dataUrl;
    });
  };

  const extrairTextoNotaComOCR = async (file) => {
    try {
      if (!file || !file.type || !file.type.startsWith('image/')) return '';
      const base64 = await converterArquivoParaBase64(file);
      const resultado = await Tesseract.recognize(base64, 'por+eng', {
        logger: () => {}
      });

      const texto = String(resultado?.data?.text || '').trim();
      return texto;
    } catch (err) {
      console.warn('[OCR LOCAL] não foi possível ler a nota:', err);
      return '';
    }
  };

  const prepararImagemParaIA = async (file) => {
    const base64Original = await converterArquivoParaBase64(file);
    const tipo = String(file?.type || '').toLowerCase();

    if (!tipo.startsWith('image/')) return base64Original;

    try {
      const imagem = await carregarImagemDataUrl(base64Original);
      const larguraOriginal = Number(imagem.naturalWidth || imagem.width || 0);
      const alturaOriginal = Number(imagem.naturalHeight || imagem.height || 0);
      if (!larguraOriginal || !alturaOriginal) return base64Original;

      const maiorLado = Math.max(larguraOriginal, alturaOriginal);
      const precisaReduzir = maiorLado > MAX_LADO_IMAGEM_NOTA;
      const formatoNaoIdeal = !/(jpeg|jpg|png|webp)/i.test(tipo);
      if (!precisaReduzir && !formatoNaoIdeal) return base64Original;

      const escala = precisaReduzir ? (MAX_LADO_IMAGEM_NOTA / maiorLado) : 1;
      const novaLargura = Math.max(1, Math.round(larguraOriginal * escala));
      const novaAltura = Math.max(1, Math.round(alturaOriginal * escala));

      const canvas = document.createElement('canvas');
      canvas.width = novaLargura;
      canvas.height = novaAltura;
      const ctx = canvas.getContext('2d');
      if (!ctx) return base64Original;

      ctx.drawImage(imagem, 0, 0, novaLargura, novaAltura);
      return canvas.toDataURL('image/jpeg', QUALIDADE_JPEG_NOTA);
    } catch (err) {
      console.warn('[IA NOTA] não foi possível otimizar a imagem, usando original:', err);
      return base64Original;
    }
  };

  const processarNotaComIA = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcessandoNota(true);
    setModalRevisaoNota(true);
    setItensNotaIA([]);

    try {
      const base64DataUrl = await prepararImagemParaIA(file);
      const textoOcrLocal = await extrairTextoNotaComOCR(file);
      const nomesOficiais = produtos.map(p => {
        const aliases = (p.apelidos && p.apelidos.length > 0) ? ` (aliases: ${p.apelidos.join(', ')})` : '';
        return p.nome + aliases;
      }).join(', ');

      const payload = {
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Você é um sistema de leitura de nota fiscal e deve ser EXTREMAMENTE CONSERVADOR.\n\nTEXTO OCR LOCAL DA NOTA (fonte primária):\n"""\n${textoOcrLocal.slice(0, 4000)}\n"""\n\nLISTA DE REFERÊNCIA DE PRODUTOS DO SISTEMA: [${nomesOficiais}]\n\nREGRAS OBRIGATÓRIAS (NÃO QUEBRE):\n1. Use o texto OCR local como base principal para o que realmente existe na nota.\n2. NUNCA invente item que não esteja visível na nota ou no OCR.\n3. Se estiver em dúvida, mantenha o nome exatamente como lido na nota e deixe nomeSugeridoSistema vazio.\n4. Só sugira nome do sistema se houver alta semelhança com o item da nota e com a lista de referência.\n5. Não use conhecimento prévio de bar para adivinhar produtos.\n6. Quantidade e custoTotal devem refletir apenas o que aparece no documento.\n7. Se o item não tiver nome claro, não o inclua.\n8. Retorne no máximo 12 itens, priorizando item com valor e quantidade legíveis.\n\nRetorne APENAS JSON válido neste formato:\n{\n  "descricao": "Resumo curto",\n  "itens": [\n    {\n      "nomeLido": "texto cru lido na nota",\n      "nomeSugeridoSistema": "nome da lista somente se alta confiança, senão vazio",\n      "quantidade": 1,\n      "custoTotal": 15.50,\n      "confianca": 0.0\n    }\n  ]\n}`
              },
              {
                type: "image_url",
                image_url: {
                  url: base64DataUrl,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.1
      };

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://perjhxqgcdccmfyazubi.supabase.co';
    const endpoints = [
      {
        url: import.meta.env.VITE_PROCESSAR_NOTA_URL || '/api/processar-nota',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        url: `${supabaseUrl}/functions/v1/processar-nota`,
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
        }
      }
    ].filter((endpoint) => endpoint.url);

    let ultimaResposta = null;
    let res = null;

    for (const endpoint of endpoints) {
      try {
        res = await fetch(endpoint.url, {
          method: 'POST',
          headers: endpoint.headers,
          body: JSON.stringify(payload)
        });

        const respostaTexto = await res.text();
        ultimaResposta = respostaTexto;

        if (res.ok) {
          break;
        }

        let detalheErro = respostaTexto;
        try {
          const parsed = JSON.parse(respostaTexto);
          detalheErro = parsed.error || parsed.message || JSON.stringify(parsed);
        } catch (_) {}
        console.warn(`Erro no endpoint ${endpoint.url}:`, detalheErro);
      } catch (erro) {
        console.warn(`Falha ao chamar endpoint ${endpoint.url}:`, erro);
      }
    }

    if (!res || !res.ok) {
      const detalheErro = ultimaResposta ? `Erro na API: ${ultimaResposta}` : 'Sem resposta';
      console.error('🛑 Erro na API da OpenAI:', detalheErro);
      throw new Error(detalheErro);
    }

    const data = JSON.parse(ultimaResposta);

    let respostaIA = '';
    if (data.choices?.[0]?.message?.content) {
      respostaIA = data.choices[0].message.content;
    } else if (data.output?.[0]?.content) {
      const outputContent = data.output[0].content;
      const contentArray = Array.isArray(outputContent) ? outputContent : [outputContent];
      const textBlock = contentArray.find((item) => item?.type === 'output_text' || item?.type === 'message' || item?.type === 'text');
      respostaIA = textBlock?.text || textBlock?.value || textBlock?.content?.[0]?.text || '';
      if (!respostaIA && typeof outputContent === 'string') {
        respostaIA = outputContent;
      }
    } else {
      throw new Error('Resposta inesperada da IA');
    }

    console.log("🧠 RESPOSTA BRUTA DA IA:", respostaIA);
    if (typeof respostaIA === 'string') {
      respostaIA = respostaIA.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    const notaConvertida = typeof respostaIA === 'string' ? JSON.parse(respostaIA) : respostaIA;

      const normalizarNome = (valor) => String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      const itensProntos = (notaConvertida.itens || [])
        .map(item => {
          const nomeLido = String(item.nomeLido || item.nome || '').trim();
          const nomeSugerido = String(item.nomeSugeridoSistema || '').trim();
          const confianca = Number(item.confianca || 0);
          const nomeBase = nomeLido || nomeSugerido;

          if (!nomeBase || nomeBase.length < 2 || confianca < 0.45) {
            return null;
          }

          const nomeNormalizado = normalizarNome(nomeBase);
          const produtoSalvo = produtos.find(p => {
            const nomeProduto = normalizarNome(p.nome);
            if (nomeProduto === nomeNormalizado) return true;
            if (p.apelidos && p.apelidos.some(a => normalizarNome(a) === nomeNormalizado)) return true;
            return false;
          });

          const usarFatorDoProduto = !!produtoSalvo && confianca >= 0.75;
          const fatorReal = usarFatorDoProduto && produtoSalvo.fatorConversao > 1 ? produtoSalvo.fatorConversao : 1;
          const formatoReal = fatorReal > 1 ? 'fracionado' : 'padrao';
          const quantidade = Number(item.quantidade || 1);
          const custoTotal = Number(item.custoTotal || 0);

          if (!Number.isFinite(quantidade) || quantidade <= 0 || !Number.isFinite(custoTotal) || custoTotal <= 0) {
            return null;
          }

          return {
            idTemp: Math.random().toString(),
            nome: nomeBase,
            formato: formatoReal,
            qtdComprada: quantidade,
            fator: fatorReal,
            custoTotal,
          };
        })
        .filter(Boolean)
        .filter((item) => item.nome && item.qtdComprada > 0 && item.custoTotal > 0);

      setItensNotaIA(itensProntos);
    } catch (erro) {
      console.error(erro);
      const msg = String(erro?.message || 'Falha ao processar nota');
      let dica = 'A extração falhou. Verifique a chave da OpenAI e o endpoint de proxy.';
      if (msg.includes('OPENAI_API_KEY') || msg.toLowerCase().includes('chave')) {
        dica = 'A chave da OpenAI não está configurada no servidor. Configure OPENAI_API_KEY no Vercel/Supabase e tente novamente.';
      } else if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
        dica = 'A chave da OpenAI parece inválida ou sem permissão para visão.';
      } else if (msg.includes('413') || msg.toLowerCase().includes('payload too large') || msg.toLowerCase().includes('request entity too large')) {
        dica = 'A foto ficou muito pesada para o servidor. Tente aproximar melhor a nota e tirar a foto com boa luz.';
      } else if (file?.type === 'application/pdf') {
        dica = 'PDF pode falhar neste modo. Tente enviar a foto da nota (JPG/PNG) para extrair com IA.';
      }
      dispararMensagem("Erro na Leitura", dica);
      setModalRevisaoNota(false);
    } finally {
      setProcessandoNota(false);
      e.target.value = null; 
    }
  };

  const atualizarItemIA = (idTemp, campo, valor) => {
    setItensNotaIA(prev => prev.map(item => 
      item.idTemp === idTemp ? { ...item, [campo]: valor } : item
    ));
  };
  
  const confirmarProcessamentoNota = async () => {
    let produtosAtualizados = [...produtos];

    itensNotaIA.forEach(itemInfo => {
      // 🛠️ FIX CEO: Tratamento de vírgula para ponto vindo da IA para não quebrar o cálculo
      const valorLimpo = String(itemInfo.custoTotal).replace(',', '.');
      const qtdLimpa = String(itemInfo.qtdComprada).replace(',', '.');
      
      const quantidade = parseFloat(qtdLimpa) || 1;
      const fator = parseFloat(itemInfo.fator) || 1;
      const custoTotalFinal = parseFloat(valorLimpo) || 0;
      
      const qtdFinal = quantidade * fator;
      const custoUnitario = custoTotalFinal / (qtdFinal || 1);

      const nomeItemIA = itemInfo.nome.toLowerCase();
      const nomeNormalizadoItem = normalizarNomeProduto(itemInfo.nome);
      const indexExistente = produtosAtualizados.findIndex(p => {
        const nomeP = normalizarNomeProduto(p.nome);
        if (nomeP === nomeNormalizadoItem) return true;
        if (p.apelidos && p.apelidos.some(a => normalizarNomeProduto(a) === nomeNormalizadoItem)) return true;
        return false;
      });

      if (nomesProdutosExcluidosSet.has(nomeNormalizadoItem)) {
        return;
      }

      if (indexExistente >= 0) {
        produtosAtualizados[indexExistente] = {
          ...produtosAtualizados[indexExistente],
          estoque: produtosAtualizados[indexExistente].estoque + qtdFinal,
          precoCusto: custoUnitario,
          fatorConversao: fator,
        };
      } else {
        produtosAtualizados.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          nome: itemInfo.nome,
          category: 'Geral', 
          precoCusto: custoUnitario,
          preco: custoUnitario * 2,
          estoque: qtdFinal,
          estoqueMinimo: 5,
          imagem: '',
          fatorConversao: fator,
          dataUltimaCompra: new Date().toISOString().split('T')[0]
        });
      }
    });

    setProdutos(produtosAtualizados);

    try {
      for (const p of produtosAtualizados) {
        await supabaseClient?.from('produtos').upsert({
          id: p.id, nome: p.nome, category: p.category, preco: p.preco,
          preco_custo: p.precoCusto, estoque: p.estoque, estoque_minimo: p.estoqueMinimo,
          imagem: p.imagem || '', fator_conversao: p.fatorConversao || 1,
          apelidos: p.apelidos || [], data_ultima_compra: p.dataUltimaCompra || null
        });
      }
    } catch (err) { console.warn('Nuvem offline:', err); }
    
    // 🛠️ FIX CEO: Resolvemos o reducer da despesa pra lidar com strings com vírgula tbm
    const totalDaNota = itensNotaIA.reduce((acc, item) => acc + (parseFloat(String(item.custoTotal).replace(',', '.')) || 0), 0);
    setDespesas(prev => [...prev, {
      id: Date.now(),
      descricao: 'Compra de Mercadoria (Leitura IA)',
      valor: totalDaNota,
      vencimento: new Date().toISOString().split('T')[0],
      status: 'Pendente',
      formaPagamento: '-'
    }]);

    setModalRevisaoNota(false);
    dispararMensagem("Estoque Atualizado", "As conversões foram aplicadas, os novos itens foram pré-cadastrados e o valor foi lançado no financeiro!");
  };
 
  const [buscaData, setBuscaData] = React.useState('');
  const [telaAtual, setTelaAtual] = React.useState('login_gerencial');
  const [modoPagamento, setModoPagamento] = React.useState(false);
  const [mostrarMultiFormas, setMostrarMultiFormas] = React.useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = React.useState('Todos');
  const [autenticado, setAutenticado] = React.useState(false);
  const [usuarioDigitado, setUsuarioDigitado] = React.useState('admin');
  const [senhaDigitada, setSenhaDigitada] = React.useState('');
  const [usuarioLogado, setUsuarioLogado] = React.useState(null);
  const [erroAutenticacao, setErroAutenticacao] = React.useState(false);
  const [proximaTelaPendente, setProximaTelaPendente] = React.useState('pdv');
  
  const [filtroDia, setFiltroDia] = React.useState('Todos');
  const [filtroMes, setFiltroMes] = React.useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [filtroAno, setFiltroAno] = React.useState(() => String(new Date().getFullYear()));
  const [filtroPendenteInicio, setFiltroPendenteInicio] = React.useState('');
  const [filtroPendenteFim, setFiltroPendenteFim] = React.useState('');
  const [filtroPagoInicio, setFiltroPagoInicio] = React.useState('');
  const [filtroPagoFim, setFiltroPagoFim] = React.useState('');
  const [filtroRelatorioInicio, setFiltroRelatorioInicio] = React.useState('');
  const [filtroRelatorioFim, setFiltroRelatorioFim] = React.useState('');
  const [dataBaixaManual, setDataBaixaManual] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [despesaEmBaixa, setDespesaEmBaixa] = React.useState(null);
  const [filtroRelatorioEstoque, setFiltroRelatorioEstoque] = React.useState('Todos');
  const [caixaDialogo, setCaixaDialogo] = React.useState(null);
  const [promptVal, setPromptVal] = React.useState('');
  const [promptValDivisivel, setPromptValDivisivel] = React.useState(false);
  const [categoriaGerenciarSelecionada, setCategoriaGerenciarSelecionada] = React.useState('');
  const [novoNomeCategoriaGerenciar, setNovoNomeCategoriaGerenciar] = React.useState('');
  const [modalDividir, setModalDividir] = React.useState(null);
  const [comandasSelecionadasSplit, setComandasSelecionadasSplit] = React.useState([]);
  const [modalPagamentoParcial, setModalPagamentoParcial] = React.useState(null);
  const [itensPagamentoParcial, setItensPagamentoParcial] = React.useState({});

  React.useEffect(() => {
    if (caixaDialogo?.tipo === 'gerenciar_categoria') {
      const categoriaInicial = caixaDialogo.categoriaInicial || caixaDialogo.categorias?.[0] || '';
      setCategoriaGerenciarSelecionada(categoriaInicial);
      setNovoNomeCategoriaGerenciar(categoriaInicial);
    } else if (caixaDialogo?.tipo === 'prompt_categoria' || caixaDialogo?.tipo === 'selecionar_categoria') {
      setPromptVal(caixaDialogo.valorInicial || '');
      setPromptValDivisivel(false);
    } else if (!caixaDialogo) {
      setCategoriaGerenciarSelecionada('');
      setNovoNomeCategoriaGerenciar('');
      setPromptVal('');
      setPromptValDivisivel(false);
    }
  }, [caixaDialogo]);

  const dispararMensagem = (titulo, message) => {
    setCaixaDialogo({
      titulo,
      mensagem: message,
      confirmTxt: 'OK',
      noCancel: true,
      onConfirm: () => setCaixaDialogo(null),
    });
  };

  const dispararConfirmacao = (titulo, message, acaoConfirmar, acaoCancelar) => {
    setCaixaDialogo({
      titulo,
      mensagem: message,
      confirmTxt: 'Confirmar',
      cancelTxt: 'Cancelar',
      onConfirm: () => {
        acaoConfirmar();
        setCaixaDialogo(null);
      },
      onCancel: () => {
        if (acaoCancelar) acaoCancelar();
        setCaixaDialogo(null);
      },
    });
  };

  const [categoriasCustomizadas, setCategoriasCustomizadas] = React.useState(() => {
    try {
      const salvadas = localStorage.getItem('bhar_categorias_customizadas_v1');
      return salvadas ? JSON.parse(salvadas) : ['Cervejas', 'Drinks', 'Porções', 'Não Alcoólicos'];
    } catch (e) {
      return ['Cervejas', 'Drinks', 'Porções', 'Não Alcoólicos'];
    }
  });
  const [categoriasDivisiveis, setCategoriasDivisiveis] = React.useState(() => {
    try {
      const salvadas = localStorage.getItem('bhar_categorias_divisiveis_v1');
      return salvadas ? JSON.parse(salvadas) : ['Porções'];
    } catch (e) {
      return ['Porções'];
    }
  });

  const [novoClienteNomeInput, setNovoClienteNomeInput] = React.useState('');
  const [novoClienteSobrenomeInput, setNovoClienteSobrenomeInput] = React.useState('');
  const [novoClienteTelefoneInput, setNovoClienteTelefoneInput] = React.useState('');
  const [pesquisaClienteBase, setPesquisaClienteBase] = React.useState('');
  const [mostrarSugestoes, setMostrarSugestoes] = React.useState(false);

  React.useEffect(() => {
    function handleClickFora(e) {
      if (buscaContainerRef.current && !buscaContainerRef.current.contains(e.target)) {
        setMostrarSugestoes(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const [abaImagemAtiva, setAbaImagemAtiva] = React.useState('url');
  const [usuarioEditando, setUsuarioEditando] = React.useState(null);
  const [comandaRecemPaga, setComandaRecemPaga] = React.useState(null);
  const [logsAuditoria, setLogsAuditoria] = React.useState([]);

  const [valDinheiro, setValDinheiro] = React.useState('');
  const [valPix, setValPix] = React.useState('');
  const [valCartao, setValCartao] = React.useState('');
  const [valCrediario, setValCrediario] = React.useState('');

  const buscaContainerRef = React.useRef(null);
  const inputBuscaImgRef = React.useRef(null);
  const inputQtdAdicionarRef = React.useRef(null);

  const abrirWhatsAppDireto = React.useCallback((telefone, mensagemTexto) => {
    const foneLimpo = String(telefone || '').replace(/\D/g, '');
    if (!foneLimpo) return false;

    const numeroComCodigo = foneLimpo.startsWith('55') ? foneLimpo : `55${foneLimpo}`;
    const textoCodificado = encodeURIComponent(String(mensagemTexto || ''));
    const urlApp = `whatsapp://send?phone=${numeroComCodigo}&text=${textoCodificado}`;
    const urlWeb = `https://api.whatsapp.com/send?phone=${numeroComCodigo}&text=${textoCodificado}`;
    const userAgent = String(navigator?.userAgent || '').toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|mobile/.test(userAgent);

    if (isMobile) {
      const abriuEmApp = Date.now();
      window.location.href = urlApp;
      window.setTimeout(() => {
        if (Date.now() - abriuEmApp < 1800) {
          window.open(urlWeb, '_blank', 'noopener,noreferrer');
        }
      }, 1200);
      return true;
    }

    window.open(urlWeb, '_blank', 'noopener,noreferrer');
    return true;
  }, []);

  const [usuariosSistema, setUsuariosSistema] = React.useState(() => {
    try {
      const salvosUsers = localStorage.getItem('bhar_usuarios_v1');
      return salvosUsers ? JSON.parse(salvosUsers) : [
            { usuario: 'admin', senha: '0669', perfil: 'admin', restricoes: [] },
            { usuario: 'operador', senha: '1234', perfil: 'operador', restricoes: ['financeiro', 'crediario', 'seguranca'] },
            { usuario: 'garcom', senha: '1234', perfil: 'garcom', restricoes: [] },
          ];
    } catch (e) {
      return [
        { usuario: 'admin', senha: '0669', perfil: 'admin', restricoes: [] },
        { usuario: 'operador', senha: '1234', perfil: 'operador', restricoes: ['financeiro', 'crediario', 'seguranca'] },
        { usuario: 'garcom', senha: '1234', perfil: 'garcom', restricoes: [] },
      ];
    }
  });

  const [tipoProduto, setTipoProduto] = React.useState('padrao');
  const [fatorConversao, setFatorConversao] = React.useState('');
  const [precoCusto, setPrecoCusto] = React.useState('');
  const [porcentagemLucro, setPorcentagemLucro] = React.useState('');
  const [precoVenda, setPrecoVenda] = React.useState('');
  const [novoUserNome, setNovoUserNome] = React.useState('');
  const [novoUserSenha, setNovoUserSenha] = React.useState('');
  const [novoUserPerfil, setNovoUserPerfil] = React.useState('operador');
  const [novoProdNome, setNovoProdNome] = React.useState('');
  const [novoProdCategoria, setNovoProdCategoria] = React.useState('Cervejas');
  const [novoProdImagem, setNovoProdImagem] = React.useState('');
  const [novoProdEstoqueMin, setNovoProdEstoqueMin] = React.useState('5');
  const [novoProdEstoque, setNovoProdEstoque] = React.useState('');
  const [novoUserRestricoes, setNovoUserRestricoes] = React.useState([]);
  const [modalRevisaoNota, setModalRevisaoNota] = React.useState(false);
  
  React.useEffect(() => {
    try { localStorage.setItem('bhar_usuarios_v1', JSON.stringify(usuariosSistema)); } catch (e) {}
  }, [usuariosSistema]);

  const [clientesCadastrados, setClientesCadastrados] = React.useState(() => {
    try {
      const salvos = localStorage.getItem('bhar_clientes_v2');
      return salvos ? JSON.parse(salvos) : [];
    } catch (e) { return []; }
  });

  React.useEffect(() => {
    localStorage.setItem('bhar_clientes_v2', JSON.stringify(clientesCadastrados));
  }, [clientesCadastrados]);

  React.useEffect(() => {
    try { localStorage.setItem('bhar_categorias_customizadas_v1', JSON.stringify(categoriasCustomizadas)); } catch (e) {}
  }, [categoriasCustomizadas]);

  React.useEffect(() => {
    try { localStorage.setItem('bhar_categorias_divisiveis_v1', JSON.stringify(categoriasDivisiveis)); } catch (e) {}
  }, [categoriasDivisiveis]);

  const [produtos, setProdutos] = React.useState(() => {
    try {
      const explicitKeys = ['bhar_produtos_v3', 'bhar_produtos_v2', 'bhar_produtos_v1'];
      let loaded = [];

      for (const key of explicitKeys) {
        const salvosProd = localStorage.getItem(key);
        if (salvosProd) {
          const produtosCarregados = JSON.parse(salvosProd);
          if (Array.isArray(produtosCarregados)) {
            console.log(`[DEBUG] carregando produtos de localStorage key=${key} count=${produtosCarregados.length}`);
            return produtosCarregados;
          }
        }
      }

      const storedKeys = Object.keys(localStorage || {}).filter((k) => k.toLowerCase().includes('produtos'));
      for (const key of storedKeys) {
        const salvosProd = localStorage.getItem(key);
        if (salvosProd) {
          const produtosCarregados = JSON.parse(salvosProd);
          if (Array.isArray(produtosCarregados)) {
            console.log(`[DEBUG] carregando produtos de localStorage key=${key} count=${produtosCarregados.length}`);
            return produtosCarregados;
          }
        }
      }

      console.log('[DEBUG] nenhum produto encontrado em localStorage', storedKeys);
      return [];
    } catch (e) {
      console.error('[DEBUG] falha ao carregar produtos de localStorage', e);
      return [];
    }
  });

  React.useEffect(() => {
    localStorage.setItem('bhar_produtos_v3', JSON.stringify(produtos));
  }, [produtos]);

  const [produtosExcluidos, setProdutosExcluidos] = React.useState(() => {
    try {
      const salvos = localStorage.getItem('bhar_produtos_excluidos_v1');
      const parsed = salvos ? JSON.parse(salvos) : [];
      return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
    } catch (e) {
      return [];
    }
  });

  const [nomesProdutosExcluidos, setNomesProdutosExcluidos] = React.useState(() => {
    try {
      const salvos = localStorage.getItem('bhar_produtos_excluidos_nomes_v1');
      const parsed = salvos ? JSON.parse(salvos) : [];
      return Array.isArray(parsed) ? parsed.map((nome) => String(nome).trim().toLowerCase()) : [];
    } catch (e) {
      return [];
    }
  });

  const normalizarNomeProduto = React.useCallback((valor) => String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase(), []);

  const produtosExcluidosSet = React.useMemo(
    () => new Set((Array.isArray(produtosExcluidos) ? produtosExcluidos : []).map((id) => String(id))),
    [produtosExcluidos]
  );

  const nomesProdutosExcluidosSet = React.useMemo(
    () => new Set((Array.isArray(nomesProdutosExcluidos) ? nomesProdutosExcluidos : []).map((nome) => String(nome).trim().toLowerCase())),
    [nomesProdutosExcluidos]
  );

  const filtrarProdutosExcluidos = React.useCallback((lista) => {
    if (!Array.isArray(lista)) return [];
    return lista.filter((produto) => {
      const id = String(produto?.id ?? '');
      if (produtosExcluidosSet.has(id)) return false;
      const nomeNormalizado = normalizarNomeProduto(produto?.nome || '');
      return !nomesProdutosExcluidosSet.has(nomeNormalizado);
    });
  }, [produtosExcluidosSet, nomesProdutosExcluidosSet, normalizarNomeProduto]);

  React.useEffect(() => {
    try {
      localStorage.setItem('bhar_produtos_excluidos_v1', JSON.stringify(produtosExcluidos));
    } catch (e) {}
  }, [produtosExcluidos]);

  React.useEffect(() => {
    try {
      localStorage.setItem('bhar_produtos_excluidos_nomes_v1', JSON.stringify(nomesProdutosExcluidos));
    } catch (e) {}
  }, [nomesProdutosExcluidos]);

  const idProdutoParaBanco = React.useCallback((id) => {
    const n = Number(id);
    return Number.isFinite(n) ? Math.trunc(n) : id;
  }, []);

  React.useEffect(() => {
    if (!supabaseClient || produtosExcluidos.length === 0) return undefined;

    let cancelado = false;

    const tentarExcluirPendentes = async () => {
      if (cancelado) return;

      const ids = [...produtosExcluidos];
      if (ids.length === 0) return;

      const idsExcluidosComSucesso = [];

      for (const id of ids) {
        const { error } = await supabaseClient
          .from('produtos')
          .delete()
          .eq('id', idProdutoParaBanco(id));

        if (!error) idsExcluidosComSucesso.push(String(id));
      }

      if (idsExcluidosComSucesso.length > 0) {
        setProdutosExcluidos((prev) => prev.filter((id) => !idsExcluidosComSucesso.includes(String(id))));
      }
    };

    tentarExcluirPendentes();
    const intervalo = window.setInterval(tentarExcluirPendentes, 8000);

    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, [produtosExcluidos, idProdutoParaBanco]);

  React.useEffect(() => {
    window.produtosSistema = produtos; 

    window.confirmarEntradaNotaEstoque = (itensNota) => {
      let produtosAtualizados = [...produtos];
      let novosCriados = 0;

      itensNota.forEach((item) => {
        const indexExistente = produtosAtualizados.findIndex((p) => p.id === item.idVinculado);
        if (indexExistente >= 0) {
          produtosAtualizados[indexExistente] = {
            ...produtosAtualizados[indexExistente],
            estoque: produtosAtualizados[indexExistente].estoque + item.quantidade,
            precoCusto: item.custo,
          };
        } else {
          novosCriados++;
          produtosAtualizados.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            nome: item.nome,
            category: 'Geral', 
            precoCusto: item.custo,
            preco: item.custo * 2, 
            estoque: item.quantidade,
            estoqueMinimo: 5,
            imagem: '',
            apelidos: [],
            dataUltimaCompra: new Date().toISOString().split('T')[0],
          });
        }
      });
      setProdutos(produtosAtualizados);
      try {
        for (const p of produtosAtualizados) {
          supabaseClient?.from('produtos').upsert({
            id: p.id, nome: p.nome, category: p.category, preco: p.preco,
            preco_custo: p.precoCusto, estoque: p.estoque, estoque_minimo: p.estoqueMinimo,
            imagem: p.imagem || '', fator_conversao: p.fatorConversao || 1,
            apelidos: p.apelidos || [], data_ultima_compra: p.dataUltimaCompra || null
          });
        }
      } catch (err) { console.warn('Nuvem offline:', err); }
      dispararMensagem('Estoque Atualizado!', `Entrada processada com sucesso!\n\n• ${itensNota.length - novosCriados} item(ns) existente(s) tiveram o estoque somado.\n• ${novosCriados} novo(s) produto(s) foram Pré-Cadastrados.`);
      setMostrarLeitorCamera(false);
    };
  }, [produtos, idProdutoParaBanco]);

  const [comandas, setComandas] = React.useState(() => {
    try {
      const salvas = localStorage.getItem('bhar_comandas_v1');
      const dados = salvas ? JSON.parse(salvas) : [];
      return Array.isArray(dados) ? dados.map((comanda) => ({
        ...comanda,
        updated_at: comanda?.updated_at || new Date().toISOString(),
      })) : [];
    } catch (e) { return []; }
  });
  const [comandasExcluidas, setComandasExcluidas] = React.useState(() => {
    try {
      const salvas = localStorage.getItem('bhar_comandas_excluidas_v1');
      const dados = salvas ? JSON.parse(salvas) : [];
      return Array.isArray(dados) ? dados.map(String) : [];
    } catch (e) { return []; }
  });
  const [clientesSincronizados, setClientesSincronizados] = React.useState(false);
  const [comandasSincronizadas, setComandasSincronizadas] = React.useState(false);
  // Marca quando há alterações locais ainda não confirmadas na nuvem, para que a
  // sincronização periódica (abaixo) não sobrescreva itens recém-digitados antes
  // de eles serem salvos (isso acontecia, por exemplo, ao bloquear/desbloquear o
  // celular: o upsert ficava pendente e o polling apagava as comandas abertas).
  const upsertComandasPendenteRef = React.useRef(false);
  const normalizarComandaId = (id) => String(id ?? '');
  const mesmoComandaId = (a, b) => normalizarComandaId(a) === normalizarComandaId(b);
  const idComandaParaBanco = (id) => {
    const n = Number(id);
    return Number.isFinite(n) ? Math.trunc(n) : id;
  };
  const obterTimestampComanda = (valor) => {
    if (!valor) return 0;
    const ts = Date.parse(valor);
    return Number.isFinite(ts) ? ts : 0;
  };

  React.useEffect(() => {
    localStorage.setItem('bhar_comandas_v1', JSON.stringify(comandas));
  }, [comandas]);

  React.useEffect(() => {
    localStorage.setItem('bhar_comandas_excluidas_v1', JSON.stringify(comandasExcluidas));
  }, [comandasExcluidas]);

  const registrarComandaExcluida = React.useCallback((idComanda) => {
    const idNormalizado = normalizarComandaId(idComanda);
    if (!idNormalizado) return;

    setComandasExcluidas((prev) => (prev.includes(idNormalizado) ? prev : [...prev, idNormalizado]));
    setComandas((prev) => prev.filter((c) => !mesmoComandaId(c.id, idComanda)));
  }, [normalizarComandaId, mesmoComandaId]);

  const dadosBackupRef = React.useRef({
    clientes: [],
    comandas: [],
  });
  const ultimoBackupHashRef = React.useRef('');
  const ultimoBackupAtRef = React.useRef(0);
  const restauracaoBackupTentadaRef = React.useRef(false);

  React.useEffect(() => {
    const clientesNormalizados = [...(Array.isArray(clientesCadastrados) ? clientesCadastrados : [])]
      .map((cliente) => ({
        nome: String(cliente?.nome || '').trim(),
        sobrenome: String(cliente?.sobrenome || '').trim(),
        telefone: String(cliente?.telefone || '').trim(),
        foto: String(cliente?.foto || ''),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const comandasNormalizadas = [...(Array.isArray(comandas) ? comandas : [])]
      .map((comanda) => ({
        id: String(comanda?.id ?? ''),
        nome: String(comanda?.nome || '').trim(),
        status: String(comanda?.status || 'Aberto'),
        itens: Array.isArray(comanda?.itens) ? comanda.itens : [],
      }))
      .sort((a, b) => a.id.localeCompare(b.id, 'pt-BR'));

    const idsExcluidos = new Set((comandasExcluidas || []).map(normalizarComandaId));

    dadosBackupRef.current = {
      versao: 1,
      gerado_em: new Date().toISOString(),
      clientes: clientesNormalizados,
      comandas: comandasNormalizadas,
      comandas_excluidas: [...idsExcluidos],
    };
  }, [clientesCadastrados, comandas, comandasExcluidas, normalizarComandaId]);

  React.useEffect(() => {
    if (!supabaseClient) return undefined;

    let cancelado = false;
    let backupsDisponiveis = true;

    const enviarBackup = async (origem = 'periodico', forcar = false) => {
      if (cancelado || !backupsDisponiveis) return;

      const dados = dadosBackupRef.current || { clientes: [], comandas: [] };
      const hashAtual = JSON.stringify(dados);
      const agora = Date.now();

      if (!forcar) {
        if (hashAtual === ultimoBackupHashRef.current) return;
        if ((agora - ultimoBackupAtRef.current) < INTERVALO_MINIMO_ENTRE_BACKUPS_MS) return;
      }

      const { error } = await supabaseClient.from('backups_pdv').insert({
        tipo: 'clientes_comandas',
        origem,
        quantidade_clientes: Array.isArray(dados.clientes) ? dados.clientes.length : 0,
        quantidade_comandas: Array.isArray(dados.comandas) ? dados.comandas.length : 0,
        payload: dados,
      });

      if (error) {
        if (String(error?.message || '').toLowerCase().includes('backups_pdv')) {
          backupsDisponiveis = false;
          console.warn('Tabela backups_pdv não encontrada. Aplique a migration para ativar o backup automático.');
          return;
        }
        console.warn('Não foi possível registrar backup automático:', error);
        return;
      }

      ultimoBackupHashRef.current = hashAtual;
      ultimoBackupAtRef.current = agora;
    };

    enviarBackup('inicio_app', true);

    const intervalo = window.setInterval(() => {
      enviarBackup('periodico');
    }, INTERVALO_BACKUP_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        enviarBackup('app_background', true);
      }
      if (document.visibilityState === 'visible') {
        enviarBackup('app_retornou');
      }
    };

    const onPageHide = () => {
      enviarBackup('pagehide', true);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  React.useEffect(() => {
    if (!supabaseClient) return;
    if (!clientesSincronizados || !comandasSincronizadas) return;
    if (restauracaoBackupTentadaRef.current) return;

    const semClientes = !Array.isArray(clientesCadastrados) || clientesCadastrados.length === 0;
    const semComandas = !Array.isArray(comandas) || comandas.length === 0;
    if (!semClientes || !semComandas) return;

    restauracaoBackupTentadaRef.current = true;

    const restaurarBackupMaisRecente = async () => {
      const { data, error } = await supabaseClient
        .from('backups_pdv')
        .select('payload, created_at')
        .eq('tipo', 'clientes_comandas')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Não foi possível consultar backup automático:', error);
        return;
      }

      const payload = data?.payload;
      const clientesBackup = Array.isArray(payload?.clientes) ? payload.clientes : [];
      const idsExcluidosBackup = new Set(Array.isArray(payload?.comandas_excluidas) ? payload.comandas_excluidas.map(String) : []);
      const comandasBackup = Array.isArray(payload?.comandas) ? payload.comandas.filter((comanda) => !idsExcluidosBackup.has(normalizarComandaId(comanda.id))) : [];
      if (clientesBackup.length === 0 && comandasBackup.length === 0) return;

      if (clientesBackup.length > 0) {
        setClientesCadastrados(clientesBackup);
        try {
          localStorage.setItem('bhar_clientes_v2', JSON.stringify(clientesBackup));
        } catch (e) {}
      }

      if (idsExcluidosBackup.size > 0) {
        setComandasExcluidas((prev) => [...new Set([...prev, ...[...idsExcluidosBackup]])]);
      }

      if (comandasBackup.length > 0) {
        setComandas(comandasBackup.map((comanda) => ({
          id: normalizarComandaId(comanda.id),
          nome: String(comanda.nome || '').trim(),
          status: String(comanda.status || 'Aberto'),
          itens: Array.isArray(comanda.itens) ? comanda.itens : [],
        })));
      }

      console.log(`[RESTORE] backup restaurado de ${data?.created_at || 'data desconhecida'} com ${clientesBackup.length} cliente(s) e ${comandasBackup.length} comanda(s).`);
    };

    restaurarBackupMaisRecente();
  }, [supabaseClient, clientesSincronizados, comandasSincronizadas, clientesCadastrados, comandas]);

  React.useEffect(() => {
    let cancelado = false;

    async function carregarComandasDaNuvem() {
      if (!supabaseClient) {
        setComandasSincronizadas(true);
        return;
      }

      const { data, error } = await supabaseClient
        .from('comandas')
        .select('id, nome, status, itens, updated_at, deleted_at')
        .order('updated_at', { ascending: false });

      if (cancelado) return;

      if (error) {
        console.warn('Não foi possível carregar comandas da nuvem:', error);
        setComandasSincronizadas(true);
        return;
      }

      const idsEncerradosNuvem = new Set((data || [])
        .filter((comanda) => comanda.deleted_at)
        .map((comanda) => normalizarComandaId(comanda.id)));
      const idsExcluidos = new Set([
        ...(comandasExcluidas || []).map(normalizarComandaId),
        ...idsEncerradosNuvem,
      ]);
      const dadosNuvemFiltrados = Array.isArray(data) ? data.filter((comanda) => !comanda.deleted_at) : [];

      if (idsEncerradosNuvem.size > 0) {
        setComandasExcluidas((prev) => [...new Set([...prev, ...idsEncerradosNuvem])]);
      }

      const comandasNuvem = dadosNuvemFiltrados.map((comanda) => ({
          id: normalizarComandaId(comanda.id),
          nome: comanda.nome,
          status: comanda.status || 'Aberto',
          itens: Array.isArray(comanda.itens) ? comanda.itens : [],
          updated_at: comanda.updated_at || new Date().toISOString(),
        }));
      setComandas(comandasNuvem.filter((comanda) => !idsExcluidos.has(normalizarComandaId(comanda.id))));
      setComandasSincronizadas(true);
    }

    carregarComandasDaNuvem();
    return () => { cancelado = true; };
  }, [comandasExcluidas]);

  React.useEffect(() => {
    if (!comandasSincronizadas || !supabaseClient) return;

    const idsExcluidos = new Set((comandasExcluidas || []).map(normalizarComandaId));
    const comandasParaSalvar = comandas
      .filter((comanda) => !idsExcluidos.has(normalizarComandaId(comanda.id)))
      .map((comanda) => ({
        id: idComandaParaBanco(comanda.id),
        nome: comanda.nome,
        status: comanda.status || 'Aberto',
        itens: comanda.itens || [],
        updated_at: comanda.updated_at || new Date().toISOString(),
      }));

    if (comandasParaSalvar.length === 0) return;

    upsertComandasPendenteRef.current = true;
    supabaseClient
      .from('comandas')
      .upsert(comandasParaSalvar, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.warn('Não foi possível sincronizar comandas:', error);
      })
      .finally(() => {
        upsertComandasPendenteRef.current = false;
      });
  }, [comandas, comandasSincronizadas, comandasExcluidas]);

  React.useEffect(() => {
    if (!comandasSincronizadas || !supabaseClient) return undefined;

    const atualizarComandasDaNuvem = async () => {
      if (upsertComandasPendenteRef.current) return;

      const { data, error } = await supabaseClient
        .from('comandas')
        .select('id, nome, status, itens, updated_at')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error || !Array.isArray(data)) return;

      const idsExcluidos = new Set((comandasExcluidas || []).map(normalizarComandaId));
      const dadosNuvemFiltrados = data.filter((comanda) => !idsExcluidos.has(normalizarComandaId(comanda.id)));
      const comandasNuvem = dadosNuvemFiltrados.map((comanda) => ({
        id: normalizarComandaId(comanda.id),
        nome: comanda.nome,
        status: comanda.status || 'Aberto',
        itens: Array.isArray(comanda.itens) ? comanda.itens : [],
        updated_at: comanda.updated_at || new Date().toISOString(),
      }));

      setComandas((atuais) => {
        const locaisFiltrados = (atuais || []).filter((atual) => !idsExcluidos.has(normalizarComandaId(atual.id)));
        const resultado = [...comandasNuvem];

        for (const atual of locaisFiltrados) {
          const idAtual = normalizarComandaId(atual.id);
          const nuvem = dadosNuvemFiltrados.find((item) => normalizarComandaId(item.id) === idAtual);
          if (!nuvem) {
            resultado.push({ ...atual, updated_at: atual?.updated_at || new Date().toISOString() });
            continue;
          }

          const cloudTs = obterTimestampComanda(nuvem.updated_at);
          const localTs = obterTimestampComanda(atual.updated_at);
          if (localTs > cloudTs) {
            const indice = resultado.findIndex((item) => normalizarComandaId(item.id) === idAtual);
            if (indice >= 0) resultado[indice] = { ...atual, updated_at: atual?.updated_at || new Date().toISOString() };
            else resultado.push({ ...atual, updated_at: atual?.updated_at || new Date().toISOString() });
          }
        }

        return JSON.stringify(atuais) === JSON.stringify(resultado) ? atuais : resultado;
      });
    };

    const intervalo = window.setInterval(atualizarComandasDaNuvem, 4000);
    return () => window.clearInterval(intervalo);
  }, [comandasSincronizadas, comandasExcluidas]);

  async function removerComandaDaNuvem(id) {
    if (!supabaseClient) return;
    registrarComandaExcluida(id);
    const { error } = await supabaseClient
      .from('comandas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', idComandaParaBanco(id));
    if (error) console.warn('Não foi possível encerrar a comanda na nuvem:', error);
  }

  React.useEffect(() => {
    function atualizarComandasDeOutraAba(evento) {
      if (evento.key !== 'bhar_comandas_v1' || !evento.newValue) return;

      try {
        const comandasAtualizadas = JSON.parse(evento.newValue);
        if (Array.isArray(comandasAtualizadas)) setComandas(comandasAtualizadas);
      } catch (erro) {
        console.warn('Não foi possível atualizar as comandas de outra aba:', erro);
      }
    }

    window.addEventListener('storage', atualizarComandasDeOutraAba);
    return () => window.removeEventListener('storage', atualizarComandasDeOutraAba);
  }, []);

  const [comandaAtivaId, setComandaAtivaId] = React.useState(null);
  const [busca, setBusca] = React.useState('');

  const [vendas, setVendas] = React.useState(() => {
    try {
      const salvas = localStorage.getItem('bhar_vendas_v1');
      return salvas ? JSON.parse(salvas) : [];
    } catch (e) { return []; }
  });

  React.useEffect(() => {
    localStorage.setItem('bhar_vendas_v1', JSON.stringify(vendas));
  }, [vendas]);

  const [relatorioProdutos, setRelatorioProdutos] = React.useState([]);

  const [despesas, setDespesas] = React.useState(() => {
    try {
      const salvas = localStorage.getItem('bhar_despesas_v1');
      return salvas ? JSON.parse(salvas) : [];
    } catch (e) { return []; }
  });
  React.useEffect(() => {
    localStorage.setItem('bhar_despesas_v1', JSON.stringify(despesas));
  }, [despesas]);

  const [crediarios, setCrediarios] = React.useState(() => {
    try {
      const salvos = localStorage.getItem('bhar_crediarios_v1');
      const dados = salvos ? JSON.parse(salvos) : [];
      return Array.isArray(dados) ? dados.map((item) => ({
        ...item,
        updated_at: item?.updated_at || new Date().toISOString(),
      })) : [];
    } catch (e) { return []; }
  });

  React.useEffect(() => {
    localStorage.setItem('bhar_crediarios_v1', JSON.stringify(crediarios));
  }, [crediarios]);

  const [novaDespesaDesc, setNovaDespesaDesc] = React.useState('');
  const [novaDespesaValor, setNovaDespesaValor] = React.useState('');
  const [novaDespesaVenc, setNovaDespesaVenc] = React.useState(new Date().toISOString().split('T')[0]);
  const [idProdutoSelecionadoEdicao, setIdProdutoSelecionadoEdicao] = React.useState(null);

  React.useEffect(() => {
    async function carregarDadosDaNuvem() {
      try {
        const { data: clis } = (await supabaseClient?.from('clientes').select('*')) || {};
        if (clis && clis.length > 0) setClientesCadastrados(clis);

        const { data: prods } = (await supabaseClient?.from('produtos').select('*')) || {};
        if (prods && prods.length > 0) {
          const produtosNuvem = prods.map((p) => ({
            id: p.id, category: p.category, nome: p.nome,
            precoCusto: p.preco_custo, preco: p.preco, estoque: p.estoque,
            estoqueMinimo: p.estoque_minimo, dataUltimaCompra: p.data_ultima_compra, imagem: p.imagem,
            fatorConversao: p.fator_conversao || 1,
            apelidos: p.apelidos || [],
          })).filter((p) => !produtosExcluidosSet.has(String(p.id)));

          setProdutos((prev) => {
            const produtosLocais = Array.isArray(prev) ? prev : [];
            const mapaMerge = new Map();

            for (const p of produtosNuvem) mapaMerge.set(String(p.id), p);
            for (const p of produtosLocais) {
              if (produtosExcluidosSet.has(String(p.id))) continue;
              const produtoNuvem = mapaMerge.get(String(p.id));
              if (!produtoNuvem) {
                mapaMerge.set(String(p.id), p);
                continue;
              }

              const imagemNuvem = String(produtoNuvem.imagem || '');
              const imagemLocal = String(p.imagem || '');
              const imagemNuvemHospedada = imagemNuvem.includes('/storage/v1/object/public/');
              const imagemLocalHospedada = imagemLocal.includes('/storage/v1/object/public/');

              mapaMerge.set(String(p.id), imagemNuvemHospedada && !imagemLocalHospedada
                ? { ...p, imagem: produtoNuvem.imagem }
                : p);
            }

            const produtosMesclados = Array.from(mapaMerge.values());

            if (produtosMesclados.length > produtosNuvem.length) {
              console.log(`[SYNC] preservando ${produtosMesclados.length - produtosNuvem.length} produto(s) local(is) ainda não presente(s) na nuvem`);
              return produtosMesclados;
            }

            return produtosNuvem;
          });
        }

        const { data: vnds } = (await supabaseClient?.from('vendas').select('*')) || {};
        if (vnds && vnds.length > 0) {
          setVendas(vnds.map((v) => ({
              idVenda: v.id, data: v.data, cliente: v.cliente,
              total: v.total, pagamento: v.pagamento, itensConsumidos: v.itens_consumidos || [],
            }))
          );
        }

        const { data: logs } = (await supabaseClient?.from('auditoria_cancelamentos').select('*').order('data', { ascending: false })) || {};
        if (logs) setLogsAuditoria(logs);

        const { data: creds } = (await supabaseClient?.from('crediarios').select('*')) || {};
        if (Array.isArray(creds)) {
          const crediariosNuvem = creds.map((c) => ({
            idCred: c.id_cred, data: c.data, cliente: c.cliente,
            total: Number(c.total || 0), status: c.status || 'Pendente',
            itensConsumidos: c.itens_consumidos || [], pagamentos: c.pagamentos || [],
            updated_at: c.updated_at || c.data || new Date().toISOString(),
          }));
          setCrediarios(crediariosNuvem);
        }
      } catch (err) {
        console.error('Erro ao carregar dados da nuvem, rodando local offline:', err);
      } finally {
        setClientesSincronizados(true);
      }
    }
    carregarDadosDaNuvem();
  }, [produtosExcluidosSet]);

  React.useEffect(() => {
    if (!supabaseClient) return undefined;

    let cancelado = false;
    const atualizarCrediariosDaNuvem = async () => {
      const { data, error } = await supabaseClient.from('crediarios').select('*');
      if (cancelado || error || !Array.isArray(data)) return;

      setCrediarios(data.map((c) => ({
        idCred: c.id_cred,
        data: c.data,
        cliente: c.cliente,
        total: Number(c.total || 0),
        status: c.status || 'Pendente',
        itensConsumidos: c.itens_consumidos || [],
        pagamentos: c.pagamentos || [],
        updated_at: c.updated_at || c.data || new Date().toISOString(),
      })));
    };

    const intervalo = window.setInterval(atualizarCrediariosDaNuvem, 5000);
    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, []);

  React.useEffect(() => {
    if (!supabaseClient) return undefined;

    let cancelado = false;

    const atualizarProdutosDaNuvem = async () => {
      const { data, error } = await supabaseClient
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true });

      if (cancelado || error || !Array.isArray(data) || data.length === 0) return;

      const produtosNuvem = filtrarProdutosExcluidos(data.map((produto) => ({
        id: produto.id,
        category: String(produto.category || 'Geral').trim() || 'Geral',
        nome: produto.nome,
        precoCusto: produto.preco_custo,
        preco: produto.preco,
        estoque: produto.estoque,
        estoqueMinimo: produto.estoque_minimo,
        dataUltimaCompra: produto.data_ultima_compra,
        imagem: produto.imagem,
        fatorConversao: produto.fator_conversao || 1,
        apelidos: produto.apelidos || [],
      })));

      setProdutos((atuais) => {
        const locaisValidos = filtrarProdutosExcluidos(atuais || []);
        const mapa = new Map(produtosNuvem.map((produto) => [String(produto.id), produto]));
        for (const produto of locaisValidos) {
          if (!mapa.has(String(produto.id))) mapa.set(String(produto.id), produto);
        }
        return Array.from(mapa.values());
      });
    };

    atualizarProdutosDaNuvem();
    const intervalo = window.setInterval(atualizarProdutosDaNuvem, 5000);
    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, [produtosExcluidosSet]);

  // Re-sincroniza clientes periodicamente: o carregamento inicial roda uma única vez,
  // então uma falha de rede logo na abertura do app (ex.: celular acabou de desbloquear)
  // fazia a lista de clientes nunca mais ser recarregada naquela sessão.
  React.useEffect(() => {
    if (!supabaseClient) return undefined;

    let cancelado = false;

    const atualizarClientesDaNuvem = async () => {
      const { data, error } = await supabaseClient.from('clientes').select('*');
      if (cancelado || error || !Array.isArray(data) || data.length === 0) return;

      setClientesCadastrados((atuais) => {
        const mapa = new Map();
        for (const cliente of data) {
          const nome = String(cliente?.nome || '').trim();
          if (!nome) continue;
          mapa.set(nome.toLowerCase(), {
            nome,
            sobrenome: cliente.sobrenome || '',
            telefone: cliente.telefone || '',
            foto: cliente.foto || '',
          });
        }
        for (const cliente of Array.isArray(atuais) ? atuais : []) {
          const chave = String(cliente?.nome || '').trim().toLowerCase();
          if (chave && !mapa.has(chave)) mapa.set(chave, cliente);
        }
        return Array.from(mapa.values());
      });
    };

    atualizarClientesDaNuvem();
    const intervalo = window.setInterval(atualizarClientesDaNuvem, 6000);
    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, []);

  const comandaAtual = comandas.find((c) => mesmoComandaId(c.id, comandaAtivaId)) || null;

  async function sincronizarDadosNuvem() {
    setCaixaDialogo({
      titulo: 'Sincronizando com a Nuvem ☁️',
      mensagem: 'Por favor, aguarde. Analisando e enviando dados pendentes...',
      confirmTxt: 'Aguarde...',
      noCancel: true,
      onConfirm: () => {}
    });
    try {
      const { data: fiadosNuvem, error: erroFiadosNuvem } = await supabaseClient
        ?.from('crediarios')
        .select('*') || {};
      if (erroFiadosNuvem) throw erroFiadosNuvem;

      const mapaFiados = new Map();
      for (const fiado of Array.isArray(fiadosNuvem) ? fiadosNuvem : []) {
        mapaFiados.set(String(fiado.id_cred), {
          idCred: fiado.id_cred,
          data: fiado.data,
          cliente: fiado.cliente,
          total: Number(fiado.total || 0),
          status: fiado.status || 'Pendente',
          itensConsumidos: fiado.itens_consumidos || [],
          pagamentos: fiado.pagamentos || [],
          updated_at: fiado.updated_at || fiado.data || new Date().toISOString(),
        });
      }
      for (const fiado of Array.isArray(crediarios) ? crediarios : []) {
        const chave = String(fiado.idCred);
        if (!mapaFiados.has(chave)) mapaFiados.set(chave, fiado);
      }
      const crediariosParaSincronizar = Array.from(mapaFiados.values());
      setCrediarios(crediariosParaSincronizar);

      // fallback: se o estado `produtos` estiver vazio, tente carregar do localStorage
      let produtosParaSincronizar = produtos;
      if ((!produtos || produtos.length === 0) && typeof localStorage !== 'undefined') {
        try {
          const saved = localStorage.getItem('bhar_produtos_v3') || localStorage.getItem('bhar_produtos_v2') || localStorage.getItem('bhar_produtos_v1');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              produtosParaSincronizar = parsed;
              console.log(`[SYNC] carregando ${parsed.length} produtos do localStorage para sincronizar`);
            }
          }
        } catch (e) {
          console.warn('Erro lendo localStorage para sincronizar:', e);
        }
      }

      produtosParaSincronizar = (Array.isArray(produtosParaSincronizar) ? produtosParaSincronizar : [])
        .filter((p) => !produtosExcluidosSet.has(String(p?.id)));

      let produtosSincronizados = false;

      // send products to serverless endpoint which uses service_role key
      try {
        const resp = await fetch('/api/sync-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: produtosParaSincronizar || [] })
        });

        let json = null;
        try {
          json = await resp.json();
          console.log('[SYNC] server response', resp.status, json);
        } catch (e) {
          console.log('[SYNC] server non-json response', resp.status, await resp.text());
        }

        if (resp.ok) {
          produtosSincronizados = true;
        } else {
          console.warn('[SYNC] endpoint /api/sync-products falhou, tentando fallback via cliente Supabase', json);
        }
      } catch (err) {
        console.error('[SYNC] erro ao chamar /api/sync-products', err);
      }

      if (!produtosSincronizados) {
        if (!supabaseClient) {
          throw new Error('Cliente Supabase indisponível para fallback de produtos.');
        }

        const produtosNormalizados = (produtosParaSincronizar || []).map((p) => ({
          id: p.id,
          nome: p.nome,
          category: p.category || 'Geral',
          preco: Number(p.preco || 0),
          preco_custo: Number(p.precoCusto || 0),
          estoque: Number(p.estoque || 0),
          estoque_minimo: Number(p.estoqueMinimo || 0),
          imagem: p.imagem || '',
          fator_conversao: Number(p.fatorConversao || 1),
          apelidos: Array.isArray(p.apelidos) ? p.apelidos : [],
          data_ultima_compra: p.dataUltimaCompra || null,
        }));

        const { error: erroUpsertProdutos } = await supabaseClient
          .from('produtos')
          .upsert(produtosNormalizados, { onConflict: 'id' });

        if (erroUpsertProdutos) {
          throw erroUpsertProdutos;
        }

        produtosSincronizados = true;
        console.log(`[SYNC] fallback cliente Supabase concluiu ${produtosNormalizados.length} produto(s).`);
      }

      for (const c of crediariosParaSincronizar) {
        await supabaseClient?.from('crediarios').upsert({
          id_cred: c.idCred, data: c.data, cliente: c.cliente,
          total: c.total, status: c.status, itens_consumidos: c.itensConsumidos, pagamentos: c.pagamentos || [],
          updated_at: c.updated_at || new Date().toISOString()
        });
      }

      const { data: vendasNuvem } = (await supabaseClient?.from('vendas').select('data, cliente, total')) || {};
      const vendasParaInserir = vendas.filter(vLocal => {
        const jaExiste = vendasNuvem?.some(vCloud => vCloud.data === vLocal.data && vCloud.cliente === vLocal.cliente && vCloud.total === vLocal.total);
        return !jaExiste; 
      });

      if (vendasParaInserir.length > 0) {
        const vendasFormatadas = vendasParaInserir.map(v => ({
          data: v.data, cliente: v.cliente, total: v.total, pagamento: v.pagamento, itens_consumidos: v.itensConsumidos
        }));
        await supabaseClient?.from('vendas').insert(vendasFormatadas);
      }

      const { data: clientesNuvem } = (await supabaseClient?.from('clientes').select('nome')) || {};
      const clientesParaInserir = clientesCadastrados.filter(cLocal => {
        return !clientesNuvem?.some(cCloud => cCloud.nome.toLowerCase() === cLocal.nome.toLowerCase());
      });

      if (clientesParaInserir.length > 0) {
        await supabaseClient?.from('clientes').insert(clientesParaInserir.map(c => ({
           nome: c.nome, sobrenome: c.sobrenome, telefone: c.telefone, foto: c.foto
        })));
      }

      dispararMensagem('✅ Sincronização Concluída', `Tudo certo! Dados seguros na nuvem.\n\n📊 Resumo:\n- ${(produtosParaSincronizar || []).length} Produtos${produtosSincronizados ? ' (OK)' : ''}\n- ${crediariosParaSincronizar.length} Fiados\n- ${vendasParaInserir.length} Vendas resgatadas\n- ${clientesParaInserir.length} Clientes novos`);
    } catch (err) {
      console.error('Erro na sincronização:', err);
      dispararMensagem('❌ Erro de Conexão', 'Não foi possível sincronizar. Verifique a internet e tente novamente.');
    }
  }

  function validarENormalizarNome(nomeBruto, ignorarDuplicadoBanco = false) {
    if (!nomeBruto) return { valido: false, erro: 'O nome não pode ficar em branco.' };
    const nomeFormatado = nomeBruto.trim().replace(/\s+/g, ' ').toUpperCase();
    const partes = nomeFormatado.split(' ');

    if (partes.length < 2 || partes[1].length < 2) {
      return { valido: false, erro: 'É obrigatório inserir Nome e Sobrenome (Ex: João Silva).' };
    }

    const jaTemComandaAberta = comandas.some(c => c.nome.trim().toLowerCase() === nomeFormatado.toLowerCase());
    if (jaTemComandaAberta) {
      return { valido: false, erro: `O cliente "${nomeFormatado}" já possui uma comanda ativa aberta!` };
    }

    if (!ignorarDuplicadoBanco) {
      const jaExisteNoBanco = clientesCadastrados.some(cli => cli.nome.toLowerCase() === nomeFormatado.toLowerCase());
      if (jaExisteNoBanco) return { valido: true, nome: nomeFormatado, cadastrado: true };
    }

    return { valido: true, nome: nomeFormatado, cadastrado: false };
  }

  async function registrarNovoClienteNaBase(nomePronto) {
    if (nomePronto && !clientesCadastrados.some(c => c.nome.toLowerCase() === nomePronto.toLowerCase())) {
      const partes = nomePronto.split(' ');
      const sobrenome = partes.slice(1).join(' ');
      const novoCli = { nome: nomePronto, sobrenome: sobrenome, telefone: '', foto: '' };

      setClientesCadastrados(prev => [...prev, novoCli]);
      await supabaseClient?.from('clientes').insert([novoCli]);
    }
  }

  function navegarPara(novaTela) {
    if (autenticado) {
      if (usuarioLogado && usuarioLogado.perfil === 'garcom') {
        setTelaAtual('garcom');
        return;
      }
      if (usuarioLogado && usuarioLogado.perfil !== 'admin' && usuarioLogado.restricoes && usuarioLogado.restricoes.includes(novaTela)) {
        dispararMensagem('Acesso Restrito', `🚫 Seu usuário não possui permissão para acessar a tela [${novaTela.toUpperCase()}].`);
        return;
      }
      setTelaAtual(novaTela);
    } else {
      setSenhaDigitada('');
      setErroAutenticacao(false);
      setProximaTelaPendente(novaTela);
      setTelaAtual('login_gerencial');
    }
  }

  function validarAcessoGerencial(e) {
    e.preventDefault();
    const usuarioEncontrado = usuariosSistema.find(u => u.usuario === usuarioDigitado && u.senha === senhaDigitada);

    if (usuarioEncontrado) {
      if (usuarioEncontrado.perfil === 'garcom') {
        setAutenticado(true);
        setUsuarioLogado(usuarioEncontrado);
        setErroAutenticacao(false);
        setTelaAtual('garcom');
        return;
      }
      if (usuarioEncontrado.perfil !== 'admin' && usuarioEncontrado.restricoes && usuarioEncontrado.restricoes.includes(proximaTelaPendente)) {
        dispararMensagem('Permissão Denegada', `🚫 Seu usuário não possui permissão para acessar a tela [${proximaTelaPendente.toUpperCase()}].`);
        setSenhaDigitada('');
        return;
      }
      setAutenticado(true);
      setUsuarioLogado(usuarioEncontrado);
      setErroAutenticacao(false);
      setTelaAtual(proximaTelaPendente || 'pdv');
      sincronizarDadosNuvem();
    } else {
      setErroAutenticacao(true);
      setSenhaDigitada('');
    }
  }

  async function logoutSistema() {
    if (usuarioLogado && usuarioLogado.perfil !== 'garcom') {
      await sincronizarDadosNuvem();
    }
    setAutenticado(false);
    setUsuarioLogado(null);
    setSenhaDigitada('');
    setTelaAtual('login_gerencial');
    setProximaTelaPendente('pdv');
  }

  function cadastrarNovoOperador(e) {
    e.preventDefault();
    if (!novoUserNome.trim() || !novoUserSenha.trim()) {
      dispararMensagem('Campos Vazios', 'Preencha o usuário e a senha para efetuar o cadastro!');
      return;
    }
    if (usuariosSistema.some(u => u.usuario.toLowerCase() === novoUserNome.trim().toLowerCase())) {
      dispararMensagem('Usuário Duplicado', 'Este usuário já existe no sistema!');
      return;
    }
    const novoU = { usuario: novoUserNome.trim(), senha: novoUserSenha.trim(), perfil: novoUserPerfil, restricoes: novoUserRestricoes };
    setUsuariosSistema(prev => [...prev, novoU]);
    dispararMensagem('Cadastro Sucesso', `Usuário "${novoU.usuario}" cadastrado com sucesso!`);
    setNovoUserNome(''); setNovoUserSenha(''); setNovoUserRestricoes([]);
  }

  function excluirUsuario(user) {
    if (user.usuario === 'admin' || user.perfil === 'admin') {
      dispararMensagem('Erro de Acesso', 'Não é permitido excluir o usuário Administrador principal.');
      return;
    }
    dispararConfirmacao('Excluir Usuário', `Deseja realmente excluir permanentemente o operador "${user.usuario}"?`, () => {
        setUsuariosSistema(prev => prev.filter((u) => u.usuario !== user.usuario));
        dispararMensagem('Sucesso', 'Usuário removido do sistema.');
    });
  }

  function salvarEdicaoUsuario() {
    setUsuariosSistema(prev => prev.map((u) => u.usuario === usuarioEditando.usuario ? usuarioEditando : u));
    dispararMensagem('Usuário Updated', `As restrições e o perfil de "${usuarioEditando.usuario}" foram updated com sucesso.`);
    setUsuarioEditando(null);
  }

  function toggleRestricaoEdicao(tela) {
    setUsuarioEditando((prev) => {
      const r = prev.restricoes || [];
      return { ...prev, restricoes: r.includes(tela) ? r.filter((t) => t !== tela) : [...r, tela] };
    });
  }

  function gerenciarCheckboxRestricao(tela) {
    if (novoUserRestricoes.includes(tela)) setNovoUserRestricoes(novoUserRestricoes.filter((t) => t !== tela));
    else setNovoUserRestricoes([...novoUserRestricoes, tela]);
  }

  function excluirProdutoDoEstoque(id, nome) {
    dispararConfirmacao('Excluir Produto', `Deseja realmente EXCLUIR permanentemente o produto "${nome}"?`, async () => {
        const idProdutoNormalizado = String(id ?? '');
        const nomeNormalizado = normalizarNomeProduto(nome);
        const proximoExcluidos = [...new Set([...produtosExcluidos, idProdutoNormalizado])];
        const proximoNomesExcluidos = [...new Set([...nomesProdutosExcluidos, nomeNormalizado])];

        setProdutosExcluidos(proximoExcluidos);
        setNomesProdutosExcluidos(proximoNomesExcluidos);
        setProdutos((prev) => prev.filter((p) => String(p.id) !== idProdutoNormalizado && normalizarNomeProduto(p.nome) !== nomeNormalizado));

        try {
          const { error } = await supabaseClient?.from('produtos').delete().eq('id', idProdutoParaBanco(id));
          if (!error) {
            setProdutosExcluidos((prev) => prev.filter((item) => String(item) !== idProdutoNormalizado));
            setNomesProdutosExcluidos((prev) => prev.filter((item) => item !== nomeNormalizado));
          }
        } catch (err) { console.warn('Nuvem offline:', err); }

        dispararMensagem('Estoque', `Produto "${nome}" foi removido do estoque.`);
        const restantes = produtos.filter((p) => String(p.id) !== idProdutoNormalizado && normalizarNomeProduto(p.nome) !== nomeNormalizado);
        if (restantes.length > 0) setIdProdutoSelecionadoEdicao(restantes[0].id);
    });
  }

  async function addItemNaComanda(produto) {
    if (!comandaAtual) {
      dispararMensagem('Aviso', 'Selecione uma comanda primeiro!');
      return;
    }
    if (produto.estoque <= 0) {
      dispararMensagem('Falta de Estoque', `O produto "${produto.nome}" está esgotado!`);
      return;
    }

    const novoEstoque = produto.estoque - 1;
    setProdutos((prev) => prev.map((p) => p.id === produto.id ? { ...p, estoque: novoEstoque } : p));
    try { await supabaseClient?.from('produtos').update({ estoque: novoEstoque }).eq('id', produto.id); } catch (err) { console.warn('Nuvem offline:', err); }
    setComandas((prev) =>
      prev.map((c) => {
        if (!mesmoComandaId(c.id, comandaAtivaId)) return c;
        const itensAlterados = [...c.itens];
        
        // 🛠️ FIX CEO: Ignora itens "Rachados/Divididos" na hora de somar. Garante que se dividir a cerveja, pedir outra vem como item novo
        const idx = itensAlterados.findIndex((i) => i.idProd === produto.id && !i.splitGroupId);
        if (idx >= 0) itensAlterados[idx].qtd += 1;
        else itensAlterados.push({ idProd: produto.id, nome: produto.nome, precoCusto: produto.precoCusto, preco: produto.preco, qtd: 1 });
        
        return { ...c, itens: itensAlterados };
      })
    );

    if (produto.category === 'Porções' || categoriasDivisiveis.includes(produto.category)) {
      dispararMensagem('⚠️ IMPRESSÃO COZINHA ⚠️', `Mesa/Comanda: ${comandaAtual.nome}\nItem: 1x ${produto.nome}\nEnviado direto para o atendente levar até a cozinha!`);
  
      const htmlCozinha = `
        <div style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 10px;">⚠️ PEDIDO COZINHA ⚠️</div>
        <div style="border-bottom: 2px dashed black; margin: 8px 0;"></div>
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">MESA / COMANDA: ${comandaAtual.nome}</div>
        <div style="border-bottom: 2px dashed black; margin: 8px 0;"></div>
        <div style="font-size: 18px; font-weight: bold; margin-top: 10px; margin-bottom: 10px;">-> 1x ${produto.nome}</div>
        <div style="border-bottom: 2px dashed black; margin: 8px 0;"></div>
        <div style="text-align: center; font-size: 12px; margin-top: 5px;">Impresso para produção</div>
      `;
      gerarImpressaoTermica(htmlCozinha);
    }
  }
  
  function removerItemNaComanda(idProd) {
    const itemNoConsumo = comandaAtual?.itens.find((i) => i.idProd === idProd);
    if (!itemNoConsumo) return;
    
    setCaixaDialogo({
      titulo: 'Remover Item do Consumo',
      mensagem: `Selecione o motivo para remover "${itemNoConsumo.nome}":`,
      tipo: 'motivos_botoes',
      botoes: ['Erro Operador', 'Pedido Errado', 'Desistência'],
      cancelTxt: 'Cancelar',
      onSelect: async (motivo) => {
        const qtdDevolver = itemNoConsumo.qtd;

        try {
          await supabaseClient?.from('auditoria_cancelamentos').insert([{
              operador: usuarioLogado ? usuarioLogado.usuario : 'Admin', tipo: 'Remoção de Item',
              motivo: motivo, data: new Date().toISOString(),
              detalhes: { id_comanda: comandaAtual.id, nome_cliente: comandaAtual.nome, produto: itemNoConsumo.nome, quantidade: qtdDevolver },
            }]);
        } catch (err) { console.error(err); }

        setLogsAuditoria((prev) => [{
              id: Date.now(), data: new Date().toISOString(), tipo: 'Remoção de Item', operador: usuarioLogado ? usuarioLogado.usuario : 'Admin',
              motivo: motivo, detalhes: { id_comanda: comandaAtual.id, nome_cliente: comandaAtual.nome, produto: itemNoConsumo.nome, quantidade: qtdDevolver },
            }, ...prev,
        ]);

        setProdutos((prev) => {
          const prodAtual = prev.find((p) => p.id === idProd);
          const novoEst = (prodAtual?.estoque || 0) + qtdDevolver;
          try { supabaseClient?.from('produtos').update({ estoque: novoEst }).eq('id', idProd); } catch (err) { console.warn('Nuvem offline:', err); }
          return prev.map((p) => p.id === idProd ? { ...p, estoque: novoEst } : p);
        });
        setComandas((prev) => prev.map((c) => {
          if (!mesmoComandaId(c.id, comandaAtivaId)) return c;
            return { ...c, itens: c.itens.filter((i) => i.idProd !== idProd) };
        }));
      },
    });
  }

  async function diminuirQtdItemNaComanda(item) {
    if (!comandaAtual || !item) return;
    const qtdAtual = Number(item.qtd || 0);
    if (item.splitGroupId) return;
    if (qtdAtual <= 1) {
      removerItemNaComanda(item.idProd);
      return;
    }

    setProdutos((prev) => {
      const prodAtual = prev.find((p) => p.id === item.idProd);
      if (!prodAtual) return prev;
      const novoEst = (prodAtual.estoque || 0) + 1;
      try { supabaseClient?.from('produtos').update({ estoque: novoEst }).eq('id', item.idProd); } catch (err) { console.warn('Nuvem offline:', err); }
      return prev.map((p) => p.id === item.idProd ? { ...p, estoque: novoEst } : p);
    });

    setComandas((prev) => prev.map((c) => {
      if (!mesmoComandaId(c.id, comandaAtivaId)) return c;
      return {
        ...c,
        itens: c.itens.map((i) => (i.idProd === item.idProd && !i.splitGroupId) ? { ...i, qtd: i.qtd - 1 } : i),
      };
    }));

    const detalhes = { id_comanda: comandaAtual.id, nome_cliente: comandaAtual.nome, produto: item.nome, quantidade: 1 };

    setLogsAuditoria((prev) => [{
      id: Date.now(), data: new Date().toISOString(), tipo: 'Ajuste de Quantidade',
      operador: usuarioLogado ? usuarioLogado.usuario : 'Admin', motivo: 'Baixa de 1 unidade', detalhes,
    }, ...prev]);

    try {
      await supabaseClient?.from('auditoria_cancelamentos').insert([{
        operador: usuarioLogado ? usuarioLogado.usuario : 'Admin', tipo: 'Ajuste de Quantidade',
        motivo: 'Baixa de 1 unidade', data: new Date().toISOString(), detalhes,
      }]);
    } catch (err) { console.warn('Nuvem offline:', err); }
  }

  function iniciarPagamentoParcial() {
    if (!comandaAtual || comandaAtual.itens.length === 0) return;
    setItensPagamentoParcial({});
    setModalPagamentoParcial({ comandaId: comandaAtual.id });
  }

  function ajustarQtdPagamentoParcial(index, delta) {
    const item = comandaAtual?.itens?.[index];
    if (!item) return;
    const max = Number(item.qtd || 0);
    // itens divididos não podem ser fracionados de novo: paga tudo ou nada
    const passo = Number.isInteger(max) ? 1 : max;
    setItensPagamentoParcial((prev) => {
      const novo = Math.min(max, Math.max(0, Number(prev[index] || 0) + delta * passo));
      return { ...prev, [index]: parseFloat(novo.toFixed(4)) };
    });
  }

  function obterItensPagamentoParcial() {
    if (!comandaAtual) return [];
    return comandaAtual.itens
      .map((item, idx) => ({ ...item, qtd: Number(itensPagamentoParcial[idx] || 0) }))
      .filter((item) => item.qtd > 0);
  }

  async function confirmarPagamentoParcial(tipo) {
    const selecionados = obterItensPagamentoParcial();
    if (!comandaAtual || selecionados.length === 0) return;

    const comandaAlvo = comandaAtual;
    const totalParcial = calcularTotal(selecionados);
    const itensFormatados = selecionados.map((i) => ({ nome: i.nome, qtd: i.qtd, preco: i.preco }));
    const rotuloPagamento = `${tipo.toUpperCase()} (PARCIAL)`;

    const restantes = comandaAlvo.itens
      .map((item, idx) => ({ ...item, qtd: parseFloat((Number(item.qtd || 0) - Number(itensPagamentoParcial[idx] || 0)).toFixed(4)) }))
      .filter((item) => item.qtd > 0.0001);

    setModalPagamentoParcial(null);
    setItensPagamentoParcial({});

    registrarProdutosVendidos(selecionados);

    if (tipo === 'fiado') {
      const idCredGerado = Date.now();
      const tsAgora = new Date().toISOString();
      setCrediarios((prev) => [...prev, {
        idCred: idCredGerado, data: new Date().toLocaleString('pt-BR'), cliente: comandaAlvo.nome,
        total: totalParcial, status: 'Pendente', itensConsumidos: itensFormatados,
        updated_at: tsAgora,
      }]);
      try {
        await supabaseClient?.from('crediarios').insert([{
          id_cred: idCredGerado, data: new Date().toLocaleString('pt-BR'), cliente: comandaAlvo.nome,
          total: totalParcial, status: 'Pendente', itens_consumidos: itensFormatados,
          updated_at: tsAgora,
        }]);
      } catch (err) { console.warn('Fiado parcial salvo apenas localmente:', err); }
    }

    setVendas((prev) => [...prev, {
      idVenda: Date.now(), data: new Date().toLocaleString('pt-BR'), cliente: comandaAlvo.nome,
      total: totalParcial, pagamento: rotuloPagamento, itensConsumidos: itensFormatados,
    }]);

    try {
      await supabaseClient?.from('vendas').insert([{
        data: new Date().toLocaleString('pt-BR'), cliente: comandaAlvo.nome, total: totalParcial,
        pagamento: rotuloPagamento, itens_consumidos: itensFormatados,
      }]);
    } catch (err) { console.warn('Venda parcial registrada apenas localmente:', err); }

    imprimirReciboParcial(comandaAlvo, selecionados, totalParcial, rotuloPagamento, calcularTotal(restantes));

    if (restantes.length === 0) {
      setComandaRecemPaga({ ...comandaAlvo, itens: selecionados });
      registrarComandaExcluida(comandaAlvo.id);
      removerComandaDaNuvem(comandaAlvo.id);
      setComandaAtivaId(null);
      setModoPagamento(false);
      setMostrarMultiFormas(false);
      dispararMensagem('Sucesso', `Último pagamento parcial recebido (${formatarMoeda(totalParcial)}). A comanda foi encerrada e a mesa liberada.`);
      return;
    }

    setComandas((prev) => prev.map((c) => mesmoComandaId(c.id, comandaAlvo.id) ? { ...c, itens: restantes } : c));
    dispararMensagem('Pagamento Parcial', `Recebido ${formatarMoeda(totalParcial)} via ${tipo.toUpperCase()}.\nRestam ${formatarMoeda(calcularTotal(restantes))} na comanda de ${comandaAlvo.nome}.`);
  }

  function imprimirReciboParcial(comanda, itensPagos, totalPago, rotuloPagamento, saldoRestante) {
    let htmlCupom = `
      <div class="center">
        <div class="title">${nomeSoftware}</div>
        <div>DOCUMENTO NÃO FISCAL</div>
        <div>PAGAMENTO PARCIAL</div>
        <div class="linha"></div>
      </div>
      <div><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</div>
      <div><strong>Cliente:</strong> ${comanda.nome} (Mesa #${comanda.id})</div>
      <div class="linha"></div>
      <div><strong>ITENS PAGOS:</strong></div><div style="margin-top: 5px;">
    `;
    itensPagos.forEach((i) => {
      htmlCupom += `<div class="flex item"><span>${i.qtd}x ${i.nome}</span><span>${formatarMoeda(i.preco * i.qtd)}</span></div>`;
    });
    htmlCupom += `
      </div><div class="linha"></div>
      <div class="flex bold" style="font-size: 15px;"><span>TOTAL PAGO:</span><span>${formatarMoeda(totalPago)}</span></div>
      <div class="flex"><span>Forma:</span><span>${rotuloPagamento}</span></div>
      <div class="flex bold"><span>SALDO NA COMANDA:</span><span>${formatarMoeda(saldoRestante)}</span></div>
      <div class="linha"></div><div class="center" style="margin-top: 15px;">-</div>
    `;
    gerarImpressaoTermica(htmlCupom);
  }

  function imprimirRelatorioDiarioFiados() {
    const listaCrediarios = Array.isArray(crediarios) ? crediarios : [];
    const hoje = new Date();
    const hojeISO = hoje.toISOString().slice(0, 10);
    const hojeBR = hoje.toLocaleDateString('pt-BR');

    const extrairDataISO = (valorData) => {
      const texto = String(valorData || '').trim();
      if (!texto) return '';

      if (texto.includes(',')) {
        const parteData = texto.split(',')[0].trim();
        const [dd, mm, yyyy] = parteData.split('/');
        if (dd && mm && yyyy) return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }

      if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
        const [dd, mm, yyyy] = texto.split('/');
        return `${yyyy}-${mm}-${dd}`;
      }

      if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
        return texto.slice(0, 10);
      }

      return '';
    };

    const statusPendente = (item) => {
      const status = String(item?.status || '').trim().toLowerCase();
      if (status === 'pago' || status === 'quitado') return false;
      return Number(item?.total || 0) > 0;
    };

    const fiadosDoDia = listaCrediarios.filter((item) => {
      const dataItem = extrairDataISO(item?.data);
      return dataItem === hojeISO && statusPendente(item);
    });

    if (fiadosDoDia.length === 0) {
      dispararMensagem('Relatório Diário de Fiados', `Nenhum fiado pendente lançado em ${hojeBR}.`);
      return;
    }

    const mapaPorCliente = new Map();
    fiadosDoDia.forEach((item) => {
      const cliente = String(item?.cliente || 'Sem nome').trim() || 'Sem nome';
      const atual = mapaPorCliente.get(cliente) || { cliente, total: 0, qtd: 0 };
      atual.total += Number(item?.total || 0);
      atual.qtd += 1;
      mapaPorCliente.set(cliente, atual);
    });

    const resumo = Array.from(mapaPorCliente.values())
      .sort((a, b) => b.total - a.total);

    const totalGeral = resumo.reduce((acc, item) => acc + item.total, 0);
    const totalRegistros = resumo.reduce((acc, item) => acc + item.qtd, 0);

    let htmlCupom = `
      <div class="center">
        <div class="title">${nomeSoftware}</div>
        <div>RELATORIO DIARIO - FIADOS</div>
        <div>${hojeBR}</div>
        <div class="linha"></div>
      </div>
      <div><strong>CLIENTES DEVENDO HOJE:</strong> ${resumo.length}</div>
      <div><strong>LANCAMENTOS:</strong> ${totalRegistros}</div>
      <div><strong>TOTAL DO DIA:</strong> ${formatarMoeda(totalGeral)}</div>
      <div class="linha"></div>
    `;

    resumo.forEach((item) => {
      htmlCupom += `
        <div class="flex item">
          <span>${item.cliente}</span>
          <span>${formatarMoeda(item.total)}</span>
        </div>
      `;
    });

    htmlCupom += `
      <div class="linha"></div>
      <div class="center" style="font-size: 11px;">
        Ticket resumido para conferencia diaria
      </div>
      <div class="center" style="margin-top: 12px;">-</div>
    `;

    gerarImpressaoTermica(htmlCupom);
    dispararMensagem('Relatório Impresso', `Ticket diário de fiados (${hojeBR}) enviado para a impressora térmica.`);
  }

  function imprimirRelatorioPendenciaGeralFiados() {
    const listaCrediarios = Array.isArray(crediarios) ? crediarios : [];
    const hojeBR = new Date().toLocaleDateString('pt-BR');

    const statusPendente = (item) => {
      const status = String(item?.status || '').trim().toLowerCase();
      if (status === 'pago' || status === 'quitado') return false;
      return Number(item?.total || 0) > 0;
    };

    const pendentes = listaCrediarios.filter((item) => statusPendente(item));
    if (pendentes.length === 0) {
      dispararMensagem('Pendência Geral de Fiados', 'Não há dívidas em aberto no crediário.');
      return;
    }

    const mapaPorCliente = new Map();
    pendentes.forEach((item) => {
      const cliente = String(item?.cliente || 'Sem nome').trim() || 'Sem nome';
      const atual = mapaPorCliente.get(cliente) || { cliente, total: 0, qtd: 0 };
      atual.total += Number(item?.total || 0);
      atual.qtd += 1;
      mapaPorCliente.set(cliente, atual);
    });

    const resumo = Array.from(mapaPorCliente.values()).sort((a, b) => b.total - a.total);
    const totalGeral = resumo.reduce((acc, item) => acc + item.total, 0);

    let htmlCupom = `
      <div class="center">
        <div class="title">${nomeSoftware}</div>
        <div>PENDENCIA GERAL - FIADOS</div>
        <div>${hojeBR}</div>
        <div class="linha"></div>
      </div>
      <div><strong>CLIENTES DEVENDO:</strong> ${resumo.length}</div>
      <div><strong>LANCAMENTOS ABERTOS:</strong> ${pendentes.length}</div>
      <div><strong>TOTAL EM ABERTO:</strong> ${formatarMoeda(totalGeral)}</div>
      <div class="linha"></div>
    `;

    resumo.forEach((item) => {
      htmlCupom += `
        <div class="flex item">
          <span>${item.cliente}</span>
          <span>${formatarMoeda(item.total)}</span>
        </div>
      `;
    });

    htmlCupom += `
      <div class="linha"></div>
      <div class="center" style="font-size: 11px;">
        Ticket resumido de pendencias abertas
      </div>
      <div class="center" style="margin-top: 12px;">-</div>
    `;

    gerarImpressaoTermica(htmlCupom);
    dispararMensagem('Relatório Impresso', 'Ticket de pendência geral enviado para a impressora térmica.');
  }

  function imprimirExtratoDebitosCliente(cliente, lancamentos) {
    const debitos = Array.isArray(lancamentos) ? lancamentos : [];
    const total = debitos.reduce((soma, item) => soma + Number(item?.total || 0), 0);
    if (!cliente || debitos.length === 0 || total <= 0) {
      dispararMensagem('Extrato de Débitos', 'Não há débitos pendentes para imprimir.');
      return;
    }

    let htmlCupom = `
      <div class="center">
        <div class="title">${nomeSoftware}</div>
        <div>EXTRATO DE DEBITOS</div>
        <div class="linha"></div>
      </div>
      <div><strong>Cliente:</strong> ${cliente}</div>
      <div><strong>Emitido:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
      <div class="linha"></div>
    `;

    debitos.forEach((item) => {
      const data = String(item?.data || '').split(',')[0].trim() || '-';
      htmlCupom += `<div class="flex item"><span>${data}</span><span>${formatarMoeda(item?.total)}</span></div>`;
    });

    htmlCupom += `
      <div class="linha"></div>
      <div class="flex bold" style="font-size: 15px;"><span>TOTAL DEVIDO:</span><span>${formatarMoeda(total)}</span></div>
      <div class="linha"></div>
      <div class="center" style="margin-top: 12px;">-</div>
    `;
    gerarImpressaoTermica(htmlCupom);
  }

  function tratarRemoverSplit(item, comandaDono) {    setCaixaDialogo({
      titulo: 'Estorno de Item Dividido',
      mensagem: `O item "${item.nome}" foi compartilhado entre comandas.\n\nEscolha como deseja prosseguir com a exclusão:`,
      confirmTxt: 'Excluir de todas as comandas',
      cancelTxt: 'Desfazer divisão (Tornar inteiro aqui)',
      onConfirm: () => removerSplitDeTodas(item.splitGroupId, item.idProd),
      onCancel: () => reverterSplitParaInteiro(item.splitGroupId, item.idProd, comandaDono.id),
    });
  }

  function removerSplitDeTodas(splitGroupId, idProd) {
    setComandas((prev) =>
      prev.map((c) => ({
        ...c,
        itens: c.itens.filter((it) => !(it.idProd === idProd && it.splitGroupId === splitGroupId)),
      }))
    );
    dispararMensagem('Item Removido', 'O item dividido foi removido com sucesso de todas as comandas envolvidas.');
  }

  function reverterSplitParaInteiro(splitGroupId, idProd, comandaDonoId) {
    setComandas((prev) => {
    let totalQtd = 0;
    prev.forEach((c) => {
      const found = c.itens.find((it) => it.splitGroupId === splitGroupId && it.idProd === idProd);
      if (found) totalQtd += found.qtd;
    });

    return prev.map((c) => {
        if (mesmoComandaId(c.id, comandaDonoId)) {
          return {
            ...c,
            itens: c.itens.map((it) => {
              if (it.idProd === idProd && it.splitGroupId === splitGroupId) {
                const prodOriginal = produtos.find((p) => p.id === idProd);
                return {
                  idProd: idProd, nome: prodOriginal ? prodOriginal.nome : it.nome.split(' (Dividido')[0],
                  precoCusto: it.precoCusto, preco: it.preco, qtd: parseFloat(totalQtd.toFixed(4)),
                };
              }
              return it;
            }),
          };
        } else {
          return {
            ...c, itens: c.itens.filter((it) => !(it.idProd === idProd && it.splitGroupId === splitGroupId)),
          };
        }
      });
    });
    dispararMensagem('Divisão Desfeita', 'O item voltou a ser inteiro nesta comanda e foi removido das demais.');
  }

  async function cancelarComanda(comanda) {
    setCaixaDialogo({
      titulo: 'Motivo do Cancelamento',
      mensagem: `Selecione o motivo para cancelar a comanda de ${comanda.nome}:`,
      tipo: 'motivos_botoes',
      botoes: ['Erro Operador', 'Sem Consumo', 'Nome Errado'],
      cancelTxt: 'Voltar',
      onSelect: async (motivo) => {
        setLogsAuditoria((prev) => [{
            id: Date.now(), data: new Date().toISOString(), tipo: 'Cancelamento de Comanda',
            operador: usuarioLogado ? usuarioLogado.usuario : 'Admin', motivo: motivo,
            detalhes: { id_comanda: comanda.id, nome_cliente: comanda.nome },
          }, ...prev,
        ]);

        registrarComandaExcluida(comanda.id);
        removerComandaDaNuvem(comanda.id);

        if (mesmoComandaId(comandaAtivaId, comanda.id)) {
          setComandaAtivaId(null);
          setModoPagamento(false);
        }

        try {
          await supabaseClient?.from('auditoria_cancelamentos').insert([{
              operador: usuarioLogado ? usuarioLogado.usuario : 'Admin', tipo: 'Cancelamento de Comanda',
              motivo: motivo, data: new Date().toISOString(), detalhes: { id_comanda: comanda.id, nome_cliente: comanda.nome },
            }]);
        } catch (err) { console.warn('Nuvem offline:', err); }

        // 🛠️ FIX CEO: Removido o disparo duplo de mensagem e o reset duplicado de estados aqui embaixo!
        dispararMensagem('Sucesso', `Comanda #${comanda.id} cancelada e registrada na auditoria.`);
      },
    });
  }

  function abrirComandaPorNomePronto(nomeBruto) {
    const validacao = validarENormalizarNome(nomeBruto, true);
    if (!validacao.valido) {
      dispararMensagem('Validação', validacao.erro);
      return;
    }
    const novoId = String(Date.now() + Math.floor(Math.random() * 1000));
    registrarNovoClienteNaBase(validacao.nome);
    setComandas(prev => [...prev, { id: novoId, nome: validacao.nome, status: 'Aberto', itens: [] }]);
    setComandaAtivaId(novoId);
    setBusca('');
    setMostrarSugestoes(false);
  }

  function registrarProdutosVendidos(itens) {
    setRelatorioProdutos((prev) => {
      const copia = [...prev];
      itens.forEach((item) => {
        const existente = copia.find((p) => p.idProd === item.idProd);
        if (existente) {
          existente.qtd += item.qtd;
          existente.total += item.preco * item.qtd;
          existente.custo += item.precoCusto * item.qtd;
        } else {
          copia.push({
            idProd: item.idProd, nome: item.nome, qtd: item.qtd,
            total: item.preco * item.qtd, custo: item.precoCusto * item.qtd,
          });
        }
      });
      return copia;
    });
  }

  function imagemAutomaticaProduto(nome, category) {
    const termo = encodeURIComponent(nome);
    return `https://loremflickr.com/400/300/${termo}`;
  }

  function iniciarDivisaoItem(item) {
    setComandasSelecionadasSplit([]);
    setModalDividir({ item });
  }

  function realizarDivisao(item, comandasSelecionadas) {
    const splitGroupId = 'split_' + Date.now();
    const todasEnvolvidas = [comandaAtivaId, ...comandasSelecionadas].map(normalizarComandaId);
    const totalPessoas = todasEnvolvidas.length;
    const novaQtd = parseFloat((item.qtd / totalPessoas).toFixed(4));
    const nomesTexto = comandas.filter((c) => todasEnvolvidas.includes(normalizarComandaId(c.id))).map((c) => c.nome).join(', ');

    setComandas((prev) =>
      prev.map((c) => {
        if (!todasEnvolvidas.includes(normalizarComandaId(c.id))) return c;
        const splitItem = {
          idProd: item.idProd, nome: `${item.nome.split(' (Dividido')[0]} (Dividido entre: ${nomesTexto})`,
          precoCusto: item.precoCusto, preco: item.preco, qtd: novaQtd, splitGroupId: splitGroupId,
        };

        const itensCopia = [...c.itens];
        if (mesmoComandaId(c.id, comandaAtivaId)) {
          const idx = itensCopia.findIndex((it) => it.idProd === item.idProd && !it.splitGroupId);
          if (idx >= 0) itensCopia[idx] = splitItem;
        } else {
          itensCopia.push(splitItem);
        }
        return { ...c, itens: itensCopia };
      })
    );

    setModalDividir(null);
    dispararMensagem('Divisão Concluída', `O item "${item.nome.split(' (Dividido')[0]}" foi rateado com sucesso em ${totalPessoas} partes!`);
  }

  function confirmarPagamentoComposto() {
    if (!comandaAtual || comandaAtual.itens.length === 0) return;
    const totalCobranca = calcularTotal(comandaAtual.itens);

    const d = parseMoedaBR(valDinheiro);
    const p = parseMoedaBR(valPix);
    const c = parseMoedaBR(valCartao);
    const cr = parseMoedaBR(valCrediario);

    const somaPaga = d + p + c + cr;

    if (Math.abs(somaPaga - totalCobranca) > 0.01) {
      dispararMensagem('Erro de Valor', `A soma das formas de pagamento (${formatarMoeda(somaPaga)}) precisa ser exatamente igual ao total da conta (${formatarMoeda(totalCobranca)}).`);
      return;
    }

    setMostrarMultiFormas(false);
    dispararConfirmacao('Confirmar Recebimento', `Deseja finalizar a comanda de ${comandaAtual.nome} com os valores informados?`, async () => {
        registrarProdutosVendidos(comandaAtual.itens);

        const formasTexto = [];
        if (d > 0) formasTexto.push(`Dinheiro: ${formatarMoeda(d)}`);
        if (p > 0) formasTexto.push(`Pix: ${formatarMoeda(p)}`);
        if (c > 0) formasTexto.push(`Cartão: ${formatarMoeda(c)}`);

        let msgWppStatus = '';
        if (cr > 0) {
          const idCredGerado = Date.now();
          const itensParaSalvar = comandaAtual.itens.map((i) => ({ nome: i.nome, qtd: i.qtd, preco: i.preco }));
          formasTexto.push(`Crediário: ${formatarMoeda(cr)}`);

          setCrediarios(prev => [...prev, {
              idCred: idCredGerado, data: new Date().toLocaleString('pt-BR'), cliente: comandaAtual.nome,
              total: cr, status: 'Pendente', itensConsumidos: itensParaSalvar,
              updated_at: new Date().toISOString(),
          }]);

          supabaseClient?.from('crediarios').insert([{
                id_cred: idCredGerado, data: new Date().toLocaleString('pt-BR'), cliente: comandaAtual.nome,
                total: cr, status: 'Pendente', itens_consumidos: itensParaSalvar,
                updated_at: new Date().toISOString(),
          }]).then(() => console.log('Fiado composto salvo na nuvem!'));

          const dadosDoCliente = clientesCadastrados.find((cli) => cli.nome.toLowerCase() === comandaAtual.nome.toLowerCase());
          if (dadosDoCliente && dadosDoCliente.telefone && dadosDoCliente.telefone.trim() !== '') {
            const mensagemTexto = `Olá, *${comandaAtual.nome}*! 🍻\nPassando para avisar que uma parte do seu consumo no *${nomeSoftware}* foi lançada no seu Fiado:\n\n` +
              `📙 *Valor no Fiado:* ${formatarMoeda(cr)}\n💰 *Total Geral da Conta:* ${formatarMoeda(totalCobranca)}\n\n_Obrigado e até o próximo rock!_ 🎸`;
            abrirWhatsAppDireto(dadosDoCliente.telefone, mensagemTexto);
            msgWppStatus = '\n\n📲 O WhatsApp foi aberto para enviar o recibo do fiado!';
          }
        }

        const itensFormatados = comandaAtual.itens.map((i) => ({ nome: i.nome, qtd: i.qtd, preco: i.preco }));

        setVendas(prev => [...prev, {
            idVenda: Date.now(), data: new Date().toLocaleString('pt-BR'), cliente: comandaAtual.nome,
            total: totalCobranca, pagamento: formasTexto.join(' | '), itensConsumidos: itensFormatados,
        }]);

        try {
          await supabaseClient?.from('vendas').insert([{
              data: new Date().toLocaleString('pt-BR'), cliente: comandaAtual.nome, total: totalCobranca,
              pagamento: formasTexto.join(' | '), itens_consumidos: itensFormatados,
          }]);
        } catch (error) { console.error(error); }

        setComandaRecemPaga({ ...comandaAtual });
        registrarComandaExcluida(comandaAtivaId);
        removerComandaDaNuvem(comandaAtivaId);
        setComandaAtivaId(null);
        setModoPagamento(false);
        setMostrarMultiFormas(false);
        setValDinheiro(''); setValPix(''); setValCartao(''); setValCrediario('');
        dispararMensagem('Sucesso', `Pagamento processado com sucesso! A mesa foi liberada.${msgWppStatus}`);
      }
    );
  }

  function finalizarPagamentoDireto(tipo) {
    if (!comandaAtual || comandaAtual.itens.length === 0) return;
    const totalCobranca = calcularTotal(comandaAtual.itens);

    dispararConfirmacao('Confirmar Pagamento', `Deseja fechar a conta de ${comandaAtual.nome} no valor total de ${formatarMoeda(totalCobranca)} via [${tipo.toUpperCase()}]?`, async () => {
        registrarProdutosVendidos(comandaAtual.itens);

        let msgWppStatus = '';
        if (tipo === 'fiado') {
          const idCredGerado = Date.now();
          const itensParaSalvar = comandaAtual.itens.map((i) => ({ nome: i.nome, qtd: i.qtd, preco: i.preco }));

          setCrediarios(prev => [...prev, {
              idCred: idCredGerado, data: new Date().toLocaleString('pt-BR'), cliente: comandaAtual.nome,
              total: totalCobranca, status: 'Pendente', itensConsumidos: itensParaSalvar,
              updated_at: new Date().toISOString(),
          }]);

          supabaseClient?.from('crediarios').insert([{
            id_cred: idCredGerado, data: new Date().toLocaleString('pt-BR'), cliente: comandaAtual.nome,
            total: totalCobranca, status: 'Pendente', itens_consumidos: itensParaSalvar,
            updated_at: new Date().toISOString(),
          }]).then(() => console.log('Fiado direto salvo na nuvem com sucesso!')).catch(err => console.error(err));

          const dadosDoCliente = clientesCadastrados.find((c) => c.nome.toLowerCase() === comandaAtual.nome.toLowerCase());
          if (dadosDoCliente && dadosDoCliente.telefone && dadosDoCliente.telefone.trim() !== '') {
            const mensagemTexto = `Olá, *${comandaAtual.nome}*! 🍻\nPassando para avisar que o seu consumo no *${nomeSoftware}* foi fechado e enviado para o seu Fiado:\n\n` +
              `📙 *Valor Adicionado:* ${formatarMoeda(totalCobranca)}\n\n_Qualquer dúvida estamos à disposição! Valeu!_ 🎸`;
            abrirWhatsAppDireto(dadosDoCliente.telefone, mensagemTexto);
            msgWppStatus = '\n\n📲 O WhatsApp foi aberto para notificar o cliente!';
          }
        }

        const itensFormatados = comandaAtual.itens.map((i) => ({ nome: i.nome, qtd: i.qtd, preco: i.preco }));

        setVendas(prev => [...prev, {
            idVenda: Date.now(), data: new Date().toLocaleString('pt-BR'), cliente: comandaAtual.nome,
            total: totalCobranca, pagamento: tipo.toUpperCase(), itensConsumidos: itensFormatados,
        }]);

        try {
          await supabaseClient?.from('vendas').insert([{
              data: new Date().toLocaleString('pt-BR'), cliente: comandaAtual.nome, total: totalCobranca,
              pagamento: tipo.toUpperCase(), itens_consumidos: itensFormatados,
          }]);
        } catch (err) { console.warn('Venda registrada apenas localmente:', err); }

        // 🛠️ FIX CEO: Removido o código super duplicado que estava aqui limpando as mesas 2 vezes seguidas
        setComandaRecemPaga({ ...comandaAtual });
        registrarComandaExcluida(comandaAtivaId);
        removerComandaDaNuvem(comandaAtivaId);
        setComandaAtivaId(null);
        setModoPagamento(false);
        setMostrarMultiFormas(false);
        setValDinheiro(''); setValPix(''); setValCartao(''); setValCrediario('');
        dispararMensagem('Sucesso', `Conta finalizada com sucesso via ${tipo.toUpperCase()}!${msgWppStatus}`);
      }
    );
  }

  async function atualizarPropriedadeProduto(id, propriedade, valor) {
    const valorFormatado = propriedade === 'nome' || propriedade === 'imagem' || propriedade === 'dataUltimaCompra' ? valor : parseFloat(valor) || 0;
    setProdutos((prev) => prev.map((p) => p.id === id ? { ...p, [propriedade]: valorFormatado } : p));

    let dbProp = propriedade;
    if (propriedade === 'precoCusto') dbProp = 'preco_custo';
    if (propriedade === 'estoqueMinimo') dbProp = 'estoque_minimo';
    if (propriedade === 'dataUltimaCompra') dbProp = 'data_ultima_compra';

    try {
      await supabaseClient?.from('produtos').update({ [dbProp]: valorFormatado }).eq('id', id);
    } catch (error) { console.error('Erro ao sincronizar na nuvem:', error); }
  }

  function handleChangeMoeda(id, prop, val) {
    let numero = val.replace(/\D/g, '');
    if (numero === '') numero = '0';
    let floatVal = parseFloat(numero) / 100;
    atualizarPropriedadeProduto(id, prop, floatVal);
  }

  function imprimirComandaConferencia() {
    if (!comandaAtual || comandaAtual.itens.length === 0) return;
    const fraseAleatoria = FRASES_ROCK[Math.floor(Math.random() * FRASES_ROCK.length)];
    const total = calcularTotal(comandaAtual.itens);
    const dataHora = new Date().toLocaleString('pt-BR');

    let htmlCupom = `
      <div class="center">
        <div class="title">${nomeSoftware}</div>
        <div>DOCUMENTO NÃO FISCAL</div>
        <div>CONFERÊNCIA DE MESA</div>
        <div class="linha"></div>
      </div>
      <div><strong>Data:</strong> ${dataHora}</div>
      <div><strong>Cliente:</strong> ${comandaAtual.nome} (Mesa #${comandaAtual.id})</div>
      <div class="linha"></div>
      <div><strong>ITENS CONSUMIDOS:</strong></div><div style="margin-top: 5px;">
    `;

    comandaAtual.itens.forEach(i => {
      htmlCupom += `<div class="flex item"><span>${i.qtd}x ${i.nome}</span><span>${formatarMoeda(i.preco * i.qtd)}</span></div>`;
    });

    htmlCupom += `
      </div><div class="linha"></div>
      <div class="flex bold" style="font-size: 15px;"><span>TOTAL DA CONTA:</span><span>${formatarMoeda(total)}</span></div>
      <div class="linha"></div><div class="center" style="font-size: 10px; font-style: italic; margin-top: 10px;">${fraseAleatoria}</div><div class="center" style="margin-top: 15px;">-</div>
    `;
    gerarImpressaoTermica(htmlCupom);
  }

  function emitirNotaFiscalSilenciosa(comanda) {
    const totalNota = calcularTotal(comanda.itens);
    const dadosPayloadFiscal = {
      nome_modulo: nomeSoftware, data_emissao: new Date().toISOString(), cliente_nome: comanda.nome, valor_total: totalNota,
      itens: comanda.itens.map((item) => ({ codigo_produto: item.idProd, descricao: item.nome, quantidade: item.qtd, valor_unitario: item.preco, valor_total_item: item.preco * item.qtd, ncm: '22030000', cfop: '5102', icms_situacao_tributaria: '102'})),
    };

    dispararMensagem('TRANSMISSÃO FISCAL SEFAZ', `Iniciando comunicação com o integrador fiscal...\n\nEmpresa/Software: ${nomeSoftware}\nCliente: ${dadosPayloadFiscal.cliente_nome}\nTotal a Transmitir: ${formatarMoeda(totalNota)}\nQtd de Itens: ${dadosPayloadFiscal.itens.length}\n\n⏳ Conectando ao WebService SEFAZ...`);

    setTimeout(() => {
      const chaveAcessoSimulada = Array.from({ length: 44 }, () => Math.floor(Math.random() * 10)).join('');
      dispararMensagem('🔥 NOTA FISCAL AUTORIZADA 🔥', `${nomeSoftware} - EMISSÃO EXPRESSA\nStatus: 100 - Autorizado o uso da NF-e/NFC-e\nAmbiente: Homologação (Sem valor fiscal)\n----------------------------------------\nChave de Acesso:\n${chaveAcessoSimulada.replace(/(.{4})/g, '$1 ')}\n----------------------------------------\nProtocolo: ${Math.floor(Math.random() * 900000000) + 100000000}\n\n🖨️ DANFE enviado para a bobina térmica!`);
      setComandaRecemPaga(null);
    }, 2500);
  }

  async function adicionarLancamentoCrediario(cliente, valor, descricao) {
    const nomeCliente = String(cliente || '').trim();
    const valorLancado = Number(valor) || 0;
    if (!nomeCliente || valorLancado <= 0) {
      dispararMensagem('Dados inválidos', 'Informe o nome do cliente e um valor maior que zero.');
      return;
    }

    const textoDescricao = String(descricao || '').trim() || 'Saldo devedor em dinheiro';
    const idCredGerado = Date.now();
    const itens = [{ nome: textoDescricao, qtd: 1, preco: valorLancado }];
    const dataFormatada = new Date().toLocaleString('pt-BR');

    const tsAgora = new Date().toISOString();
    setCrediarios((prev) => [...prev, {
      idCred: idCredGerado, data: dataFormatada, cliente: nomeCliente,
      total: valorLancado, status: 'Pendente', itensConsumidos: itens,
      updated_at: tsAgora,
    }]);

    registrarNovoClienteNaBase(nomeCliente);

    try {
      await supabaseClient?.from('crediarios').insert([{
        id_cred: idCredGerado, data: dataFormatada, cliente: nomeCliente,
        total: valorLancado, status: 'Pendente', itens_consumidos: itens,
        updated_at: tsAgora,
      }]);
    } catch (err) { console.warn('Lançamento salvo apenas localmente:', err); }

    dispararMensagem('Lançamento Adicionado', `${formatarMoeda(valorLancado)} (${textoDescricao}) foi adicionado à conta de ${nomeCliente}.`);
  }

  function liquidarVáriasComandasCrediario(comandasArray, cliente, metodo) {
    let totalDivida = comandasArray.reduce((acc, c) => acc + c.total, 0);

    if (metodo === 'Parcial') {
      setPromptVal('');
      setCaixaDialogo({
        titulo: `Abatimento Parcial - ${cliente}`,
        mensagem: `Dívida total: ${formatarMoeda(totalDivida)}\nDigite o valor que o cliente está pagando (Ex: 50,00):`,
        tipo: 'prompt_moeda',
        confirmTxt: 'Abater',
        cancelTxt: 'Cancelar',
        onConfirm: async (valorDigitado) => {
          if (!valorDigitado) return;
          let limpo = valorDigitado.toString().replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
          const valor = parseFloat(limpo);

          if (!valor || valor <= 0) { dispararMensagem('Erro', 'Valor inválido informado!'); return; }
          if (valor > totalDivida) { dispararMensagem('Erro', `O valor informado é maior que a dívida total (${formatarMoeda(totalDivida)})!`); return; }

          let sobraPagamento = valor;
          const alteradosParaBanco = [];

          const novasComandas = [...crediarios].map((c) => {
            const pertenceAoGrupo = comandasArray.some((x) => x.idCred === c.idCred);
            if (!pertenceAoGrupo || sobraPagamento <= 0) return c;
            let atualizado = { ...c };

            if (sobraPagamento >= c.total) {
              sobraPagamento -= c.total;
              atualizado = { ...c, total: 0, status: 'Pago', pagamentos: [...(c.pagamentos || []), { valor: c.total, metodo: 'Parcial', data: new Date().toLocaleString('pt-BR')}], updated_at: new Date().toISOString() };
            } else {
              const novoTotal = c.total - sobraPagamento;
              const pagoNesta = sobraPagamento;
              sobraPagamento = 0;
              atualizado = { ...c, total: novoTotal, status: 'Pendente', pagamentos: [...(c.pagamentos || []), { valor: pagoNesta, metodo: 'Parcial', data: new Date().toLocaleString('pt-BR')}], updated_at: new Date().toISOString() };
            }
            alteradosParaBanco.push(atualizado);
            return atualizado;
          });

          const novoSaldoRestante = totalDivida - valor;
          const dadosDoCliente = clientesCadastrados.find((c) => c.nome.toLowerCase() === cliente.toLowerCase());
          let msgWppStatus = '';

          if (dadosDoCliente && dadosDoCliente.telefone && dadosDoCliente.telefone.trim() !== '') {
            const mensagemTexto = `Olá, *${cliente}*! 🍻\nPassando para confirmar o recebimento do seu pagamento no *${nomeSoftware}*:\n\n` +
              `💰 *Valor Abatido:* ${formatarMoeda(valor)}\n📊 *SITUAÇÃO DA CONTA ATUALIZADA:*\n• Dívida Total Anterior: ${formatarMoeda(totalDivida)}\n• *SALDO DEVEDOR RESTANTE:* *${formatarMoeda(novoSaldoRestante)}*\n\n_Qualquer dúvida, estamos à disposição!_ 🎸`;
            abrirWhatsAppDireto(dadosDoCliente.telefone, mensagemTexto);
            msgWppStatus = '\n\n📲 O WhatsApp foi aberto para enviar o recibo parcial!';
          }

          setCrediarios(novasComandas);
          setVendas(prev => [...prev, { idVenda: Date.now(), data: new Date().toLocaleString('pt-BR'), cliente: `Abatimento Parcial Crediário - ${cliente}`, total: valor, pagamento: 'PIX/Dinheiro/Cartão', itensConsumidos: [{ nome: 'Abatimento Parcial Fiado', qtd: 1, preco: valor }]}]);

          try {
            for (const item of alteradosParaBanco) {
              await supabaseClient?.from('crediarios').update({ total: item.total, status: item.status, pagamentos: item.pagamentos, updated_at: item.updated_at }).eq('id_cred', item.idCred);
            }
            await supabaseClient?.from('vendas').insert([{ data: new Date().toLocaleString('pt-BR'), cliente: `Abatimento Parcial - ${cliente}`, total: valor, pagamento: 'PIX/Dinheiro/Cartão', itens_consumidos: [{ nome: 'Abatimento Parcial Fiado', qtd: 1, preco: valor }]}]);
          } catch (error) { console.error(error); }

          dispararMensagem('Sucesso', `Abatimento de ${formatarMoeda(valor)} registrado com sucesso!${msgWppStatus}`);
        },
      });
      return;
    }

    dispararConfirmacao('Liquidar Crediário', `Confirmar recebimento TOTAL de ${formatarMoeda(totalDivida)} em [${metodo}] para quitar todas as contas de ${cliente}?`, async () => {
        setCrediarios((prev) => prev.map((c) => {
            const pertence = comandasArray.some((x) => x.idCred === c.idCred);
        return pertence ? { ...c, status: 'Pago', total: 0, pagamentos: [...(c.pagamentos || []), { valor: c.total, metodo: metodo, data: new Date().toLocaleString('pt-BR')}], updated_at: new Date().toISOString() } : c;
        }));

        comandasArray.forEach((credItem) => {
          if (credItem.itensConsumidos) {
            registrarProdutosVendidos(credItem.itensConsumidos.map((it) => ({ idProd: Math.random(), nome: it.nome, qtd: it.qtd, preco: it.preco, precoCusto: it.preco * 0.4 })));
          }
        });

        const dadosDoCliente = clientesCadastrados.find((c) => c.nome.toLowerCase() === cliente.toLowerCase());
        let msgWppStatus = '';

        if (dadosDoCliente && dadosDoCliente.telefone && dadosDoCliente.telefone.trim() !== '') {
          const mensagemTexto = `Olá, *${cliente}*! 🍻\nPassando para confirmar o recebimento do seu pagamento no *${nomeSoftware}*:\n\n` +
            `✅ *Valor Pago:* ${formatarMoeda(totalDivida)} (via ${metodo})\n🎉 *SITUAÇÃO DA CONTA:* *TOTALMENTE QUITADA!*\n\n_Seu saldo devedor atual é: R$ 0,00._\n_Obrigado pela preferência, nos vemos no próximo rock!_ 🎸`;
          abrirWhatsAppDireto(dadosDoCliente.telefone, mensagemTexto);
          msgWppStatus = '\n\n📲 O WhatsApp foi aberto para notificar a quitação da conta!';
        }

        setVendas(prev => [...prev, { idVenda: Date.now(), data: new Date().toLocaleString('pt-BR'), cliente: `Quitação Total Crediário - ${cliente}`, total: totalDivida, pagamento: metodo, itensConsumidos: [{ nome: 'Quitação Total Fiado', qtd: 1, preco: totalDivida }]}]);

        try {
          for (const credItem of comandasArray) {
            await supabaseClient?.from('crediarios').update({ total: 0, status: 'Pago', updated_at: new Date().toISOString() }).eq('id_cred', credItem.idCred);
          }
          await supabaseClient?.from('vendas').insert([{ data: new Date().toLocaleString('pt-BR'), cliente: `Quitação Total - ${cliente}`, total: totalDivida, pagamento: metodo, itens_consumidos: [{ nome: 'Quitação Total Fiado', qtd: 1, preco: totalDivida }]}]);
        } catch (error) { console.error(error); }

        dispararMensagem('Sucesso', `Todas as comandas deste cliente foram totalmente baixadas e inseridas no caixa!${msgWppStatus}`);
      }
    );
  }

  function verificarFiltroData(dataString) {
    if (!dataString) return false;
    let d = '', m = '', a = '';
    if (dataString.includes(',')) {
      const partes = dataString.split(',')[0].split('/');
      d = partes[0]; m = partes[1]; a = partes[2];
    } else if (dataString.includes('-')) {
      const partes = dataString.split('-');
      d = partes[2]; m = partes[1]; a = partes[0];
    }

    if (filtroAno !== 'Todos' && a !== filtroAno) return false;
    if (filtroMes !== 'Todos' && m !== filtroMes) return false;
    if (filtroDia !== 'Todos' && parseInt(d) !== parseInt(filtroDia)) return false;
    return true;
  }

  function imprimirPainelRelatorio(produtosProcessados, escopo) {
    const dataRef = new Date().toLocaleDateString('pt-BR');
    const linhasTexto = produtosProcessados.map((p) => {
        const lucro = p.preco - p.precoCusto;
        const vendasQtd = relatorioProdutos.find((rp) => rp.nome === p.nome)?.qtd || 0;
        return `• ${p.nome} (${p.category})\n  Estoque: ${p.estoque} un | Saídas: ${vendasQtd} un | Lucro un: ${formatarMoeda(lucro)}`;
      }).join('\n----------------------------------------\n');

    const custoT = produtosProcessados.reduce((acc, p) => acc + p.estoque * p.precoCusto, 0);
    const vendaT = produtosProcessados.reduce((acc, p) => acc + p.estoque * p.preco, 0);

    dispararMensagem(`RELATÓRIO DE ESTOQUE - [${escopo.toUpperCase()}]`, `Software/Módulo: ${nomeSoftware}\nData de Emissão: ${dataRef}\n----------------------------------------\n${linhasTexto}\n----------------------------------------\nCusto Total Avaliado: ${formatarMoeda(custoT)}\nRetorno Estimado: ${formatarMoeda(vendaT)}\nLucro Líquido Projetado: ${formatarMoeda(vendaT - custoT)}\n\n* DOCUMENTO GERENCIAL INTERNO *`);
  }
  
  return (
    <div>
      <Header 
        nomeSoftware={nomeSoftware}
        telaAtual={telaAtual}
        proximaTelaPendente={proximaTelaPendente}
        navegarPara={navegarPara}
        autenticado={autenticado}
        usuarioLogado={usuarioLogado}
        sincronizarDadosNuvem={sincronizarDadosNuvem}
        logoutSistema={logoutSistema}
      /> 
        
      {telaAtual === 'garcom' && autenticado && (
        <Garcom
          comandas={comandas}
          comandaAtivaId={comandaAtivaId}
          setComandaAtivaId={setComandaAtivaId}
          produtos={produtos}
          categoriasCustomizadas={categoriasCustomizadas}
          categoriasDivisiveis={categoriasDivisiveis}
          imagemAutomaticaProduto={imagemAutomaticaProduto}
          addItemNaComanda={addItemNaComanda}
          abrirComandaPorNomePronto={abrirComandaPorNomePronto}
          iniciarDivisaoItem={iniciarDivisaoItem}
          usuarioLogado={usuarioLogado}
          logoutSistema={logoutSistema}
        />
      )}

      {telaAtual === 'pdv' && autenticado && (
        <PDV
          comandaAtual={comandaAtual}
          comandas={comandas}
          comandaAtivaId={comandaAtivaId}
          setComandaAtivaId={setComandaAtivaId}
          produtos={produtos}
          categoriasCustomizadas={categoriasCustomizadas}
          categoriasDivisiveis={categoriasDivisiveis}
          categoriaAtiva={categoriaAtiva}
          setCategoriaAtiva={setCategoriaAtiva}
          relatorioProdutos={relatorioProdutos}
          vendas={vendas}
          busca={busca}
          setBusca={setBusca}
          mostrarSugestoes={mostrarSugestoes}
          setMostrarSugestoes={setMostrarSugestoes}
          clientesCadastrados={clientesCadastrados}
          abrirComandaPorNomePronto={abrirComandaPorNomePronto}
          valDinheiro={valDinheiro}
          setValDinheiro={setValDinheiro}
          valPix={valPix}
          setValPix={setValPix}
          valCartao={valCartao}
          setValCartao={setValCartao}
          valCrediario={valCrediario}
          setValCrediario={setValCrediario}
          modoPagamento={modoPagamento}
          setModoPagamento={setModoPagamento}
          mostrarMultiFormas={mostrarMultiFormas}
          setMostrarMultiFormas={setMostrarMultiFormas}
          comandaRecemPaga={comandaRecemPaga}
          setComandaRecemPaga={setComandaRecemPaga}
          confirmarPagamentoComposto={confirmarPagamentoComposto}
          finalizarPagamentoDireto={finalizarPagamentoDireto}
          emitirNotaFiscalSilenciosa={emitirNotaFiscalSilenciosa}
          imagemAutomaticaProduto={imagemAutomaticaProduto}
          addItemNaComanda={addItemNaComanda}
          iniciarDivisaoItem={iniciarDivisaoItem}
          tratarRemoverSplit={tratarRemoverSplit}
          removerItemNaComanda={removerItemNaComanda}
          diminuirQtdItemNaComanda={diminuirQtdItemNaComanda}
          iniciarPagamentoParcial={iniciarPagamentoParcial}
          imprimirComandaConferencia={imprimirComandaConferencia}
          cancelarComanda={cancelarComanda}
          buscaContainerRef={buscaContainerRef}
          nomeSoftware={nomeSoftware}
        />
      )}
      {telaAtual === 'login_gerencial' && (
        <Login 
          usuariosSistema={usuariosSistema}
          usuarioDigitado={usuarioDigitado}
          setUsuarioDigitado={setUsuarioDigitado}
          senhaDigitada={senhaDigitada}
          setSenhaDigitada={setSenhaDigitada}
          erroAutenticacao={erroAutenticacao}
          validarAcessoGerencial={validarAcessoGerencial}
        />
      )}

      {telaAtual === 'estoque' && autenticado && (
        <Estoque 
          produtos={produtos}
          setProdutos={setProdutos}
          categoriasCustomizadas={categoriasCustomizadas}
          setCategoriasCustomizadas={setCategoriasCustomizadas}
          categoriasDivisiveis={categoriasDivisiveis}
          setCategoriasDivisiveis={setCategoriasDivisiveis}
          dispararMensagem={dispararMensagem}
          setCaixaDialogo={setCaixaDialogo}
          excluirProdutoDoEstoque={excluirProdutoDoEstoque}
          imprimirPainelRelatorio={imprimirPainelRelatorio}
          processarNotaComIA={processarNotaComIA}
          imagemAutomaticaProduto={imagemAutomaticaProduto}
          categoriaAtiva={categoriaAtiva}
          setCategoriaAtiva={setCategoriaAtiva}
        />
      )}

      {telaAtual === 'clientes' && autenticado && (
        <Clientes 
          clientesCadastrados={clientesCadastrados}
          setClientesCadastrados={setClientesCadastrados}
          comandas={comandas}
          setComandas={setComandas}
          crediarios={crediarios}
          setCrediarios={setCrediarios}
          vendas={vendas}
          setVendas={setVendas}
          dispararMensagem={dispararMensagem}
          dispararConfirmacao={dispararConfirmacao}
        />
      )}
      {telaAtual === 'financeiro' && autenticado && (
        <Financeiro 
          vendas={vendas}
          produtos={produtos}
          despesas={despesas}
          setDespesas={setDespesas}
          nomeSoftware={nomeSoftware}
          dispararMensagem={dispararMensagem}
        />
      )}
      {telaAtual === 'crediario' && autenticado && (
        <Crediario 
          crediarios={crediarios}
          setCaixaDialogo={setCaixaDialogo}
          liquidarVáriasComandasCrediario={liquidarVáriasComandasCrediario}
          adicionarLancamentoCrediario={adicionarLancamentoCrediario}
          clientesCadastrados={clientesCadastrados}
          imprimirRelatorioDiarioFiados={imprimirRelatorioDiarioFiados}
          imprimirRelatorioPendenciaGeralFiados={imprimirRelatorioPendenciaGeralFiados}
          imprimirExtratoDebitosCliente={imprimirExtratoDebitosCliente}
        />
      )}
      {telaAtual === 'seguranca' && autenticado && usuarioLogado && usuarioLogado.perfil === 'admin' && (
          <Seguranca 
            cadastrarNovoOperador={cadastrarNovoOperador}
            novoUserNome={novoUserNome}
            setNovoUserNome={setNovoUserNome}
            novoUserSenha={novoUserSenha}
            setNovoUserSenha={setNovoUserSenha}
            novoUserPerfil={novoUserPerfil}
            setNovoUserPerfil={setNovoUserPerfil}
            novoUserRestricoes={novoUserRestricoes}
            gerenciarCheckboxRestricao={gerenciarCheckboxRestricao}
            nomeSoftware={nomeSoftware}
            setNomeSoftware={setNomeSoftware}
            usuariosSistema={usuariosSistema}
            setUsuarioEditando={setUsuarioEditando}
            excluirUsuario={excluirUsuario}
          />
      )}

      {telaAtual === 'auditoria' && autenticado && (
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
      )}

      {usuarioEditando && (
        <div className="custom-dialog-overlay">
          <div className="custom-dialog-box">
            <div className="custom-dialog-title" style={{ color: '#3498db' }}>
              <i className="fas fa-user-edit"></i>
              <span>Editar Usuário: {usuarioEditando.usuario}</span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px' }}>Perfil de Acesso:</label>
              <select
                className="dark-input-field"
                value={usuarioEditando.perfil}
                onChange={(e) => setUsuarioEditando({ ...usuarioEditando, perfil: e.target.value })}
              >
                <option value="operador">Operador (Acesso Restrito)</option>
                <option value="admin">Administrador (Acesso Total)</option>
              </select>
            </div>

            {usuarioEditando.perfil === 'operador' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px' }}>
                  Selecione as telas que serão BLOQUEADAS para ele:
                </label>
                <div className="checkbox-group" style={{ color: 'white', background: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <label className="checkbox-item"><input type="checkbox" checked={(usuarioEditando.restricoes || []).includes('estoque')} onChange={() => toggleRestricaoEdicao('estoque')} /> Estoque</label>
                  <label className="checkbox-item"><input type="checkbox" checked={(usuarioEditando.restricoes || []).includes('financeiro')} onChange={() => toggleRestricaoEdicao('financeiro')} /> Painel Financeiro</label>
                  <label className="checkbox-item"><input type="checkbox" checked={(usuarioEditando.restricoes || []).includes('crediario')} onChange={() => toggleRestricaoEdicao('crediario')} /> Penduras/Crediário</label>
                  <label className="checkbox-item"><input type="checkbox" checked={(usuarioEditando.restricoes || []).includes('seguranca')} onChange={() => toggleRestricaoEdicao('seguranca')} /> Segurança (Acessos)</label>
                </div>
              </div>
            )}

            <div className="custom-dialog-buttons">
              <button type="button" className="btn-dialog-cancel" onClick={() => setUsuarioEditando(null)}>Cancelar</button>
              <button type="button" className="btn-dialog-confirm" style={{ background: '#3498db' }} onClick={salvarEdicaoUsuario}>Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      {caixaDialogo && (
        <div className="custom-dialog-overlay">
          <div className="custom-dialog-box">
            <div className="custom-dialog-title">
              <i className="fas fa-exclamation-triangle"></i>
              <span>{caixaDialogo.titulo}</span>
            </div>
            <div className="custom-dialog-message">{caixaDialogo.mensagem}</div>

            {caixaDialogo.tipo === 'prompt' && (
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text" className="dark-input-field" placeholder="Digite o valor..."
                  style={{ textAlign: 'left', background: '#090f17', border: '1px solid #ef4444' }}
                  value={promptVal} onChange={(e) => setPromptVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { caixaDialogo.onConfirm(promptVal); setCaixaDialogo(null); } }}
                  autoFocus
                />
              </div>
            )}

            {caixaDialogo.tipo === 'prompt_moeda' && (
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  inputMode="decimal"
                  className="dark-input-field"
                  placeholder="R$ 0,00"
                  style={{ textAlign: 'left', background: '#090f17', border: '1px solid #ef4444' }}
                  value={promptVal}
                  onChange={(e) => {
                    const somenteNumeros = String(e.target.value || '').replace(/[^\d]/g, '');
                    const numero = somenteNumeros ? Number(somenteNumeros) / 100 : 0;
                    setPromptVal(numero ? numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '');
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { caixaDialogo.onConfirm(promptVal); setCaixaDialogo(null); } }}
                  autoFocus
                />
              </div>
            )}

            {caixaDialogo.tipo === 'prompt_categoria' && (
              <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input
                  type="text" className="dark-input-field" placeholder="Nome da Categoria..."
                  style={{ textAlign: 'left', background: '#ffffff', color: '#111827', border: '1px solid #cbd5e1' }}
                  value={promptVal} onChange={(e) => setPromptVal(e.target.value)} autoFocus
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#334155' }}>
                  <input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={promptValDivisivel} onChange={(e) => setPromptValDivisivel(e.target.checked)} />
                  <span>Permitir dividir produtos desta categoria nas mesas?</span>
                </label>
              </div>
            )}

            {caixaDialogo.tipo === 'selecionar_categoria' && (
              <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px', maxHeight: '240px', overflowY: 'auto', background: '#090f17', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  {(caixaDialogo.categorias || []).map((categoria) => {
                    const ativa = String(categoria).trim().toLowerCase() === String(promptVal).trim().toLowerCase();
                    return (
                      <button
                        key={categoria}
                        type="button"
                        onClick={() => setPromptVal(categoria)}
                        style={{
                          padding: '12px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer',
                          border: ativa ? '2px solid #22c55e' : '1px solid #334155',
                          background: ativa ? '#166534' : '#1e293b', color: '#f8fafc',
                        }}
                      >
                        {categoria}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text" className="dark-input-field" placeholder="Ou digite uma nova categoria..."
                  style={{ textAlign: 'left', background: '#ffffff', color: '#111827', border: '1px solid #cbd5e1' }}
                  value={promptVal} onChange={(e) => setPromptVal(e.target.value)}
                />

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#cbd5e1' }}>
                  <input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={promptValDivisivel} onChange={(e) => setPromptValDivisivel(e.target.checked)} />
                  <span>Permitir dividir produtos desta categoria nas mesas?</span>
                </label>
              </div>
            )}

            {caixaDialogo.tipo === 'motivos_botoes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {caixaDialogo.botoes.map((motivo) => (
                  <button
                    key={motivo} type="button"
                    style={{ background: '#f97316', color: 'white', padding: '14px', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.15)' }}
                    onClick={() => { caixaDialogo.onSelect(motivo); setCaixaDialogo(null); }}
                  >
                    {motivo}
                  </button>
                ))}
              </div>
            )}

            {caixaDialogo.tipo === 'gerenciar_categoria' && (
              <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <select
                  className="dark-input-field"
                  value={categoriaGerenciarSelecionada}
                  onChange={(e) => {
                    setCategoriaGerenciarSelecionada(e.target.value);
                    setNovoNomeCategoriaGerenciar(e.target.value);
                  }}
                  style={{ textAlign: 'left', background: '#ffffff', color: '#111827', border: '1px solid #cbd5e1' }}
                >
                  {(caixaDialogo.categorias || []).map((categoria) => (
                    <option key={categoria || '__vazio__'} value={categoria} style={{ background: '#0f172a', color: '#f8fafc' }}>
                      {String(categoria || '').trim() ? categoria : '(sem nome)'}
                    </option>
                  ))}
                </select>

                <input
                  type="text" className="dark-input-field" placeholder="Novo nome da categoria..."
                  style={{ textAlign: 'left', background: '#ffffff', color: '#111827', border: '1px solid #cbd5e1' }}
                  value={novoNomeCategoriaGerenciar}
                  onChange={(e) => setNovoNomeCategoriaGerenciar(e.target.value)}
                />

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    style={{ flex: 1, background: '#2563eb', color: 'white', padding: '10px 14px', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                    onClick={() => {
                      // onConfirm decide o próximo diálogo (mensagem de sucesso/erro), então não fechamos aqui.
                      caixaDialogo.onConfirm?.(categoriaGerenciarSelecionada, novoNomeCategoriaGerenciar, 'renomear');
                      setCategoriaGerenciarSelecionada('');
                      setNovoNomeCategoriaGerenciar('');
                    }}
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    style={{ flex: 1, background: '#ef4444', color: 'white', padding: '10px 14px', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                    onClick={() => {
                      caixaDialogo.onConfirm?.(categoriaGerenciarSelecionada, '', 'excluir');
                      setCategoriaGerenciarSelecionada('');
                      setNovoNomeCategoriaGerenciar('');
                    }}
                  >
                    Excluir
                  </button>
                </div>

                <button
                  type="button"
                  style={{ background: 'transparent', color: '#cbd5e1', border: '1px solid #334155', padding: '10px 14px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                  onClick={() => {
                    setCaixaDialogo(null);
                    setCategoriaGerenciarSelecionada('');
                    setNovoNomeCategoriaGerenciar('');
                  }}
                >
                  Fechar
                </button>
              </div>
            )}

            {caixaDialogo.tipo !== 'gerenciar_categoria' && (
              <div className="custom-dialog-buttons" style={{ gap: '10px', flexWrap: 'wrap' }}>
                {caixaDialogo.tipo !== 'alert' && !caixaDialogo.noCancel && (
                  <button type="button" className="btn-dialog-cancel" onClick={() => { if (caixaDialogo.onCancel) caixaDialogo.onCancel(); setCaixaDialogo(null); }}>
                    {caixaDialogo.cancelTxt || 'Cancelar'}
                  </button>
                )}

                {caixaDialogo.tipo !== 'motivos_botoes' && (
                  <button
                    type="button" className="btn-dialog-confirm"
                    onClick={() => {
                      if (caixaDialogo.tipo === 'prompt' || caixaDialogo.tipo === 'prompt_moeda') caixaDialogo.onConfirm(promptVal);
                      else if (caixaDialogo.tipo === 'prompt_categoria' || caixaDialogo.tipo === 'selecionar_categoria') caixaDialogo.onConfirm(promptVal, promptValDivisivel);
                      else caixaDialogo.onConfirm();
                      setCaixaDialogo(null);
                    }}
                  >
                    {caixaDialogo.confirmTxt || 'Confirmar'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {modalDividir && (
        <div className="custom-dialog-overlay">
          <div className="custom-dialog-box" style={{ maxWidth: '460px' }}>
            <div className="custom-dialog-title" style={{ color: '#38bdf8' }}>
              <i className="fas fa-divide"></i>
              <span>Dividir Item: {modalDividir.item.nome}</span>
            </div>
            <div className="custom-dialog-message" style={{ marginBottom: '15px' }}>
              Selecione quais comandas ativas abertas irão rachar este item com a comanda de <strong>{comandaAtual.nome}</strong>:
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto', background: '#090f17', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #1e293b' }}>
              {comandas.filter((c) => !mesmoComandaId(c.id, comandaAtual.id)).length === 0 ? (
                <span style={{ color: '#64748b', fontSize: '13px', display: 'block', textAlign: 'center', padding: '15px' }}>Nenhuma outra comanda ativa aberta para realizar a divisão.</span>
              ) : (
                comandas.filter((c) => !mesmoComandaId(c.id, comandaAtual.id)).map((c) => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', cursor: 'pointer', color: '#cbd5e1', fontSize: '14px', borderBottom: '1px dashed #1e293b' }}>
                      <input
                        type="checkbox" value={c.id} style={{ width: 'auto', margin: 0 }}
                        checked={comandasSelecionadasSplit.includes(normalizarComandaId(c.id))}
                        onChange={(e) => {
                          const val = normalizarComandaId(e.target.value);
                          setComandasSelecionadasSplit((prev) => e.target.checked ? [...prev, val] : prev.filter((id) => !mesmoComandaId(id, val)));
                        }}
                      />
                      <span>{c.nome} (Mesa #{c.id})</span>
                    </label>
                  ))
              )}
            </div>

            <div className="custom-dialog-buttons">
              <button type="button" className="btn-dialog-cancel" onClick={() => setModalDividir(null)}>Cancelar</button>
              <button type="button" className="btn-dialog-confirm" style={{ background: '#0284c7' }} disabled={comandasSelecionadasSplit.length === 0} onClick={() => realizarDivisao(modalDividir.item, comandasSelecionadasSplit)}>
                Confirmar Rateio ({comandasSelecionadasSplit.length + 1} partes)
              </button>
            </div>
          </div>
        </div>
      )}

      {modalPagamentoParcial && comandaAtual && (
        <div className="custom-dialog-overlay">
          <div className="custom-dialog-box" style={{ maxWidth: '520px' }}>
            <div className="custom-dialog-title" style={{ color: '#22c55e' }}>
              <i className="fas fa-hand-holding-usd"></i>
              <span>Pagamento Parcial: {comandaAtual.nome}</span>
            </div>
            <div className="custom-dialog-message" style={{ marginBottom: '15px' }}>
              Selecione a quantidade de cada item que este cliente vai pagar agora. O restante continua na comanda.
            </div>

            <div style={{ maxHeight: '260px', overflowY: 'auto', background: '#090f17', padding: '12px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #1e293b' }}>
              {comandaAtual.itens.map((item, idx) => {
                const selecionada = Number(itensPagamentoParcial[idx] || 0);
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px dashed #1e293b', color: '#cbd5e1', fontSize: '14px' }}>
                    <div style={{ flex: 1 }}>
                      <div>{item.nome}</div>
                      <small style={{ color: '#64748b' }}>Na comanda: {item.qtd} • {formatarMoeda(item.preco)} un.</small>
                    </div>
                    <button type="button" onClick={() => ajustarQtdPagamentoParcial(idx, -1)} disabled={selecionada <= 0}
                      style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid #475569', background: '#1e293b', color: '#f8fafc', fontSize: '18px', fontWeight: 'bold', cursor: selecionada <= 0 ? 'not-allowed' : 'pointer' }}>−</button>
                    <strong style={{ minWidth: '34px', textAlign: 'center', color: selecionada > 0 ? '#22c55e' : '#64748b' }}>{selecionada}</strong>
                    <button type="button" onClick={() => ajustarQtdPagamentoParcial(idx, 1)} disabled={selecionada >= Number(item.qtd)}
                      style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid #475569', background: '#1e293b', color: '#f8fafc', fontSize: '18px', fontWeight: 'bold', cursor: selecionada >= Number(item.qtd) ? 'not-allowed' : 'pointer' }}>+</button>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '12px' }}>
              <span>Total selecionado:</span>
              <span style={{ color: '#22c55e' }}>{formatarMoeda(calcularTotal(obterItensPagamentoParcial()))}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '15px' }}>
              {[
                { tipo: 'dinheiro', rotulo: '💵 Dinheiro' },
                { tipo: 'pix', rotulo: '⚡ Pix' },
                { tipo: 'cartão', rotulo: '💳 Cartão' },
                { tipo: 'fiado', rotulo: '📙 Fiado' },
              ].map(({ tipo, rotulo }) => (
                <button
                  key={tipo}
                  type="button"
                  disabled={obterItensPagamentoParcial().length === 0}
                  onClick={() => confirmarPagamentoParcial(tipo)}
                  style={{
                    padding: '14px 10px', fontSize: '14px', fontWeight: 'bold', borderRadius: '8px', border: 'none',
                    background: obterItensPagamentoParcial().length === 0 ? '#334155' : '#0f766e', color: '#f8fafc',
                    cursor: obterItensPagamentoParcial().length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            <div className="custom-dialog-buttons">
              <button type="button" className="btn-dialog-cancel" onClick={() => { setModalPagamentoParcial(null); setItensPagamentoParcial({}); }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalRevisaoNota && (
        <div className="custom-dialog-overlay" style={{ zIndex: 9999, background: 'rgba(0, 0, 0, 0.85)' }}>
          <div className="custom-dialog-box" style={{ maxWidth: '950px', width: '95%', background: '#0f172a', border: '2px solid #38bdf8', padding: '0', overflow: 'hidden' }}>
            <div style={{ background: '#0284c7', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className={processandoNota ? "fas fa-spinner fa-spin" : "fas fa-robot"} style={{ fontSize: '24px' }}></i>
                <span>{processandoNota ? 'A IA está lendo a sua nota...' : 'Revisão Inteligente de Nota Fiscal'}</span>
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              {processandoNota ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#38bdf8' }}>
                  <i className="fas fa-magic fa-spin" style={{ fontSize: '40px', marginBottom: '15px' }}></i>
                  <h3>Extraindo produtos, quantidades e valores...</h3>
                  <p style={{ color: '#94a3b8' }}>Isso leva apenas alguns segundos.</p>
                </div>
              ) : (
                <>
                  <p style={{ color: '#cbd5e1', fontSize: '13px', marginBottom: '15px', marginTop: '0' }}>
                    A Inteligência Artificial extraiu os seguintes itens. <strong>Ajuste nomes errados e confirme as conversões de estoque</strong> (Caixas, Doses e Peso) antes de salvar no sistema.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 50px', gap: '10px', background: '#1e293b', padding: '10px', borderRadius: '8px 8px 0 0', color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    <span>Produto Identificado</span><span>Formato de Entrada</span><span>Qtd. Comprada</span><span>Fator / Rendimento</span><span>Custo Total (R$)</span><span>Excluir</span>
                  </div>

                  <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #1e293b', borderRadius: '0 0 8px 8px', borderTop: 'none' }}>
                    {itensNotaIA.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Nenhum item identificado.</div>}
                    
                    {itensNotaIA.map((item) => (
                      <div key={item.idTemp} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 50px', gap: '10px', padding: '10px', borderBottom: '1px solid #1e293b', alignItems: 'center', background: '#090f17' }}>
                        
                        <input type="text" value={item.nome} onChange={(e) => atualizarItemIA(item.idTemp, 'nome', e.target.value)} style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '4px', fontSize: '12px' }} />
                        
                        <select value={item.formato} onChange={(e) => atualizarItemIA(item.idTemp, 'formato', e.target.value)} style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px dashed #38bdf8', color: '#38bdf8', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', outline: 'none' }}>
                          <option value="padrao">🥤 Unidade Padrão</option>
                          <option value="caixa">📦 Caixa (Vendido Solto)</option>
                          <option value="garrafa">🥃 Garrafa (Vendido Dose)</option>
                          <option value="peso">⚖️ Peso (Vendido Porção)</option>
                        </select>

                        <input type="number" value={item.qtdComprada} onChange={(e) => atualizarItemIA(item.idTemp, 'qtdComprada', e.target.value)} style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '4px', fontSize: '12px', textAlign: 'center' }} />
                        
                        <input type="number" value={item.fator} onChange={(e) => atualizarItemIA(item.idTemp, 'fator', e.target.value)} disabled={item.formato === 'padrao'} style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: item.formato === 'padrao' ? '#475569' : '#f59e0b', borderRadius: '4px', fontSize: '12px', textAlign: 'center', fontWeight: 'bold' }} />
                        
                        <input type="text" value={item.custoTotal} onChange={(e) => atualizarItemIA(item.idTemp, 'custoTotal', e.target.value)} style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: '#ef4444', borderRadius: '4px', fontSize: '12px' }} />
                        
                        <button onClick={() => setItensNotaIA(prev => prev.filter(i => i.idTemp !== item.idTemp))} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer' }}><i className="fas fa-trash"></i></button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #1e293b' }}>
                    <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                      Valor Total da Nota: <strong style={{ color: '#ef4444', fontSize: '18px' }}>
                        {formatarMoeda(itensNotaIA.reduce((acc, i) => acc + parseFloat(String(i.custoTotal || "0").replace(',', '.')), 0))}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <button onClick={() => setModalRevisaoNota(false)} style={{ background: 'transparent', border: '1px solid #64748b', color: '#94a3b8', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Cancelar e Descartar
                      </button>
                      <button onClick={confirmarProcessamentoNota} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(34, 197, 94, 0.4)' }}>
                        <i className="fas fa-check-double"></i> Confirmar e Processar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);