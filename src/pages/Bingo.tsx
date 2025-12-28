import { useEffect, useState } from "react"
import { ref, onValue, update } from "firebase/database"
import { rtdb } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import { useParams } from "react-router"
import { Button } from "@/components/ui/button"

type Cell = {
    number: number
    marked: boolean
}

type Line = {
    indexes: number[]
    completed: boolean
}


const createFreshLines = (): Line[] => [
  { indexes: [0,1,2,3,4], completed: false },
  { indexes: [5,6,7,8,9], completed: false },
  { indexes: [10,11,12,13,14], completed: false },
  { indexes: [15,16,17,18,19], completed: false },
  { indexes: [20,21,22,23,24], completed: false },

  { indexes: [0,5,10,15,20], completed: false },
  { indexes: [1,6,11,16,21], completed: false },
  { indexes: [2,7,12,17,22], completed: false },
  { indexes: [3,8,13,18,23], completed: false },
  { indexes: [4,9,14,19,24], completed: false },

  { indexes: [0,6,12,18,24], completed: false },
  { indexes: [4,8,12,16,20], completed: false },
]


const BINGO_LETTERS = ["B", "I", "N", "G", "O"]

export default function Bingo() {
    const { roomId } = useParams()
    const { user } = useAuth()

    const [board, setBoard] = useState<Cell[]>([])
    const [lines, setLines] = useState<Line[]>([])
    const [bingoCount, setBingoCount] = useState(0)
    const [room, setRoom] = useState<any>(null)

    /* ---------------- RTDB ROOM SYNC ---------------- */

    useEffect(() => {
        if (!roomId) return
        const roomRef = ref(rtdb, `rooms/${roomId}`)
        return onValue(roomRef, (snap) => {
            setRoom(snap.val())
        })
    }, [roomId])

    /* ---------------- INIT BOARD ---------------- */

    useEffect(() => {
        if (!room || !user) return

        const existing = room.players?.[user.uid]
        if (existing?.board) {
            setBoard(existing.board)
            setBingoCount(existing.bingoCount || 0)
            setLines(createFreshLines())
            return
        }

        const numbers = Array.from({ length: 25 }, (_, i) => i + 1)
            .sort(() => Math.random() - 0.5)

        const newBoard = numbers.map((n) => ({
            number: n,
            marked: false,
        }))


        setBoard(newBoard)
        setLines(createFreshLines())

        update(ref(rtdb, `rooms/${roomId}/players/${user.uid}`), {
            board: newBoard,
            bingoCount: 0,
        })
    }, [room, user])

    /* ---------------- AUTO MARK ON CALL ---------------- */

    useEffect(() => {
        if (!room?.lastCalledNumber || !user) return

        const player = room.players?.[user.uid]
        if (!player) return

        const updatedBoard = [...player.board]
        const index = updatedBoard.findIndex(
            (c: Cell) => c.number === room.lastCalledNumber
        )

        if (index === -1 || updatedBoard[index].marked) return

        updatedBoard[index].marked = true

        let newBingos = 0
        const updatedLines = lines.map((line) => {
            if (!line.completed && line.indexes.every(i => updatedBoard[i].marked)) {
                newBingos++
                return { ...line, completed: true }
            }
            return line
        })

        setBoard(updatedBoard)
        setLines(updatedLines)
        setBingoCount(prev => prev + newBingos)

        update(ref(rtdb, `rooms/${roomId}/players/${user.uid}`), {
            board: updatedBoard,
            bingoCount: bingoCount + newBingos,
        })

        if (bingoCount + newBingos >= 5 && room.status === "playing") {
            update(ref(rtdb, `rooms/${roomId}`), {
                status: "roundEnd",
                winnerId: user.uid,
            })
        }
    }, [room?.lastCalledNumber])

    useEffect(() => {
        if (!room || room.status !== "roundEnd") return
        if (!user) return;
        if (room.winnerId !== user?.uid) return

        const playerRef = ref(rtdb, `rooms/${roomId}/players/${user.uid}`)

        update(playerRef, {
            score: (room.players[user.uid].score || 0) + 1,
        })
    }, [room?.status])


    /* ---------------- TURN LOGIC ---------------- */

    const turnOrder: string[] = room?.turnOrder ?? []
    const currentTurnIndex = room?.currentTurnIndex ?? 0
    const isMyTurn = turnOrder[currentTurnIndex] === user?.uid
    const drawnNumbers: number[] = room?.drawnNumbers ?? []

    /* ---------------- CELL CLICK = CALL NUMBER ---------------- */

    const callNumberFromCell = async (cell: Cell) => {
        if (!isMyTurn) return
        if (drawnNumbers.includes(cell.number)) return

        await update(ref(rtdb, `rooms/${roomId}`), {
            lastCalledNumber: cell.number,
            drawnNumbers: [...drawnNumbers, cell.number],
            currentTurnIndex: (currentTurnIndex + 1) % turnOrder.length,
        })
    }

    const isWinningCell = (index: number) =>
        lines.some(line => line.completed && line.indexes.includes(index))


    const startNextRound = async () => {
        const updates: any = {
            status: "playing",
            winnerId: null,
            drawnNumbers: [],
            lastCalledNumber: null,
            round: (room.round || 1) + 1,
        }

        Object.keys(room.players).forEach((uid) => {
            const numbers = Array.from({ length: 25 }, (_, i) => i + 1)
                .sort(() => Math.random() - 0.5)

            updates[`players/${uid}/board`] = numbers.map((n) => ({
                number: n,
                marked: false,
            }))

            updates[`players/${uid}/bingoCount`] = 0
        })

        await update(ref(rtdb, `rooms/${roomId}`), updates)
    }



    /* ---------------- UI (YOUR UI, MINIMALLY TOUCHED) ---------------- */

    return (
        <div className="min-h-screen bg-yellow-300 p-6">
            <div className="max-w-xl mx-auto text-center">

                {room && 
                    
                <div className="font-black mb-2">
                    Round {room.round || 1}
                </div>
                }


                <div className="flex justify-center gap-2 mb-4">
                    {BINGO_LETTERS.map((letter, i) => (
                        <div
                            key={letter}
                            className={`w-12 h-12 flex items-center justify-center text-2xl font-black border-4 border-black
                ${bingoCount > i ? "bg-green-400" : "bg-white"}
              `}
                        >
                            {letter}
                        </div>
                    ))}
                </div>

                {bingoCount >= 5 && (
                    <div className="neo bg-green-400 p-4 mb-4 font-black">
                        🎉 YOU COMPLETED BINGO! 🎉
                    </div>
                )}

                {room && room.status === "roundEnd" && room.hostId === user?.uid && (
                    <Button
                        onClick={startNextRound}
                        className="neo bg-blue-400 font-black"
                    >
                        Start Next Round
                    </Button>
                )}


                {room &&
                <div className="neo bg-white p-3 mb-4">
                    <h2 className="font-black mb-2">Scoreboard</h2>

                    {Object.entries(room.players).map(([id, p]: any) => (
                        <div
                            key={id}
                            className={`flex justify-between font-bold ${id === room.winnerId ? "text-green-600" : ""
                                }`}
                        >
                            <span>{p.name}</span>
                            <span>{p.score || 0}</span>
                        </div>
                    ))}
                </div>
                }

                <div className="grid grid-cols-5 gap-2 mb-6">
                    {board.map((cell, i) => (
                        <button
                            key={i}
                            onClick={() => callNumberFromCell(cell)}
                            disabled={!isMyTurn || cell.marked}
                            className={`aspect-square flex items-center justify-center text-xl font-black border-4 border-black
                ${isWinningCell(i)
                                    ? "bg-green-300"
                                    : cell.marked
                                        ? "bg-black text-white"
                                        : isMyTurn
                                            ? "bg-white hover:bg-orange-300"
                                            : "bg-gray-300 cursor-not-allowed"
                                }
              `}
                        >
                            {cell.number}
                        </button>
                    ))}
                </div>

                <div className="font-black">
                    {isMyTurn ? "🎯 Your Turn" : "⏳ Waiting for other player"}
                </div>
            </div>
        </div>
    )
}
