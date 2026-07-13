"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import fichas from "../data/fichas.json";

/**
 * Tipos base da ficha.
 * Se o seu JSON tiver campos extras, você pode ampliar depois.
 */
type Habilidade = {
  descricao: string;
  custo: number;
};

type JogadorFicha = {
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

/**
 * Objeto que existe só durante a partida.
 * É ele que aparece no campo, no painel lateral e na lógica da mestragem.
 */
type JogadorPartida = {
  idInstancia: string;
  fichaId: string;
  nome: string;
  numeroCamisa: string;
  corTime: string;
  atributos: Record<string, number>;
  pericias: Record<string, number>;
  habilidades: Record<string, Habilidade>;
  folego: {
    total: number;
    atual: number;
  };
};

type PosicaoCampo = {
  x: number;
  y: number;
  onField: boolean;
};

type JogadorFichaJSON = Omit<JogadorFicha, "habilidades"> & {
  habilidades: Array<Record<string, Habilidade>> | Record<string, Habilidade>;
};

function normalizarHabilidades(
  habilidades: Array<Record<string, Habilidade>> | Record<string, Habilidade>
): Record<string, Habilidade> {
  if (Array.isArray(habilidades)) {
    return habilidades.reduce(
      (acumulador, habilidade) => ({ ...acumulador, ...habilidade }),
      {} as Record<string, Habilidade>
    );
  }

  return habilidades;
}

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

/**
 * Se o JSON vier como objeto, Object.values resolve.
 * Se ele já vier como array, você pode trocar essa linha depois.
 */
const fichasImport = fichas as Array<JogadorFichaJSON> | Record<string, JogadorFichaJSON>;

const fichasBase: JogadorFicha[] = (
  Array.isArray(fichasImport) ? fichasImport : Object.values(fichasImport)
).map((item) => ({
  ...item,
  habilidades: normalizarHabilidades(item.habilidades),
}));

// States for players in match and UI
const [jogadoresPartidaGlobalPlaceholder] = [null];

function formatarChave(chave: string) {
  return chave.replaceAll("_", " ").replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function limitarPorcentagem(valor: number) {
  return Math.max(4, Math.min(96, valor));
}

function pegarMelhorPericia(jogador: JogadorFicha | JogadorPartida) {
  const entradas = Object.entries(jogador.pericias);

  if (entradas.length === 0) return null;

  return entradas.reduce((melhor, atual) => {
    return Number(atual[1]) > Number(melhor[1]) ? atual : melhor;
  });
}

function calcularPercentualFolego(folegoAtual: number, folegoTotal: number) {
  if (folegoTotal <= 0) return 0;
  return Math.max(0, Math.min(100, (folegoAtual / folegoTotal) * 100));
}

function getBarColor(percentual: number) {
  if (percentual > 66) return "bg-green-500";
  if (percentual > 33) return "bg-yellow-400";
  return "bg-red-500";
}

function criarPosicoesIniciais(jogadores: JogadorPartida[]): Record<string, PosicaoCampo> {
  const posicoes: Record<string, PosicaoCampo> = {};

  jogadores.forEach((jogador) => {
    posicoes[jogador.idInstancia] = {
      x: 50,
      y: 92,
      onField: false,
    };
  });

  return posicoes;
}

export default function MestragemPage() {
  /**
   * Jogadores criados para a partida.
   * Esses são os objetos que aparecem no campo.
   */
  const [jogadoresPartida, setJogadoresPartida] = useState<JogadorPartida[]>([]);

  /**
   * Posicionamento dos objetos da partida.
   * A chave é idInstancia, não id da ficha.
   */
  const [posicoes, setPosicoes] = useState<Record<string, PosicaoCampo>>({});

  /**
   * Se o campo está travado ou destravado.
   * Travado = não move.
   * Destravado = permite mover e reposicionar.
   */
  const [travado, setTravado] = useState(true);

  /**
   * Formação atual.
   */
  const [formacao, setFormacao] = useState<keyof typeof FORMACOES>("4-3-3");

  /**
   * Jogador selecionado no painel lateral.
   */
  const [jogadorSelecionadoId, setJogadorSelecionadoId] = useState<string | null>(null);

  /**
   * Jogador que está sob hover.
   */
  const [jogadorHoverId, setJogadorHoverId] = useState<string | null>(null);

  /**
   * Arraste.
   */
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);

  /**
   * Modal para criar jogador.
   */
  const [modalCriarJogador, setModalCriarJogador] = useState(false);

  const [abaFolegoAberta, setAbaFolegoAberta] =
  useState(true);

  const [valorFolego, setValorFolego] =
  useState("1");

  /**
   * Dados do formulário de criação.
   */
  const [novoNome, setNovoNome] = useState("");
  const [novoNumero, setNovoNumero] = useState("");
  const [modeloBaseId, setModeloBaseId] = useState("");
  const [corTime, setCorTime] = useState("#2563eb");

  /**
   * Opções de cópia da ficha base.
   */
  const [copiarAtributos, setCopiarAtributos] = useState(true);
  const [copiarPericias, setCopiarPericias] = useState(true);
  const [copiarHabilidades, setCopiarHabilidades] = useState(true);
  const [copiarFolego, setCopiarFolego] = useState(true);

  /**
   * Referência do campo para drag and drop.
   */
  const campoRef = useRef<HTMLDivElement | null>(null);

  /**
   * Jogador selecionado.
   */
  const jogadorSelecionado = useMemo(
    () => jogadoresPartida.find((j) => j.idInstancia === jogadorSelecionadoId) ?? null,
    [jogadoresPartida, jogadorSelecionadoId]
  );

  const jogadoresEmCampo = jogadoresPartida.filter(
    (jogador) => posicoes[jogador.idInstancia]?.onField
  );

  function alterarFolego(
    idJogador: string,
    quantidade: number
  ) {
    setJogadoresPartida((estadoAtual) =>
      estadoAtual.map((jogador) => {
        if (jogador.idInstancia !== idJogador) {
          return jogador;
        }

        return {
          ...jogador,
          folego: {
            ...jogador.folego,
            atual: Math.max(
              0,
              Math.min(
                jogador.folego.total,
                jogador.folego.atual + quantidade
              )
            ),
          },
        };
      })
    );
  }

  function corFolego(
    atual: number,
    total: number
  ) {
    const percentual =
      (atual / total) * 100;

    if (percentual > 66)
      return "bg-green-500";

    if (percentual > 33)
      return "bg-yellow-400";

    return "bg-red-500";
  }

  /**
   * Cria um jogador da partida a partir de uma ficha base.
   * Esse jogador é temporário, ou seja, só vive enquanto a partida existir.
   */
  function criarJogador() {
    if (!novoNome.trim()) return;
    if (!novoNumero.trim()) return;

    const modelo = fichasBase.find((jogador) => jogador.id === modeloBaseId);

    const novoJogador: JogadorPartida = {
      idInstancia: crypto.randomUUID(),
      fichaId: modelo?.id ?? crypto.randomUUID(),
      nome: novoNome.trim(),
      numeroCamisa: novoNumero.trim(),
      corTime,
      atributos: copiarAtributos && modelo ? structuredClone(modelo.atributos) : {},
      pericias: copiarPericias && modelo ? structuredClone(modelo.pericias) : {},
      habilidades: copiarHabilidades && modelo ? structuredClone(modelo.habilidades) : {},
      folego: copiarFolego && modelo
        ? structuredClone(modelo.folego)
        : { total: 20, atual: 20 },
    };

    setJogadoresPartida((estadoAtual) => [
   ...estadoAtual,
  novoJogador,
]);

    setPosicoes((estadoAtual) => ({
      ...estadoAtual,
      [novoJogador.idInstancia]: {
        x: 50,
        y: 50,
        onField: true,
      },
    }));

    setJogadorSelecionadoId(novoJogador.idInstancia);
    setModalCriarJogador(false);

    setNovoNome("");
    setNovoNumero("");
    setModeloBaseId("");
    setCorTime("#2563eb");
  }

  /**
   * Aplica a formação aos jogadores já criados.
   * Aqui usamos a ordem dos jogadores criados na partida.
   */
  function aplicarFormacao() {
    const slots = FORMACOES[formacao].slots;

    setPosicoes((estadoAtual) => {
      const novoEstado = { ...estadoAtual };

      jogadoresPartida.forEach((jogador, indice) => {
        const slot = slots[indice];

        if (slot) {
          novoEstado[jogador.idInstancia] = {
            x: slot.x,
            y: slot.y,
            onField: true,
          };
        } else {
          novoEstado[jogador.idInstancia] = {
            x: 50,
            y: 92,
            onField: false,
          };
        }
      });

      return novoEstado;
    });
  }

  /**
   * Alterna se o jogador está no campo.
   */
  function alternarCampo(idInstancia: string) {
    setPosicoes((estadoAtual) => ({
      ...estadoAtual,
      [idInstancia]: {
        ...estadoAtual[idInstancia],
        onField: !estadoAtual[idInstancia]?.onField,
      },
    }));
  }

  /**
   * Move o jogador selecionado em pequenos passos.
   */
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

  /**
   * Inicia arraste.
   */
  function iniciarArraste(idInstancia: string) {
    if (travado) return;
    setArrastandoId(idInstancia);
    setJogadorSelecionadoId(idInstancia);
  }

  /**
   * Drag and drop no campo.
   */
  useEffect(() => {
    function moverNoCampo(event: PointerEvent) {
      if (!arrastandoId) return;
      if (travado) return;
      if (!campoRef.current) return;

      const retangulo = campoRef.current.getBoundingClientRect();
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

    window.addEventListener("pointermove", moverNoCampo);
    window.addEventListener("pointerup", pararArraste);

    return () => {
      window.removeEventListener("pointermove", moverNoCampo);
      window.removeEventListener("pointerup", pararArraste);
    };
  }, [arrastandoId, travado]);

  return (
    <main className="min-h-screen bg-[#06141B] text-white flex flex-col">
      <header className="px-6 py-4 border-b border-white/10 bg-[#0B202B] flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#F6C453]">
            Mestragem
          </h1>
          <p className="text-sm text-white/70">
            Crie jogadores, mova no campo, selecione por ficha e ajuste o fôlego.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2 bg-[#11212D] px-3 py-2 rounded-lg border border-white/10">
            <span className="text-sm text-white/70">Formação</span>
            <select
              value={formacao}
              onChange={(e) => setFormacao(e.target.value as keyof typeof FORMACOES)}
              className="bg-transparent outline-none text-white"
            >
              {Object.keys(FORMACOES).map((nomeFormacao) => (
                <option key={nomeFormacao} value={nomeFormacao} className="text-black">
                  {nomeFormacao}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={aplicarFormacao}
            className="bg-green-600 hover:bg-green-500 transition px-4 py-2 rounded-lg font-semibold"
          >
            Aplicar formação
          </button>

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

          <button
            onClick={() => setModalCriarJogador(true)}
            className="bg-[#F6C453] text-black px-4 py-2 rounded-lg font-semibold hover:scale-105 transition"
          >
            + Criar Jogador
          </button>
        </div>
      </header>

      <section className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_360px]">
        <div className="p-4 sm:p-6 flex flex-col gap-4">
          <div className="bg-[#11212D] border border-white/10 rounded-xl p-4 text-sm text-white/75">
            <p>
              <strong className="text-[#F6C453]">Modo de uso:</strong> crie o jogador, ele entra no campo e na lista lateral de fôlego. Com o campo destravado, você pode arrastar. Com o campo travado, você só seleciona e consulta.
            </p>
          </div>

          <div
            ref={campoRef}
            className="relative w-full max-w-6xl mx-auto aspect-[16/9] rounded-3xl overflow-hidden border-8 border-[#0A3320] bg-green-700 shadow-2xl select-none"
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_50%,transparent_50%)] bg-[length:80px_100%]" />
            <div className="absolute left-1/2 top-0 bottom-0 w-[3px] bg-white/80 -translate-x-1/2" />
            <div className="absolute left-1/2 top-1/2 w-44 h-44 border-[3px] border-white/80 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute left-0 top-1/2 w-20 h-44 border-[3px] border-white/80 -translate-y-1/2" />
            <div className="absolute right-0 top-1/2 w-20 h-44 border-[3px] border-white/80 -translate-y-1/2" />

            <div className="absolute top-4 left-4 bg-black/30 px-3 py-1 rounded-full text-sm">
              Campo tático
            </div>

            {jogadoresPartida
              .filter((jogador) => posicoes[jogador.idInstancia]?.onField)
              .map((jogador) => {
                const posicao = posicoes[jogador.idInstancia];
                const percentual = calcularPercentualFolego(jogador.folego.atual, jogador.folego.total);
                const corBarra = getBarColor(percentual);
                const estaHover = jogadorHoverId === jogador.idInstancia;
                const estaSelecionado = jogadorSelecionadoId === jogador.idInstancia;

                return (
                  <div
                    key={jogador.idInstancia}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${posicao.x}%`, top: `${posicao.y}%` }}
                  >
                    <button
                      onClick={() => setJogadorSelecionadoId(jogador.idInstancia)}
                      onMouseEnter={() => setJogadorHoverId(jogador.idInstancia)}
                      onMouseLeave={() => setJogadorHoverId((estado) => (estado === jogador.idInstancia ? null : estado))}
                      onPointerDown={() => iniciarArraste(jogador.idInstancia)}
                      className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center font-bold shadow-lg transition-transform active:scale-95 ${
                        estaSelecionado
                          ? "bg-[#F6C453] text-black border-white scale-110"
                          : "text-white border-[#F6C453] hover:scale-110"
                      } ${travado ? "cursor-pointer" : "cursor-grab"}`}
                      style={{ backgroundColor: jogador.corTime }}
                      title="Clique para selecionar. Destravado: arraste para reposicionar."
                    >
                      {jogador.numeroCamisa}
                    </button>

                    <p className="mt-2 text-center text-xs sm:text-sm font-semibold bg-black/35 px-2 py-1 rounded-md whitespace-nowrap">
                      {jogador.nome}
                    </p>

                    {estaHover && (
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-20 w-64 bg-[#0B202B] border border-white/10 rounded-xl p-3 shadow-xl">
                        <p className="font-bold text-[#F6C453]">
                          {jogador.nome}
                        </p>

                        <p className="text-sm text-white/75 mt-1">
                          Camisa: {jogador.numeroCamisa}
                        </p>

                        <p className="text-sm text-white/75">
                          Fôlego: {jogador.folego.atual} / {jogador.folego.total}
                        </p>

                        <div className="w-full bg-[#06141B] rounded-full h-3 overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${corBarra}`}
                            style={{ width: `${percentual}%` }}
                          />
                        </div>

                        <p className="text-sm text-white/75 mt-2">
                          Estado: {posicoes[jogador.idInstancia]?.onField ? "Em campo" : "No banco"}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        <aside className="border-t xl:border-t-0 xl:border-l border-white/10 bg-[#11212D] p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            <h2 className="text-2xl font-bold text-[#F6C453]">
              Ficha completa
            </h2>
            <p className="text-sm text-white/70">
              Clique em um objeto no campo ou na lista inferior.
            </p>
          </div>

          {!jogadorSelecionado ? (
            <div className="bg-[#253745] rounded-xl p-4 text-white/75">
              Selecione um jogador no campo ou na lista inferior.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="bg-[#253745] rounded-xl p-4">
                <h3 className="text-2xl font-bold text-white">
                  {jogadorSelecionado.nome}
                </h3>

                <p className="text-sm text-white/70 mt-1">
                  Camisa {jogadorSelecionado.numeroCamisa}
                </p>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-black/30 text-sm">
                    {posicoes[jogadorSelecionado.idInstancia]?.onField ? "Em campo" : "No banco"}
                  </span>

                  <span className="px-3 py-1 rounded-full bg-black/30 text-sm">
                    {formatarChave(formacao)}
                  </span>
                </div>
              </div>

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

              <section className="bg-[#253745] rounded-xl p-4 flex flex-col gap-3">
                <h4 className="text-lg font-bold text-[#F6C453]">
                  Controle do jogador
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => alternarCampo(jogadorSelecionado.idInstancia)}
                    className="bg-green-600 hover:bg-green-500 transition rounded-lg py-2 font-semibold"
                  >
                    {posicoes[jogadorSelecionado.idInstancia]?.onField ? "Tirar de campo" : "Colocar em campo"}
                  </button>

                  <button
                    onClick={() => setJogadorSelecionadoId(null)}
                    className="bg-white text-black hover:bg-gray-200 transition rounded-lg py-2 font-semibold"
                  >
                    Desselecionar
                  </button>
                </div>

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

                <section className="bg-[#06141B] rounded-xl p-4">
                  <h4 className="text-lg font-bold text-[#F6C453] mb-3">
                    Atributos
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(jogadorSelecionado.atributos).map(([nome, valor]) => (
                      <div key={nome} className="bg-[#253745] rounded-lg p-2 flex justify-between gap-2">
                        <span className="capitalize text-white/85">{formatarChave(nome)}</span>
                        <span className="font-bold text-[#F6C453]">{valor}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-[#06141B] rounded-xl p-4">
                  <h4 className="text-lg font-bold text-[#F6C453] mb-3">
                    Perícias
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(jogadorSelecionado.pericias)
                      .filter(([_, valor]) => Number(valor) > 0)
                      .map(([nome, valor]) => (
                        <div key={nome} className="bg-[#253745] rounded-lg p-2 flex justify-between gap-2">
                          <span className="capitalize text-white/85">{formatarChave(nome)}</span>
                          <span className="font-bold text-[#F6C453]">{valor}</span>
                        </div>
                      ))}
                  </div>
                </section>

                <section className="bg-[#06141B] rounded-xl p-4">
                  <h4 className="text-lg font-bold text-[#F6C453] mb-3">
                    Habilidades
                  </h4>

                  <div className="flex flex-col gap-3">
                    {Object.entries(jogadorSelecionado.habilidades).map(([nome, habilidade]) => (
                      <div key={nome} className="bg-[#253745] rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-bold text-white">{nome}</span>
                          <span className="text-sm text-[#F6C453] whitespace-nowrap">
                            Custo: {habilidade.custo}
                          </span>
                        </div>

                        <p className="text-sm text-white/75 mt-2">
                          {habilidade.descricao}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </section>
            </div>
          )}
        </aside>
      </section>

      <footer className="border-t border-white/10 bg-[#0B202B] p-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-lg font-bold text-[#F6C453]">
            Todos os jogadores da partida
          </h2>

          <p className="text-sm text-white/70">
            Clique para selecionar. Cada objeto criado aqui é temporário e some quando a partida acaba.
          </p>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {jogadoresPartida.map((jogador) => {
            const estaAtivo = posicoes[jogador.idInstancia]?.onField;
            const percentual = calcularPercentualFolego(jogador.folego.atual, jogador.folego.total);
            const corBarra = getBarColor(percentual);

            return (
              <button
                key={jogador.idInstancia}
                onClick={() => setJogadorSelecionadoId(jogador.idInstancia)}
                className={`min-w-44 flex-shrink-0 rounded-xl p-3 border transition text-left ${
                  jogadorSelecionadoId === jogador.idInstancia
                    ? "bg-[#F6C453] text-black border-white"
                    : "bg-[#253745] text-white border-white/10 hover:bg-[#32485A]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold border-2 text-white"
                    style={{ backgroundColor: jogador.corTime }}
                  >
                    {jogador.numeroCamisa}
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

                <div className="mt-3 text-xs opacity-90 flex flex-col gap-1">
                  <span>
                    Fôlego: {jogador.folego.atual} / {jogador.folego.total}
                  </span>

                  <div className="w-full bg-[#06141B] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${corBarra}`}
                      style={{ width: `${percentual}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </footer>

      <aside
        className={`
          fixed
          right-0
          top-0
          h-screen
          bg-[#11212D]
          border-l
          border-white/10
          z-50
          transition-all
          duration-300
          relative
          overflow-hidden
          ${abaFolegoAberta ? "w-[320px]" : "w-[50px]"}
        `}
      >
        <button
          type="button"
          onClick={() => setAbaFolegoAberta((estadoAnterior) => !estadoAnterior)}
          className="absolute left-2 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#253745] text-sm text-white shadow-lg transition hover:bg-[#2f4558]"
          aria-label={abaFolegoAberta ? "Recolher aba de fôlego" : "Expandir aba de fôlego"}
        >
          {abaFolegoAberta ? "←" : "→"}
        </button>

        {abaFolegoAberta && (
          <div className="p-3 flex flex-col gap-4 overflow-y-auto h-[90vh] pt-12">
            <h2 className="text-xl font-bold text-[#F6C453]">Fôlego</h2>

            {jogadoresEmCampo.length === 0 ? (
              <p className="text-white/70">Nenhum jogador em campo.</p>
            ) : (
              jogadoresEmCampo.map((jogador) => {
                const percentual = calcularPercentualFolego(
                  jogador.folego.atual,
                  jogador.folego.total
                );

                return (
                  <div key={jogador.idInstancia} className="bg-[#253745] rounded-xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-white">{jogador.nome}</p>
                        <p className="text-sm text-white/70">Camisa {jogador.numeroCamisa}</p>
                      </div>

                      <span className="px-2 py-1 rounded-full bg-black/30 text-sm">
                        {posicoes[jogador.idInstancia]?.onField ? "Em campo" : "No banco"}
                      </span>
                    </div>

                    <p className="text-sm text-white/75 mt-3">
                      {jogador.folego.atual} / {jogador.folego.total}
                    </p>

                    <div className="w-full h-3 bg-black/30 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full ${corFolego(
                          jogador.folego.atual,
                          jogador.folego.total
                        )}`}
                        style={{ width: `${percentual}%` }}
                      />
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() =>
                          alterarFolego(
                            jogador.idInstancia,
                            -Number(valorFolego)
                          )
                        }
                        className="flex-1 bg-red-600 rounded py-2"
                      >
                        -
                      </button>

                      <button
                        onClick={() =>
                          alterarFolego(
                            jogador.idInstancia,
                            Number(valorFolego)
                          )
                        }
                        className="flex-1 bg-green-600 rounded py-2"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            <input
              type="number"
              value={valorFolego}
              onChange={(e) => setValorFolego(e.target.value)}
              className="w-full mt-2 rounded bg-black/30 p-2 text-center text-white"
            />
          </div>
        )}
      </aside>
      {modalCriarJogador && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
          <div className="bg-[#11212D] rounded-2xl p-6 w-[500px] max-w-[90vw] flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-[#F6C453]">Criar Jogador</h2>

            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome"
              className="bg-[#253745] rounded-lg p-3 outline-none text-white"
            />

            <input
              value={novoNumero}
              onChange={(e) => setNovoNumero(e.target.value)}
              placeholder="Número da camisa"
              className="bg-[#253745] rounded-lg p-3 outline-none text-white"
            />

            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/70">Modelo base</span>
              <select
                value={modeloBaseId}
                onChange={(e) => setModeloBaseId(e.target.value)}
                className="bg-[#253745] rounded-lg p-3 outline-none text-white"
              >
                <option value="">Sem modelo</option>
                {fichasBase.map((jogador) => (
                  <option key={jogador.id} value={jogador.id}>
                    {jogador.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/70">Cor do time</span>
              <input
                type="color"
                value={corTime}
                onChange={(e) => setCorTime(e.target.value)}
                className="w-full h-12 rounded-lg bg-[#253745] p-2"
              />
            </label>

            <label className="flex gap-2 text-white">
              <input
                type="checkbox"
                checked={copiarAtributos}
                onChange={(e) => setCopiarAtributos(e.target.checked)}
              />
              Copiar atributos
            </label>

            <label className="flex gap-2 text-white">
              <input
                type="checkbox"
                checked={copiarPericias}
                onChange={(e) => setCopiarPericias(e.target.checked)}
              />
              Copiar perícias
            </label>

            <label className="flex gap-2 text-white">
              <input
                type="checkbox"
                checked={copiarHabilidades}
                onChange={(e) => setCopiarHabilidades(e.target.checked)}
              />
              Copiar habilidades
            </label>

            <label className="flex gap-2 text-white">
              <input
                type="checkbox"
                checked={copiarFolego}
                onChange={(e) => setCopiarFolego(e.target.checked)}
              />
              Copiar fôlego
            </label>

            <div className="flex gap-3">
              <button
                onClick={criarJogador}
                className="flex-1 bg-green-600 rounded-lg py-3 font-bold"
              >
                Criar
              </button>

              <button
                onClick={() => setModalCriarJogador(false)}
                className="flex-1 bg-red-600 rounded-lg py-3 font-bold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}