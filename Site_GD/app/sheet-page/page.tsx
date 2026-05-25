import PlayerCard from "@/components/playercard";
import fichas from "../data/fichas.json";

export default function SheetPage() {
  return (
    <main className="min-h-screen bg-blue-950 p-8">
      <h1 className="text-4xl text-yellow-500 font-bold mb-8 text-center">
        Fichas dos Jogadores
      </h1>

      <div className="flex flex-col gap-4 max-w-4xl mx-auto bg-blue-950 rounded-lg p-6 shadow-lg border-2 border-yellow-500">
        {Object.values(fichas).map((jogador) => (
          <PlayerCard
            key={jogador.id}
            jogador={jogador}
          />
        ))}
      </div>
    </main>
  );
}

/*
export default function SheetPage() {
  return (
    <div className="min-h-screen bg-blue-900 text-yellow-500 flex flex-col items-center justify-start gap-6 p-6">
      <h1 className="text-4xl font-bold mt-6">
        Fichas dos Jogadores
      </h1>

      <div className="w-full max-w-3xl flex flex-col gap-4">
        {fichas.map((jogador, index) => (
          <Link
            key={index}
            href={`/sheet-page/${index}`}
            className="bg-yellow-500 text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-100 transition text-center hover:bg-yellow-100 hover:scale-105 transition"
          >
            {jogador.nome}
          </Link>
        ))}
      </div>
    </div>
  );
}
*/