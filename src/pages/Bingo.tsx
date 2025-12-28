import { useEffect, useState } from "react"
import { ref, onValue, update } from "firebase/database"
import { rtdb } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import { useParams, useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Cell = {
    number: number
    marked: boolean
}

type Line = {
    indexes: number[]
    completed: boolean
}

const createFreshLines = (): Line[] => [
  // Rows
  { indexes: [0,1,2,3,4], completed: false },
  { indexes: [5,6,7,8,9], completed: false },
  { indexes: [10,11,12,13,14], completed: false },
  { indexes: [15,16,17,18,19], completed: false },
  { indexes: [20,21,22,23,24], completed: false },
  // Columns
  { indexes: [0,5,10,15,20], completed: false },
  { indexes: [1,6,11,16,21], completed: false },
  { indexes: [2,7,12,17,22], completed: false },
  { indexes: [3,8,13,18,23], completed: false },
  { indexes: [4,9,14,19,24], completed: false },
  // Diagonals
  { indexes: [0,6,12,18,24], completed: false },
  { indexes: [4,8,12,16,20], completed: false },
]

const BINGO_LETTERS = ["B", "I", "N", "G", "O"]

export default function Bingo() {
    const { roomId } = useParams()
    const { user } = useAuth()
    const navigate = useNavigate()

    const [board, setBoard] = useState<Cell[]>([])
    const [lines, setLines] = useState<Line[]>(createFreshLines())
    const [bingoCount, setBingoCount] = useState(0)
    const [room, setRoom] = useState<any>(null)
    const [lastProcessedNumber, setLastProcessedNumber] = useState<number | null>(null)

    /* ---------------- RTDB ROOM SYNC ---------------- */
    useEffect(() => {
        if (!roomId) return
        const roomRef = ref(rtdb, `rooms/${roomId}`)
        return onValue(roomRef, (snap) => {
            const data = snap.val()
            if (!data) {
                navigate("/lobby")
                return
            }
            setRoom(data)
        })
    }, [roomId, navigate])

    /* ---------------- INIT BOARD ---------------- */
    useEffect(() => {
        if (!room || !user) return

        const playerData = room.players?.[user.uid]
        if (!playerData) return

        // Initialize or restore board
        if (playerData.board && Array.isArray(playerData.board) && playerData.board.length === 25) {
            setBoard(playerData.board)
            setBingoCount(playerData.bingoCount || 0)
            
            // Recalculate lines based on current board state
            const freshLines = createFreshLines()
            const calculatedLines = freshLines.map(line => ({
                ...line,
                completed: line.indexes.every(i => playerData.board[i]?.marked)
            }))
            setLines(calculatedLines)
        } else {
            // Board doesn't exist or is invalid - this shouldn't happen if LobbyRoom works correctly
            console.error("Board not found or invalid for player", user.uid)
        }
    }, [room?.round, user])

    /* ---------------- AUTO MARK ON CALL ---------------- */
    useEffect(() => {
        if (!room?.lastCalledNumber || !user) return
        if (lastProcessedNumber === room.lastCalledNumber) return
        if (room.status !== "playing") return

        const playerData = room.players?.[user.uid]
        if (!playerData?.board) return

        const updatedBoard = [...playerData.board]
        const cellIndex = updatedBoard.findIndex(
            (c: Cell) => c.number === room.lastCalledNumber
        )

        // If number not on board or already marked, just update processed number
        if (cellIndex === -1 || updatedBoard[cellIndex].marked) {
            setLastProcessedNumber(room.lastCalledNumber)
            return
        }

        // Mark the cell
        updatedBoard[cellIndex].marked = true

        // Calculate completed lines
        const updatedLines = lines.map((line) => {
            const isCompleted = line.indexes.every(i => updatedBoard[i].marked)
            return { ...line, completed: isCompleted }
        })

        const completedCount = updatedLines.filter(l => l.completed).length
        const newBingos = completedCount - bingoCount

        // Update local state
        setBoard(updatedBoard)
        setLines(updatedLines)
        setBingoCount(completedCount)
        setLastProcessedNumber(room.lastCalledNumber)

        // Update Firebase
        const updates: any = {
            [`players/${user.uid}/board`]: updatedBoard,
            [`players/${user.uid}/bingoCount`]: completedCount,
        }

        // Check for winner (5 completed lines = BINGO!)
        if (completedCount >= 5 && !room.winnerId) {
            updates.status = "roundEnd"
            updates.winnerId = user.uid
            updates.winnerName = playerData.name
        }

        update(ref(rtdb, `rooms/${roomId}`), updates)
    }, [room?.lastCalledNumber, user, roomId])

    /* ---------------- UPDATE WINNER SCORE ---------------- */
    useEffect(() => {
        if (!room || room.status !== "roundEnd") return
        if (!user || room.winnerId !== user.uid) return
        
        // Ensure score is only updated once per round
        const playerData = room.players?.[user.uid]
        const currentScore = playerData?.score || 0
        const expectedScore = (room.round || 1)
        
        // Only update if score hasn't been updated for this round yet
        if (currentScore < expectedScore) {
            update(ref(rtdb, `rooms/${roomId}/players/${user.uid}`), {
                score: expectedScore
            })
        }
    }, [room?.status, room?.winnerId, user?.uid, roomId])

    /* ---------------- TURN LOGIC ---------------- */
    const turnOrder: string[] = room?.turnOrder ?? []
    const currentTurnIndex = room?.currentTurnIndex ?? 0
    const isMyTurn = turnOrder[currentTurnIndex] === user?.uid
    const drawnNumbers: number[] = room?.drawnNumbers ?? []
    const currentPlayerName = room?.players?.[turnOrder[currentTurnIndex]]?.name || "Unknown"

    /* ---------------- CALL NUMBER (CALLER'S ACTION) ---------------- */
    const callNumber = async (cell: Cell) => {
        if (!isMyTurn || room?.status !== "playing") return
        if (drawnNumbers.includes(cell.number)) return

        await update(ref(rtdb, `rooms/${roomId}`), {
            lastCalledNumber: cell.number,
            drawnNumbers: [...drawnNumbers, cell.number],
            currentTurnIndex: (currentTurnIndex + 1) % turnOrder.length,
        })
    }

    /* ---------------- CHECK IF CELL IS IN WINNING LINE ---------------- */
    const isWinningCell = (index: number) =>
        lines.some(line => line.completed && line.indexes.includes(index))

    /* ---------------- START NEXT ROUND (HOST ONLY) ---------------- */
    const startNextRound = async () => {
        if (room.hostId !== user?.uid) return

        const playerIds = Object.keys(room.players)
        const updates: any = {
            status: "playing",
            winnerId: null,
            winnerName: null,
            drawnNumbers: [],
            lastCalledNumber: null,
            round: (room.round || 1) + 1,
            currentTurnIndex: 0,
        }

        // Generate new boards for all players
        playerIds.forEach((uid) => {
            const numbers = Array.from({ length: 25 }, (_, i) => i + 1)
                .sort(() => Math.random() - 0.5)

            updates[`players/${uid}/board`] = numbers.map((n) => ({
                number: n,
                marked: false,
            }))
            updates[`players/${uid}/bingoCount`] = 0
        })

        await update(ref(rtdb, `rooms/${roomId}`), updates)

        // Reset local state
        setLastProcessedNumber(null)
        setBingoCount(0)
        setLines(createFreshLines())
    }

    /* ---------------- LEAVE GAME ---------------- */
    const leaveGame = () => {
        navigate("/lobby")
    }

    if (!room) {
        return (
            <div className="min-h-screen bg-yellow-300 flex items-center justify-center">
                <div className="neo bg-white p-8 font-black">Loading...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-yellow-300 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="neo bg-white px-4 py-2 font-black text-lg">
                        Round {room.round || 1}
                    </div>
                    <Button
                        onClick={leaveGame}
                        className="bg-red-400 text-black font-black"
                    >
                        Leave Game
                    </Button>
                </div>

                <div className="grid md:grid-cols-[1fr_300px] gap-6">
                    
                    {/* Left: Game Board */}
                    <div>
                        {/* BINGO Letters */}
                        <div className="flex justify-center gap-2 mb-4">
                            {BINGO_LETTERS.map((letter, i) => (
                                <div
                                    key={letter}
                                    className={`w-12 h-12 md:w-16 md:h-16 flex items-center justify-center text-2xl md:text-3xl font-black border-4 border-black transition-all
                                        ${bingoCount > i ? "bg-green-400 scale-110" : "bg-white"}
                                    `}
                                >
                                    {letter}
                                </div>
                            ))}
                        </div>

                        {/* Win Message */}
                        {room.status === "roundEnd" && (
                            <div className="neo bg-green-400 p-4 mb-4 text-center">
                                <div className="text-3xl mb-2">🎉</div>
                                <div className="font-black text-xl">
                                    {room.winnerId === user?.uid 
                                        ? "YOU WON!" 
                                        : `${room.winnerName} WON!`}
                                </div>
                            </div>
                        )}

                        {/* Bingo Board */}
                        <div className="neo bg-white p-4">
                            <div className="grid grid-cols-5 gap-1 md:gap-2">
                                {board.map((cell, i) => {
                                    const isWinner = isWinningCell(i)
                                    const isCalled = drawnNumbers.includes(cell.number)
                                    
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => callNumber(cell)}
                                            disabled={!isMyTurn || cell.marked || room.status !== "playing"}
                                            className={`aspect-square flex items-center justify-center text-lg md:text-xl font-black border-4 border-black transition-all
                                                ${isWinner
                                                    ? "bg-green-300 ring-4 ring-green-500"
                                                    : cell.marked
                                                        ? "bg-black text-white"
                                                        : isCalled
                                                            ? "bg-yellow-200"
                                                            : isMyTurn && room.status === "playing"
                                                                ? "bg-white hover:bg-orange-300 cursor-pointer"
                                                                : "bg-gray-200 cursor-not-allowed"
                                                }
                                            `}
                                        >
                                            {cell.number}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Turn Indicator */}
                        <div className="mt-4 neo bg-white p-4 text-center font-black">
                            {room.status === "playing" ? (
                                isMyTurn ? (
                                    <div className="text-green-600">
                                        🎯 YOUR TURN - Click a number to call it!
                                    </div>
                                ) : (
                                    <div>
                                        ⏳ {currentPlayerName}'s turn...
                                    </div>
                                )
                            ) : (
                                <div className="text-blue-600">
                                    Waiting for next round...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Scoreboard & Info */}
                    <div className="space-y-4">
                        
                        {/* Scoreboard */}
                        <div className="neo bg-white p-4">
                            <h2 className="font-black text-xl mb-3 border-b-4 border-black pb-2">
                                Scoreboard
                            </h2>
                            <div className="space-y-2">
                                {Object.entries(room.players || {})
                                    .sort(([, a]: any, [, b]: any) => (b.score || 0) - (a.score || 0))
                                    .map(([id, p]: any) => (
                                        <div
                                            key={id}
                                            className={`flex justify-between items-center p-2 border-2 border-black font-bold
                                                ${id === room.winnerId ? "bg-green-300" : "bg-gray-50"}
                                                ${id === user?.uid ? "ring-2 ring-blue-400" : ""}
                                            `}
                                        >
                                            <span className="flex items-center gap-2">
                                                {p.name}
                                                {id === user?.uid && <Badge className="text-xs">You</Badge>}
                                            </span>
                                            <span className="text-lg">{p.score || 0}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Called Numbers */}
                        <div className="neo bg-white p-4">
                            <h3 className="font-black text-lg mb-2 border-b-4 border-black pb-2">
                                Called Numbers ({drawnNumbers.length})
                            </h3>
                            {room.lastCalledNumber && (
                                <div className="bg-yellow-300 border-4 border-black p-3 mb-3 text-center">
                                    <div className="text-sm font-bold">Last Called:</div>
                                    <div className="text-4xl font-black">{room.lastCalledNumber}</div>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto">
                                {drawnNumbers.map((num) => (
                                    <div
                                        key={num}
                                        className="w-10 h-10 flex items-center justify-center bg-gray-200 border-2 border-black font-bold text-sm"
                                    >
                                        {num}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Next Round Button (Host Only) */}
                        {room.status === "roundEnd" && room.hostId === user?.uid && (
                            <Button
                                onClick={startNextRound}
                                className="neo w-full bg-blue-400 text-black font-black text-lg h-12"
                            >
                                Start Next Round
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}