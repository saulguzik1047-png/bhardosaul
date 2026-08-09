import React from 'react';

export const Login = ({
  usuariosSistema,
  usuarioDigitado,
  setUsuarioDigitado,
  senhaDigitada,
  setSenhaDigitada,
  erroAutenticacao,
  validarAcessoGerencial
}) => {
  return (
    <div className="login-container">
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
