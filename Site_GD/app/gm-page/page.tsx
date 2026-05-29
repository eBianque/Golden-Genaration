"use client";

// Importa os hooks que permitem controlar estado e efeitos no navegador.
import { useEffect, useMemo, useRef, useState } from "react";

// Importa o JSON com as fichas dos jogadores.
// Como seu arquivo está dentro de src/app/data, o caminho relativo funciona a partir desta página.
import fichas from "../data/fichas.json";

// Define o formato de uma habilidade no seu JSON.
type Habilidade = {
  descricao: string;
  custo: number;
};

// Define o formato mínimo de um jogador para esta tela.
type Jogador = {
  id: string;
  nome: string;
  atributos: Record<string, number>;
  pericias: Record<string, number>;
  habilidades: Record<string, Habilidade>;
  folego: {
    total: number;
    atual: number;
  };
};

// Define a posição visual do jogador no campo.
type PosicaoCampo = {
  x: number;
  y: number;
  onField: boolean;
};

// Define os esquemas táticos que você poderá aplicar no campo.
// Cada array representa os “slots” visuais de onde os jogadores podem ficar.
const FORMACOES: Record<string, { nome: string; slots: { x: number; y: number }[] }> = {
  "4-3-3": {
    nome: "4-3-3",
    slots: [
      { x: 12, y: 50 },
      { x: 28, y: 18 },
      { x: 28, y: 38 },
      { x: 28, y: 62 },
      { x: 28, y: 82 },
      { x: 52, y: 25 },
      { x: 52, y: 50 },
      { x: 52, y: 75 },
      { x: 75, y: 20 },
      { x: 75, y: 50 },
      { x: 75, y: 80 },
    ],
  },
  "4-4-2": {
    nome: "4-4-2",
    slots: [
      { x: 12, y: 50 },
      { x: 28, y: 18 },
      { x: 28, y: 38 },
      { x: 28, y: 62 },
      { x: 28, y: 82 },
      { x: 52, y: 18 },
      { x: 52, y: 38 },
      { x: 52, y: 62 },
      { x: 52, y: 82 },
      { x: 76, y: 35 },
      { x: 76, y: 65 },
    ],
  },
  "3-5-2": {
    nome: "3-5-2",
    slots: [
      { x: 12, y: 50 },
      { x: 28, y: 28 },
      { x: 28, y: 50 },
      { x: 28, y: 72 },
      { x: 52, y: 15 },
      { x: 52, y: 32 },
      { x: 52, y: 50 },
      { x: 52, y: 68 },
      { x: 52, y: 85 },
      { x: 76, y: 38 },
      { x: 76, y: 62 },
    ],
  },
};

type HabilidadeRaw = Record<string, Habilidade>;

type JogadorRaw = {
  id: string;
  nome: string;
  atributos: Record<string, number>;
  pericias: Record<string, number>;
  habilidades: HabilidadeRaw[];
  folego: {
    total: number;
    atual: number;
  };
};

function normalizarHabilidades(habilidades: HabilidadeRaw[]) {
  return habilidades.reduce<Record<string, Habilidade>>((acumulador, habilidade) => {
    Object.entries(habilidade).forEach(([nome, valor]) => {
      acumulador[nome] = valor;
    });
    return acumulador;
  }, {});
}

// Converte o JSON em uma lista de jogadores.
// Object.values é necessário porque seu arquivo ainda está organizado como objeto, e não como array.
const todosJogadores = Object.values(fichas as unknown as Record<string, JogadorRaw>).map((jogador) => ({
  ...jogador,
  habilidades: normalizarHabilidades(jogador.habilidades),
})) as Jogador[];

// Cria posições iniciais para os jogadores.
// Os primeiros jogadores começam em campo; os demais ficam fora do campo.
function criarPosicoesIniciais(jogadores: Jogador[]): Record<string, PosicaoCampo> {
  const posicoes: Record<string, PosicaoCampo> = {};

  jogadores.forEach((jogador, indice) => {
    // Aqui decidimos que os primeiros 11 jogadores começam em campo.
    // Isso pode ser ajustado depois de acordo com sua regra de jogo.
    const estaEmCampo = indice < 11;

    // Se estiver em campo, posiciona em uma grade inicial simples.
    // Se não estiver, ele começa no banco.
    posicoes[jogador.id] = {
      x: estaEmCampo ? 20 + (indice % 4) * 18 : 50,
      y: estaEmCampo ? 20 + Math.floor(indice / 4) * 18 : 92,
      onField: estaEmCampo,
    };
  });

  return posicoes;
}

// Encontra a melhor perícia do jogador para exibir em tooltip e no painel direito.
function pegarMelhorPericia(jogador: Jogador) {
  const entradas = Object.entries(jogador.pericias);

  if (entradas.length === 0) {
    return null;
  }

  return entradas.reduce((melhor, atual) => {
    return Number(atual[1]) > Number(melhor[1]) ? atual : melhor;
  });
}

// Converte uma chave do objeto em algo mais legível para UI.
function formatarChave(chave: string) {
  return chave
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

export default function MestragemPage() {
  // Guarda o estado das posições de todos os jogadores.
  const [posicoes, setPosicoes] = useState<Record<string, PosicaoCampo>>(() =>
    criarPosicoesIniciais(todosJogadores)
  );

  // Guarda se o campo está travado ou destravado.
  const [travado, setTravado] = useState(true);

  // Guarda qual formação está selecionada no dropdown.
  const [formacao, setFormacao] = useState<keyof typeof FORMACOES>("4-3-3");

  // Guarda o jogador selecionado para abrir a ficha completa na lateral direita.
  const [jogadorSelecionadoId, setJogadorSelecionadoId] = useState<string | null>(null);

  // Guarda o jogador que está sob o mouse para mostrar um resumo rápido ao lado da camisa.
  const [jogadorHoverId, setJogadorHoverId] = useState<string | null>(null);

  // Guarda quem está sendo arrastado quando o campo está destravado.
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);

  // Referência para medir o tamanho do campo e converter o mouse em porcentagem.
  const campoRef = useRef<HTMLDivElement | null>(null);

  // Lista derivada: o jogador selecionado, usada no painel direito.
  const jogadorSelecionado = useMemo(
    () => todosJogadores.find((jogador) => jogador.id === jogadorSelecionadoId) ?? null,
    [jogadorSelecionadoId]
  );

  // Aplica uma formação pré-definida aos jogadores que estão em campo.
  function aplicarFormacao() {
    const slots = FORMACOES[formacao].slots;

    setPosicoes((estadoAtual) => {
      const novoEstado: Record<string, PosicaoCampo> = { ...estadoAtual };

      // Aqui usamos a ordem original do JSON para preencher os slots.
      // Depois você pode trocar isso por um sistema de escalação manual.
      todosJogadores.forEach((jogador, indice) => {
        const slot = slots[indice];

        if (slot) {
          novoEstado[jogador.id] = {
            x: slot.x,
            y: slot.y,
            onField: true,
          };
        } else {
          // Jogadores sem slot ficam fora do campo.
          novoEstado[jogador.id] = {
            x: 50,
            y: 92,
            onField: false,
          };
        }
      });

      return novoEstado;
    });
  }

  // Coloca um jogador dentro ou fora do campo sem mexer na posição dele manualmente.
  function alternarCampo(jogadorId: string) {
    setPosicoes((estadoAtual) => ({
      ...estadoAtual,
      [jogadorId]: {
        ...estadoAtual[jogadorId],
        onField: !estadoAtual[jogadorId]?.onField,
      },
    }));
  }

  // Move o jogador selecionado em pequenos passos, útil quando você quer ajustar sem arrastar.
  function moverJogadorSelecionado(deltaX: number, deltaY: number) {
    if (!jogadorSelecionadoId) return;
    if (travado) return;

    setPosicoes((estadoAtual) => {
      const atual = estadoAtual[jogadorSelecionadoId];
      if (!atual) return estadoAtual;

      return {
        ...estadoAtual,
        [jogadorSelecionadoId]: {
          ...atual,
          x: limitarPorcentagem(atual.x + deltaX),
          y: limitarPorcentagem(atual.y + deltaY),
        },
      };
    });
  }

  // Mantém a posição sempre dentro do campo.
  function limitarPorcentagem(valor: number) {
    return Math.max(4, Math.min(96, valor));
  }

  // Começa o arraste quando o campo está destravado.
  function iniciarArraste(jogadorId: string) {
    if (travado) return;

    setArrastandoId(jogadorId);
    setJogadorSelecionadoId(jogadorId);
  }

  // Atualiza a posição do jogador enquanto o mouse está sendo movido.
  useEffect(() => {
    function moverNoCampo(event: PointerEvent) {
      if (!arrastandoId) return;
      if (travado) return;
      if (!campoRef.current) return;

      const retangulo = campoRef.current.getBoundingClientRect();

      // Converte o ponto do mouse para porcentagem relativa ao campo.
      const x = ((event.clientX - retangulo.left) / retangulo.width) * 100;
      const y = ((event.clientY - retangulo.top) / retangulo.height) * 100;

      setPosicoes((estadoAtual) => {
        const atual = estadoAtual[arrastandoId];
        if (!atual) return estadoAtual;

        return {
          ...estadoAtual,
          [arrastandoId]: {
            ...atual,
            x: limitarPorcentagem(x),
            y: limitarPorcentagem(y),
          },
        };
      });
    }

    function pararArraste() {
      setArrastandoId(null);
    }

    // Enquanto existir um jogador sendo arrastado, escutamos o movimento do ponteiro no documento.
    window.addEventListener("pointermove", moverNoCampo);
    window.addEventListener("pointerup", pararArraste);

    return () => {
      window.removeEventListener("pointermove", moverNoCampo);
      window.removeEventListener("pointerup", pararArraste);
    };
  }, [arrastandoId, travado]);

  return (
    <main className="min-h-screen bg-[#06141B] text-white flex flex-col">
      {/* CABEÇALHO DA PÁGINA */}
      <header className="px-6 py-4 border-b border-white/10 bg-[#0B202B] flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Título da página */}
        <div>
          <h1 className="text-3xl font-bold text-[#F6C453]">
            Mestragem
          </h1>
          <p className="text-sm text-white/70">
            Campo central, jogadores embaixo e ficha completa na lateral.
          </p>
        </div>

        {/* Controles principais da tela */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Seleção de formação */}
          <label className="flex items-center gap-2 bg-[#11212D] px-3 py-2 rounded-lg border border-white/10">
            <span className="text-sm text-white/70">Formação</span>
            <select
              value={formacao}
              onChange={(e) => setFormacao(e.target.value as keyof typeof FORMACOES)}
              className="bg-transparent outline-none text-white"
            >
              {/* Você pode adicionar mais opções depois, se quiser. */}
              {Object.keys(FORMACOES).map((nomeFormacao) => (
                <option key={nomeFormacao} value={nomeFormacao} className="text-black">
                  {nomeFormacao}
                </option>
              ))}
            </select>
          </label>

          {/* Botão para aplicar a formação escolhida */}
          <button
            onClick={aplicarFormacao}
            className="bg-green-600 hover:bg-green-500 transition px-4 py-2 rounded-lg font-semibold"
          >
            Aplicar formação
          </button>

          {/* Botão para travar e destravar o campo */}
          <button
            onClick={() => setTravado((estado) => !estado)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              travado
                ? "bg-yellow-500 text-black hover:bg-yellow-400"
                : "bg-red-600 text-white hover:bg-red-500"
            }`}
          >
            {travado ? "Lockar campo" : "Deslockar campo"}
          </button>
        </div>
      </header>

      {/* ÁREA PRINCIPAL: campo no centro e ficha completa na lateral direita */}
      <section className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-0">
        {/* COLUNA CENTRAL: campo de futebol */}
        <div className="p-4 sm:p-6 flex flex-col gap-4">
          {/* Aviso de uso para você não se perder durante o teste */}
          <div className="bg-[#11212D] border border-white/10 rounded-xl p-4 text-sm text-white/75">
            <p>
              <strong className="text-[#F6C453]">Modo de uso:</strong> com o campo desbloqueado, você pode arrastar as camisas. Com o campo travado, clique nelas para ver detalhes e usar a ficha ao lado.
            </p>
          </div>

          {/* Campo principal */}
          <div
            ref={campoRef}
            className="relative w-full max-w-6xl mx-auto aspect-[16/9] rounded-3xl overflow-hidden border-8 border-[#0A3320] bg-green-700 shadow-2xl select-none"
          >
            {/* Fundo do campo com leve textura via gradiente */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_50%,transparent_50%)] bg-[length:80px_100%]" />

            {/* Linha central do campo */}
            <div className="absolute left-1/2 top-0 bottom-0 w-[3px] bg-white/80 -translate-x-1/2" />

            {/* Círculo central */}
            <div className="absolute left-1/2 top-1/2 w-44 h-44 border-[3px] border-white/80 rounded-full -translate-x-1/2 -translate-y-1/2" />

            {/* Área do goleiro esquerdo */}
            <div className="absolute left-0 top-1/2 w-20 h-44 border-[3px] border-white/80 -translate-y-1/2" />

            {/* Área do goleiro direito */}
            <div className="absolute right-0 top-1/2 w-20 h-44 border-[3px] border-white/80 -translate-y-1/2" />

            {/* Pequena linha de título dentro do campo */}
            <div className="absolute top-4 left-4 bg-black/30 px-3 py-1 rounded-full text-sm">
              Campo tático
            </div>

            {/* Renderiza apenas os jogadores que estão em campo */}
            {todosJogadores
              .filter((jogador) => posicoes[jogador.id]?.onField)
              .map((jogador) => {
                const posicao = posicoes[jogador.id];
                const melhorPericia = pegarMelhorPericia(jogador);
                const estaHover = jogadorHoverId === jogador.id;
                const estaSelecionado = jogadorSelecionadoId === jogador.id;

                return (
                  <div
                    key={jogador.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${posicao.x}%`, top: `${posicao.y}%` }}
                  >
                    {/* Camisa do jogador */}
                    <button
                      onClick={() => setJogadorSelecionadoId(jogador.id)}
                      onMouseEnter={() => setJogadorHoverId(jogador.id)}
                      onMouseLeave={() => setJogadorHoverId((estado) => (estado === jogador.id ? null : estado))}
                      onPointerDown={() => iniciarArraste(jogador.id)}
                      className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center font-bold shadow-lg transition-transform active:scale-95 ${
                        estaSelecionado
                          ? "bg-[#F6C453] text-black border-white scale-110"
                          : "bg-[#123B66] text-white border-[#F6C453] hover:scale-110"
                      } ${travado ? "cursor-pointer" : "cursor-grab"}`}
                      title="Clique para selecionar. Destravado: arraste para reposicionar."
                    >
                      {/* Mostra as duas ou três primeiras letras do nome para facilitar leitura */}
                      {jogador.nome
                        .split(" ")
                        .map((parte) => parte[0])
                        .slice(0, 2)
                        .join("")}
                    </button>

                    {/* Nome embaixo da camisa */}
                    <p className="mt-2 text-center text-xs sm:text-sm font-semibold bg-black/35 px-2 py-1 rounded-md whitespace-nowrap">
                      {jogador.nome}
                    </p>

                    {/* Tooltip lateral ao encostar no jogador */}
                    {estaHover && (
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-20 w-64 bg-[#0B202B] border border-white/10 rounded-xl p-3 shadow-xl">
                        <p className="font-bold text-[#F6C453]">
                          {jogador.nome}
                        </p>

                        <p className="text-sm text-white/75 mt-1">
                          Fôlego: {jogador.folego.atual} / {jogador.folego.total}
                        </p>

                        <p className="text-sm text-white/75">
                          Melhor perícia: {melhorPericia ? `${formatarChave(melhorPericia[0])} (${melhorPericia[1]})` : "Sem perícias"}
                        </p>

                        <p className="text-sm text-white/75">
                          Estado: {posicoes[jogador.id]?.onField ? "Em campo" : "No banco"}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* COLUNA DIREITA: ficha completa do jogador selecionado */}
        <aside className="border-t xl:border-t-0 xl:border-l border-white/10 bg-[#11212D] p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="text-2xl font-bold text-[#F6C453]">
              Ficha completa
            </h2>
            <p className="text-sm text-white/70">
              Clique em uma camisa para abrir os detalhes completos.
            </p>
          </div>

          {/* Se nenhum jogador foi selecionado, mostramos um estado vazio útil */}
          {!jogadorSelecionado ? (
            <div className="bg-[#253745] rounded-xl p-4 text-white/75">
              Selecione um jogador no campo ou na lista inferior.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Cabeçalho do jogador selecionado */}
              <div className="bg-[#253745] rounded-xl p-4">
                <h3 className="text-2xl font-bold text-white">
                  {jogadorSelecionado.nome}
                </h3>

                <p className="text-sm text-white/70 mt-1">
                  ID: {jogadorSelecionado.id}
                </p>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-black/30 text-sm">
                    {posicoes[jogadorSelecionado.id]?.onField ? "Em campo" : "No banco"}
                  </span>

                  <span className="px-3 py-1 rounded-full bg-black/30 text-sm">
                    {formatarChave(formacao)}
                  </span>
                </div>
              </div>

              {/* Fôlego */}
              <section className="bg-[#253745] rounded-xl p-4">
                <h4 className="text-lg font-bold text-[#F6C453] mb-2">
                  Fôlego
                </h4>

                <p className="text-sm mb-2">
                  {jogadorSelecionado.folego.atual} / {jogadorSelecionado.folego.total}
                </p>

                <div className="w-full h-3 bg-[#06141B] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full"
                    style={{
                      width: `${Math.max(
                        5,
                        (jogadorSelecionado.folego.atual / jogadorSelecionado.folego.total) * 100
                      )}%`,
                    }}
                  />
                </div>
              </section>

              {/* Botões para mandar o jogador para o campo ou banco */}
              <section className="bg-[#253745] rounded-xl p-4 flex flex-col gap-3">
                <h4 className="text-lg font-bold text-[#F6C453]">
                  Controle do jogador
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => alternarCampo(jogadorSelecionado.id)}
                    className="bg-green-600 hover:bg-green-500 transition rounded-lg py-2 font-semibold"
                  >
                    {posicoes[jogadorSelecionado.id]?.onField ? "Tirar de campo" : "Colocar em campo"}
                  </button>

                  <button
                    onClick={() => setJogadorSelecionadoId(null)}
                    className="bg-white text-black hover:bg-gray-200 transition rounded-lg py-2 font-semibold"
                  >
                    Desselecionar
                  </button>
                </div>

                {/* Controles finos para mover quando o campo estiver destravado */}
                <div className="mt-2">
                  <p className="text-sm text-white/70 mb-2">
                    Ajuste fino da posição
                  </p>

                  <div className="grid grid-cols-3 gap-2 max-w-44">
                    <div />
                    <button
                      onClick={() => moverJogadorSelecionado(0, -4)}
                      className="bg-[#06141B] hover:bg-black transition rounded-lg py-2"
                    >
                      ↑
                    </button>
                    <div />

                    <button
                      onClick={() => moverJogadorSelecionado(-4, 0)}
                      className="bg-[#06141B] hover:bg-black transition rounded-lg py-2"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => moverJogadorSelecionado(0, 4)}
                      className="bg-[#06141B] hover:bg-black transition rounded-lg py-2"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => moverJogadorSelecionado(4, 0)}
                      className="bg-[#06141B] hover:bg-black transition rounded-lg py-2"
                    >
                      →
                    </button>
                  </div>
                </div>
              </section>

              {/* Atributos */}
              <section className="bg-[#253745] rounded-xl p-4">
                <h4 className="text-lg font-bold text-[#F6C453] mb-3">
                  Atributos
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(jogadorSelecionado.atributos).map(([nome, valor]) => (
                    <div key={nome} className="bg-[#06141B] rounded-lg p-2 flex justify-between gap-2">
                      <span className="capitalize text-white/85">{formatarChave(nome)}</span>
                      <span className="font-bold text-[#F6C453]">{valor}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Perícias */}
              <section className="bg-[#253745] rounded-xl p-4">
                <h4 className="text-lg font-bold text-[#F6C453] mb-3">
                  Perícias
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(jogadorSelecionado.pericias)
                    // Aqui você filtra para ver só as perícias que realmente importam na sessão.
                    .filter(([_, valor]) => Number(valor) > 0)
                    .map(([nome, valor]) => (
                      <div key={nome} className="bg-[#06141B] rounded-lg p-2 flex justify-between gap-2">
                        <span className="capitalize text-white/85">{formatarChave(nome)}</span>
                        <span className="font-bold text-[#F6C453]">{valor}</span>
                      </div>
                    ))}
                </div>
              </section>

              {/* Habilidades */}
              <section className="bg-[#253745] rounded-xl p-4">
                <h4 className="text-lg font-bold text-[#F6C453] mb-3">
                  Habilidades
                </h4>

                <div className="flex flex-col gap-3">
                  {Object.entries(jogadorSelecionado.habilidades).map(([nome, habilidade]) => (
                    <div key={nome} className="bg-[#06141B] rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-bold text-white">{nome}</span>
                        <span className="text-sm text-[#F6C453] whitespace-nowrap">
                          Custo: {(habilidade as Habilidade).custo}
                        </span>
                      </div>

                      <p className="text-sm text-white/75 mt-2">
                        {(habilidade as Habilidade).descricao}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </aside>
      </section>

      {/* LISTA HORIZONTAL INFERIOR COM TODOS OS JOGADORES */}
      <footer className="border-t border-white/10 bg-[#0B202B] p-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-lg font-bold text-[#F6C453]">
            Todos os jogadores
          </h2>

          <p className="text-sm text-white/70">
            Clique para selecionar. Com o campo destravado, você também pode arrastar as camisas.
          </p>
        </div>

        {/* A lista é horizontal e com scroll, para caberem muitos jogadores sem quebrar a tela. */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {todosJogadores.map((jogador) => {
            const estaAtivo = posicoes[jogador.id]?.onField;
            const melhorPericia = pegarMelhorPericia(jogador);

            return (
              <button
                key={jogador.id}
                onClick={() => setJogadorSelecionadoId(jogador.id)}
                className={`min-w-40 flex-shrink-0 rounded-xl p-3 border transition text-left ${
                  jogadorSelecionadoId === jogador.id
                    ? "bg-[#F6C453] text-black border-white"
                    : "bg-[#253745] text-white border-white/10 hover:bg-[#32485A]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Mini camisa da lista inferior */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border-2 ${
                    estaAtivo ? "bg-green-600 border-green-300" : "bg-[#06141B] border-white/20"
                  }`}>
                    {jogador.nome
                      .split(" ")
                      .map((parte) => parte[0])
                      .slice(0, 2)
                      .join("")}
                  </div>

                  <div>
                    <p className="font-semibold leading-tight">
                      {jogador.nome}
                    </p>

                    <p className="text-xs opacity-80">
                      {estaAtivo ? "Em campo" : "No banco"}
                    </p>
                  </div>
                </div>

                {/* Informações curtas que ajudam a bater o olho sem abrir a ficha completa */}
                <div className="mt-3 text-xs opacity-90 flex flex-col gap-1">
                  <span>
                    Fôlego: {jogador.folego.atual} / {jogador.folego.total}
                  </span>

                  <span>
                    Melhor perícia: {melhorPericia ? `${formatarChave(melhorPericia[0])} (${melhorPericia[1]})` : "Sem perícias"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </footer>
    </main>
  );
}
