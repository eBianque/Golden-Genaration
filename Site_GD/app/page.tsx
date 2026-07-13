import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-blue-900 text-yellow-500 flex flex-col items-center justify-center gap-6">
      <h1 className="text-5xl font-bold">
        Geração Dourada
      </h1>

      <p className="text-lg text-yellow-500">
        Sistema de facilitação da vida do querido mestre
      </p>

      <nav className="flex flex-col gap-4 mt-6">
        <Link
          href="/sheet-page"
          className="bg-yellow-500 text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-100 transition text-center hover:bg-yellow-100 hover:scale-105 transition"
        >
          Fichas
        </Link>

        <Link
          href="/history-page"
          className="bg-yellow-500 text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-100 transition text-center hover:bg-yellow-100 hover:scale-105 transition"
        >
          História
        </Link>

        <Link
          href="/news-page"
          className="bg-yellow-500 text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-100 transition text-center hover:bg-yellow-100 hover:scale-105 transition"
        >
          Notícias
        </Link>

        <Link
          href="/gm-page2"
          className="bg-yellow-500 text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-yellow-100 transition text-center hover:bg-yellow-100 hover:scale-105 transition"
        >
          Escudo do Mestre
        </Link>
      </nav>
    </main>
  );
}