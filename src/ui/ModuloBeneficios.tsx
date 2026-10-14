import { Icone } from './campos';

/** Prévia do próximo módulo. O conteúdo de benefícios ainda depende de levantamento por estado. */
export function ModuloBeneficios({ onIr }: { onIr: () => void }) {
  return (
    <div className="etapa">
      <div className="etapa-titulo">
        <p className="sobretitulo">Em desenvolvimento</p>
        <h1>Buscador de benefícios fiscais</h1>
        <p>Vai cruzar a atividade, o estado e o canal de venda da empresa com os incentivos estaduais de ICMS em vigor, como regimes para e-commerce, importação e indústria.</p>
      </div>
      <section className="painel em-breve">
        <ul className="atencao">
          <li className="sev-info"><Icone tipo="info" /><div><b>O que vai mostrar</b><p>Benefícios aplicáveis, redução de carga estimada, requisitos, contrapartidas e a base legal de cada um.</p></div></li>
          <li className="sev-info"><Icone tipo="info" /><div><b>Integrado às outras análises</b><p>O ganho de cada benefício entra na comparação de ST e DIFAL por estado e na escolha do regime.</p></div></li>
          <li className="sev-atencao"><Icone tipo="atencao" /><div><b>Atenção à Reforma</b><p>Benefícios de ICMS terminam junto com o imposto em 2033. Os convalidados pela LC 160/2017 contam com o fundo de compensação da EC 132/2023.</p></div></li>
        </ul>
        <button type="button" className="botao secundario" onClick={onIr}>Ver ST e DIFAL por estado</button>
      </section>
    </div>
  );
}
