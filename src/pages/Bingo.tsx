import { ref, onValue, update } from "firebase/database"
import { rtdb } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import { useParams } from "react-router"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

const LINES = [
  { id: "row-1", label: "Row 1", indexes: [0,1,2,3,4] },
  { id: "row-2", label: "Row 2", indexes: [5,6,7,8,9] },
  { id: "row-3", label: "Row 3", indexes: [10,11,12,13,14] },
  { id: "row-4", label: "Row 4", indexes: [15,16,17,18,19] },
  { id: "row-5", label: "Row 5", indexes: [20,21,22,23,24] },

  { id: "col-1", label: "Column 1", indexes: [0,5,10,15,20] },
  { id: "col-2", label: "Column 2", indexes: [1,6,11,16,21] },
  { id: "col-3", label: "Column 3", indexes: [2,7,12,17,22] },
  { id: "col-4", label: "Column 4", indexes: [3,8,13,18,23] },
  { id: "col-5", label: "Column 5", indexes: [4,9,14,19,24] },

  { id: "diag-1", label: "Diagonal ↘", indexes: [0,6,12,18,24] },
  { id: "diag-2", label: "Diagonal ↙", indexes: [4,8,12,16,20] },
]

export default function Bingo() {
  const { roomId } = useParams()
  const { user } = useAuth()

  const [room, setRoom] = useState<any>(null)
  const [myPlayer, setMyPlayer] = useState<any>(null)
  const [lastCompletedLine, setLastCompletedLine] = useState<string | null>(null)

  /* ---------------- RTDB SYNC (ALWAYS RUNS) ---------------- */

  useEffect(() => {
    if (!roomId || !user) return

    const roomRef = ref(rtdb, `rooms/${roomId}`)
    return onValue(roomRef, (snap) => {
      const data = snap.val()
      setRoom(data)
      setMyPlayer(data?.players?.[user.uid] ?? null)
    })
  }, [roomId, user])

  /* ---------------- AUTO MARK (ALWAYS DECLARED) ---------------- */

  useEffect(() => {
    if (!room || !myPlayer || !room.lastCalledNumber) return

    const completedLines: string[] = myPlayer.completedLines || []
    const board = myPlayer.board || []

    const index = board.findIndex(
      (c: any) => c.number === room.lastCalledNumber
    )

    if (index === -1 || board[index].marked) return

    const updatedBoard = [...board]
    updatedBoard[index] = { ...updatedBoard[index], marked: true }

    const newlyCompleted = LINES.filter(
      (line) =>
        !completedLines.includes(line.id) &&
        line.indexes.every((i) => updatedBoard[i].marked)
    )

    if (newlyCompleted.length > 0) {
      setLastCompletedLine(newlyCompleted[0].label)
    }

    const updatedLines = [
      ...completedLines,
      ...newlyCompleted.map((l) => l.id),
    ]

    update(ref(rtdb, `rooms/${roomId}/players/${user!.uid}`), {
      board: updatedBoard,
      completedLines: updatedLines,
      bingoCount: updatedLines.length,
    })
  }, [room?.lastCalledNumber, room, myPlayer, roomId, user])

  /* ---------------- SAFE DERIVED STATE ---------------- */

  const completedLines: string[] = myPlayer?.completedLines || []
  const board = myPlayer?.board || []
  const hasWon = (myPlayer?.bingoCount || 0) >= 5
  const isMyTurn =
    room?.turnOrder?.[room?.currentTurnIndex] === user?.uid

    const currentPlayerId = room.turnOrder[room.currentTurnIndex]
    const currentPlayerName = room.players[currentPlayerId]?.name || "Player"


  const isWinningCell = (index: number) =>
    LINES.some(
      (line) =>
        completedLines.includes(line.id) &&
        line.indexes.includes(index)
    )

  const callNumber = async () => {
    if (!room || !isMyTurn || hasWon) return

    const available = Array.from({ length: 25 }, (_, i) => i + 1).filter(
      (n) => !room.drawnNumbers.includes(n)
    )

    if (!available.length) return

    const number =
      available[Math.floor(Math.random() * available.length)]

    await update(ref(rtdb, `rooms/${roomId}`), {
      lastCalledNumber: number,
      drawnNumbers: [...room.drawnNumbers, number],
      currentTurnIndex:
        (room.currentTurnIndex + 1) % room.turnOrder.length,
    })
  }

  /* ---------------- UI ---------------- */

  if (!room || !myPlayer) {
    return (
      <div className="min-h-screen bg-yellow-300 flex items-center justify-center font-black">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-yellow-300 p-10">
      <div className="max-w-xl mx-auto space-y-6">

        {hasWon && (
          <div className="neo bg-green-400 p-4 text-center font-black animate-pop">
            🎉 YOU COMPLETED BINGO!
          </div>
        )}

        {lastCompletedLine && (
          <div className="neo bg-green-300 p-3 text-center font-black animate-pop">
            🎯 Completed: {lastCompletedLine}
          </div>
        )}

        {isMyTurn ? (
          <Button onClick={callNumber} className="neo w-full bg-blue-400 font-black">
            Call Number
          </Button>
        ) : (
          <div className="font-bold text-center">
               Waiting for {currentPlayerName}…
        </div>

        )}

        <div className="flex justify-center gap-2">
          {"BINGO".split("").map((l, i) => (
            <div
              key={l}
              className={`neo w-12 h-12 flex items-center justify-center font-black
                ${myPlayer.bingoCount > i ? "bg-green-400" : "bg-white"}
              `}
            >
              {l}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-2">
          {board.map((cell: any, i: number) => (
            <div
              key={i}
              className={`aspect-square neo flex items-center justify-center font-black
                ${
                  isWinningCell(i)
                    ? "bg-green-400 animate-pop"
                    : cell.marked
                    ? "bg-black text-white"
                    : "bg-white"
                }
              `}
            >
              {cell.number}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
