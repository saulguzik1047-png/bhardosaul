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
  useEffect(() => {
    const ajustarParaTeclado = () => {
      const elementoAtivo = document.activeElement;
      if (!elementoAtivo || !['INPUT', 'SELECT', 'TEXTAREA'].includes(elementoAtivo.tagName)) {
        return;
      }

      const rect = elementoAtivo.getBoundingClientRect();
      const viewportAltura = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const margemSegura = 80;

      if (rect.bottom > viewportAltura - margemSegura) {
        const diferenca = rect.bottom - (viewportAltura - margemSegura);
        window.scrollTo({
          top: window.scrollY + diferenca + 16,
          behavior: 'smooth'
        });
      }
    };

    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    viewport.addEventListener('resize', ajustarParaTeclado);
    viewport.addEventListener('scroll', ajustarParaTeclado);

    return () => {
      viewport.removeEventListener('resize', ajustarParaTeclado);
      viewport.removeEventListener('scroll', ajustarParaTeclado);
    };
  }, []);

  const focarCampo = () => {
    setTimeout(() => {
      const elementoAtivo = document.activeElement;
      if (!elementoAtivo || !['INPUT', 'SELECT', 'TEXTAREA'].includes(elementoAtivo.tagName)) {
        return;
      }

      const rect = elementoAtivo.getBoundingClientRect();
      const viewportAltura = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const margemSegura = 80;

      if (rect.bottom > viewportAltura - margemSegura) {
        const diferenca = rect.bottom - (viewportAltura - margemSegura);
        window.scrollTo({
          top: window.scrollY + diferenca + 16,
          behavior: 'smooth'
        });
      }
    }, 120);
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={validarAcessoGerencial}>
        <i className="fas fa-lock cadeado"></i>
        <h3>Autenticação Requerida</h3>
        <p>Selecione seu usuário e digite a senha.</p>
        <select
          value={usuarioDigitado}
          onChange={(e) => setUsuarioDigitado(e.target.value)}
          onFocus={focarCampo}
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
          onFocus={focarCampo}
          onClick={focarCampo}
          autoFocus
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
