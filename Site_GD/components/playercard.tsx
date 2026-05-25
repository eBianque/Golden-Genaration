"use client";

import { useState } from "react";

type PlayerCardProps = {
  jogador: any;
};

export default function PlayerCard({ jogador }: PlayerCardProps) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="bg-blue-900 border-2 border-yellow-500 rounded-xl p-1 shadow-lg">
      
      {/* CABEÇALHO */}
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between"
      >
        <div className="text-left">
          <h3 className="text-1xl font-bold text-yellow-400">
            {jogador.nome}
          </h3>

          <p className="text-blue-200">
            {jogador.posicao}
          </p>
        </div>

        <span className="text-3xl text-yellow-400">
          {aberto ? "▼" : "▶"}
        </span>
      </button>

      {/* CONTEÚDO EXPANSÍVEL */}
      {aberto && (
        <div className="mt-6 flex flex-col gap-3 bg-blue-950 rounded-lg p-4">

          {/* FÔLEGO */}
          <section className="bg-blue-950 rounded-lg p-4">
            <h5 className="text-xl font-bold text-yellow-400 mb-2">
              Fôlego
            </h5>

            <p className="text-white">
              {jogador.folego.atual} / {jogador.folego.total}
            </p>
          </section>

          {/* ATRIBUTOS */}
          <section className="bg-blue-950 rounded-lg p-4">
            <h5 className="text-xl font-bold text-yellow-400 mb-4">
              Atributos
            </h5>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(jogador.atributos).map(([nome, valor]) => (
                <div
                  key={nome}
                  className="bg-blue-800 rounded-md p-2 flex justify-between"
                >
                  <span className="capitalize text-white">
                    {nome}
                  </span>

                  <span className="font-bold text-yellow-300">
                    {String(valor)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* PERÍCIAS */}
          <section className="bg-blue-950 rounded-lg p-4">
            <h5 className="text-xl font-bold text-yellow-400 mb-4">
              Perícias
            </h5>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(jogador.pericias)
                .map(([nome, valor]) => (
                  <div
                    key={nome}
                    className="bg-blue-800 rounded-md p-2 flex justify-between"
                  >
                    <span className="capitalize text-white">
                      {nome}
                    </span>

                    <span className="font-bold text-yellow-300">
                      {String(valor)}
                    </span>
                  </div>
                ))}
            </div>
          </section>

          {/* HABILIDADES */}
          <section className="bg-blue-950 rounded-lg p-4">
            <h5 className="text-xl font-bold text-yellow-400 mb-4">
              Habilidades
            </h5>

            <div className="flex flex-col gap-4">
              {Object.entries(jogador.habilidades).map(
                ([nome, habilidade]) => (
                  <div
                    key={nome}
                    className="bg-blue-800 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-bold text-yellow-300">
                        {nome}
                      </h4>

                      <span className="text-sm text-white">
                        Custo: {(habilidade as any).custo}
                      </span>
                    </div>

                    <p className="text-blue-100">
                      {(habilidade as any).descricao}
                    </p>
                  </div>
                )
              )}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}