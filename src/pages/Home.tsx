import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useNavigate } from "react-router";

const games = [
  {
    name: "Tic Tac Toe",
    description: "Classic X vs O. Quick matches, instant bragging rights.",
    status: "Playable",
    pathName: "/"
  },
  {
    name: "Bingo",
    description: "Luck, chaos, and shouting BINGO at the wrong time.",
    status: "Playable",
    pathName: "/lobby"
  }
]

export default function Home() {
    const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-yellow-300 p-6">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-10">
        <div className="neo bg-white p-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            🎮 Game Night Hub
          </h1>
          <p className="mt-2 text-lg font-medium">
            Play dumb games. Win dumb prizes. With friends.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {games.map((game) => (
            <Card
              key={game.name}
              className="bg-white"
            >
              <CardHeader>
                <CardTitle className="text-2xl font-extrabold">
                  {game.name}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="font-medium text-sm">
                  {game.description}
                </p>

                <div className="flex items-center justify-between">
                  <Badge
                    className={`neo ${
                      game.status === "Playable"
                        ? "bg-green-400"
                        : "bg-orange-300"
                    } text-black`}
                  >
                    {game.status}
                  </Badge>

                  <Button
                    onClick={() => navigate(game.pathName)}
                    disabled={game.status !== "Playable"}
                    className=" bg-blue-400 text-black font-bold"
                  >
                    {game.status === "Playable" ? "Play Now" : "Locked"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto mt-12">
        <div className="neo bg-white p-4 text-center font-bold">
          Built for friends. No leaderboards. No mercy.
        </div>
      </footer>
    </div>
  )
}
