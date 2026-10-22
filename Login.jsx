import React, { useEffect } from 'react';

export const Login = ({
  usuariosSistema,
  usuarioDigitado,
  setUsuarioDigitado,
  senhaDigitada,
  setSenhaDigitada,
  erroAutenticacao,
  validarAcessoGerencial
}) => {
  const [tecladoAberto, setTecladoAberto] = React.useState(false);
  const [alturaViewport, setAlturaViewport] = React.useState(() => window.visualViewport?.height || window.innerHeight);

  useEffect(() => {
    const ajustarParaTeclado = () => {
      const viewportAltura = window.visualViewport?.height || window.innerHeight;
      setAlturaViewport(viewportAltura);
      setTecladoAberto(window.innerHeight - viewportAltura > 140);
    };

    const viewport = window.visualViewport;
    ajustarParaTeclado();
    if (!viewport) return undefined;

    viewport.addEventListener('resize', ajustarParaTeclado);
    viewport.addEventListener('scroll', ajustarParaTeclado);

    return () => {
      viewport.removeEventListener('resize', ajustarParaTeclado);
      viewport.removeEventListener('scroll', ajustarParaTeclado);
    };
  }, []);

  return (
    <div
      className={`login-container${tecladoAberto ? ' login-teclado-aberto' : ''}`}
      style={{ '--login-viewport-height': `${alturaViewport}px` }}
    >
      <form className="login-card" onSubmit={validarAcessoGerencial}>
        <i className="fas fa-lock cadeado"></i>
        <h3>Autenticação Requerida</h3>
        <p>Selecione seu usuário e digite a senha.</p>
        <select
          value={usuarioDigitado}
          onChange={(e) => setUsuarioDigitado(e.target.value)}
        >
          {usuariosSistema.map((u) => (
            <option key={u.usuario} value={u.usuario}>
              {u.usuario.toUpperCase()} ({u.perfil})
            </option>
          ))}
        </select>
        <input
          type="password"
          placeholder="••••"
          maxLength="8"
          value={senhaDigitada}
          onChange={(e) => setSenhaDigitada(e.target.value)}
        />
        <button type="submit" className="btn-acessar">
          Entrar no Sistema
        </button>
        {erroAutenticacao && (
          <div className="erro-senha">Senha incorreta!</div>
        )}
      </form>
    </div>
  );
};
